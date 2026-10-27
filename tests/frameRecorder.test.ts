import { FrameRecorder } from '../src/metrics/frameRecorder';
import type { PeakResult } from '../src/metrics/peakWindow';

function recordFrames(recorder: FrameRecorder, frames: Array<{ start: number; end: number }>) {
  for (const { start, end } of frames) {
    recorder.beginFrame(start);
    recorder.endFrame(end);
  }
}

describe('FrameRecorder', () => {
  it('records the cpu time of a frame and the interval between frame starts', () => {
    const recorder = new FrameRecorder(10, 500);
    recordFrames(recorder, [
      { start: 0, end: 4 },
      { start: 17, end: 21 },
      { start: 50, end: 52 }
    ]);

    expect(recorder.buffer.length).toBe(3);
    expect([0, 1, 2].map((index) => recorder.buffer.cpuAt(index))).toEqual([4, 4, 2]);
    expect([0, 1, 2].map((index) => recorder.buffer.intervalAt(index))).toEqual([0, 17, 33]);
  });

  it('attributes a stall that shows only as a long interval to the object that just appeared', () => {
    const recorder = new FrameRecorder(10, 500);
    const peaks: PeakResult[] = [];
    recorder.peaks.subscribe((peak) => peaks.push(peak));
    recordFrames(recorder, [{ start: 0, end: 3 }]);

    recorder.markAppearance('shadow', 'Shadow', 10);
    recordFrames(recorder, [
      { start: 16, end: 19 },
      { start: 70, end: 73 }
    ]);
    recorder.finishWindow();

    expect(peaks).toHaveLength(1);
    expect(peaks[0]).toMatchObject({ subjectId: 'shadow', peakMs: 54, cpuPeakMs: 3, intervalPeakMs: 54 });
  });

  it('puts the marker on the next frame to be recorded', () => {
    const recorder = new FrameRecorder(10, 500);
    recordFrames(recorder, [{ start: 0, end: 1 }]);
    recorder.markAppearance('plain', 'No texture', 5);

    expect(recorder.markers).toEqual([{ sequence: 1, label: 'No texture' }]);
  });

  it('forgets markers once their frame has left the buffer', () => {
    const recorder = new FrameRecorder(3, 500);
    recorder.markAppearance('plain', 'No texture', 0);
    for (let frame = 0; frame < 5; frame++)
      recordFrames(recorder, [{ start: frame * 17, end: frame * 17 + 2 }]);

    expect(recorder.markers).toEqual([]);
  });

  it('starts from nothing after reset, and does not report the window that was open', () => {
    const recorder = new FrameRecorder(5, 500);
    const peaks: PeakResult[] = [];
    recorder.peaks.subscribe((peak) => peaks.push(peak));
    recorder.markAppearance('plain', '1', 0);
    recordFrames(recorder, [{ start: 1, end: 3 }]);

    recorder.reset();
    recorder.finishWindow();
    recordFrames(recorder, [{ start: 100, end: 102 }]);

    expect(peaks).toEqual([]);
    expect(recorder.markers).toEqual([]);
    expect(recorder.buffer.length).toBe(1);
    expect(recorder.buffer.intervalAt(0)).toBe(0);
  });

  it('ignores endFrame without a beginFrame', () => {
    const recorder = new FrameRecorder(3, 500);
    recorder.endFrame(10);

    expect(recorder.buffer.length).toBe(0);
  });
});
