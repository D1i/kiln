import { Emitter } from '../util/emitter';
import { FrameRingBuffer } from './ringBuffer';
import { PeakWindowTracker, type PeakResult } from './peakWindow';

export interface AppearanceMarker {
  /** Absolute frame number (see FrameRingBuffer.sequence) at which the object appeared. */
  sequence: number;
  label: string;
}

/**
 * Turns beginFrame/endFrame notifications into samples. Knows nothing about Babylon: the caller passes timestamps,
 * which keeps the arithmetic testable and the engine wiring in one place (main.ts).
 *
 * Two clocks are recorded for every frame because they see different costs:
 *  - cpuMs: beginFrame to endFrame, the main-thread work of the frame (texture uploads, shader compiles);
 *  - intervalMs: beginFrame to the previous beginFrame, which also shows stalls that land after endFrame.
 */
export class FrameRecorder {
  readonly buffer: FrameRingBuffer;
  readonly peaks = new Emitter<PeakResult>();
  private readonly tracker: PeakWindowTracker;
  private markersInBuffer: AppearanceMarker[] = [];
  private frameStartMs: number | null = null;
  private previousFrameStartMs: number | null = null;

  constructor(capacity: number, peakWindowMs: number) {
    this.buffer = new FrameRingBuffer(capacity);
    this.tracker = new PeakWindowTracker(peakWindowMs, (result) => this.peaks.emit(result));
  }

  get markers(): readonly AppearanceMarker[] {
    return this.markersInBuffer;
  }

  beginFrame(nowMs: number): void {
    this.previousFrameStartMs = this.frameStartMs;
    this.frameStartMs = nowMs;
  }

  endFrame(nowMs: number): void {
    if (this.frameStartMs === null) return;
    const cpuMs = nowMs - this.frameStartMs;
    const intervalMs = this.previousFrameStartMs === null ? 0 : this.frameStartMs - this.previousFrameStartMs;
    this.buffer.push(cpuMs, intervalMs);
    this.tracker.addSample({ endMs: nowMs, cpuMs, intervalMs });
    this.dropMarkersThatLeftTheBuffer();
  }

  /** Must run before the object is shown: the spike belongs to the next frame, not to this moment. */
  markAppearance(subjectId: string, label: string, nowMs: number): void {
    this.tracker.open(subjectId, nowMs);
    this.markersInBuffer.push({ sequence: this.buffer.sequence, label });
  }

  /** Closes the open peak window, e.g. at the end of a benchmark run. */
  finishWindow(): void {
    this.tracker.close();
  }

  private dropMarkersThatLeftTheBuffer(): void {
    const first = this.buffer.firstSequence;
    if (this.markersInBuffer.length > 0 && (this.markersInBuffer[0]?.sequence ?? first) < first) {
      this.markersInBuffer = this.markersInBuffer.filter((marker) => marker.sequence >= first);
    }
  }
}
