export interface FrameSample {
  /** `performance.now()` at the end of the frame. */
  endMs: number;
  /** beginFrame to endFrame: what the main thread spent on the frame. */
  cpuMs: number;
  /** Distance between this frame's beginFrame and the previous one: what the user sees as the frame time. */
  intervalMs: number;
}

export interface PeakResult {
  subjectId: string;
  /** max(cpu, interval) over the window: the number that goes into the table. */
  peakMs: number;
  cpuPeakMs: number;
  intervalPeakMs: number;
  sampleCount: number;
}

interface OpenWindow {
  subjectId: string;
  openedAtMs: number;
  cpuPeakMs: number;
  intervalPeakMs: number;
  sampleCount: number;
}

/**
 * Attributes frame spikes to the object that appeared just before them.
 * Windows never overlap: opening a new one closes the previous one at that moment, so a spike is blamed on exactly
 * one object. A window also closes by itself on the first frame that ends after `windowMs`.
 */
export class PeakWindowTracker {
  private active: OpenWindow | null = null;

  constructor(
    private readonly windowMs: number,
    private readonly onClosed: (result: PeakResult) => void
  ) {}

  get activeSubjectId(): string | null {
    return this.active?.subjectId ?? null;
  }

  open(subjectId: string, nowMs: number): void {
    this.close();
    this.active = { subjectId, openedAtMs: nowMs, cpuPeakMs: 0, intervalPeakMs: 0, sampleCount: 0 };
  }

  addSample(sample: FrameSample): void {
    const window = this.active;
    if (!window) return;
    if (sample.endMs - window.openedAtMs > this.windowMs) {
      this.close();
      return;
    }
    window.cpuPeakMs = Math.max(window.cpuPeakMs, sample.cpuMs);
    window.intervalPeakMs = Math.max(window.intervalPeakMs, sample.intervalMs);
    window.sampleCount++;
  }

  /** Closes the active window, if any; an empty window (no frame rendered) is dropped, not reported as zero. */
  close(): void {
    const window = this.active;
    this.active = null;
    if (!window || window.sampleCount === 0) return;
    this.onClosed({
      subjectId: window.subjectId,
      peakMs: Math.max(window.cpuPeakMs, window.intervalPeakMs),
      cpuPeakMs: window.cpuPeakMs,
      intervalPeakMs: window.intervalPeakMs,
      sampleCount: window.sampleCount
    });
  }
}
