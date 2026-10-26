import { PeakWindowTracker, type FrameSample, type PeakResult } from '../src/metrics/peakWindow';

const frame = (endMs: number, cpuMs: number, intervalMs: number): FrameSample => ({
  endMs,
  cpuMs,
  intervalMs
});

function createTracker(windowMs = 500) {
  const results: PeakResult[] = [];
  return { tracker: new PeakWindowTracker(windowMs, (result) => results.push(result)), results };
}

describe('PeakWindowTracker', () => {
  it('reports the larger of the cpu and interval peaks for the subject', () => {
    const { tracker, results } = createTracker();
    tracker.open('texture-2048', 1000);
    tracker.addSample(frame(1016, 4, 16.7));
    tracker.addSample(frame(1060, 40, 44));
    tracker.addSample(frame(1090, 3, 60));
    tracker.close();

    expect(results).toEqual([
      { subjectId: 'texture-2048', peakMs: 60, cpuPeakMs: 40, intervalPeakMs: 60, sampleCount: 3 }
    ]);
  });

  it('closes by itself on the first frame that ends after the window', () => {
    const { tracker, results } = createTracker(500);
    tracker.open('a', 0);
    tracker.addSample(frame(100, 5, 16));
    tracker.addSample(frame(600, 90, 90));

    expect(results).toHaveLength(1);
    expect(results[0]?.peakMs).toBe(16);
    expect(tracker.activeSubjectId).toBeNull();
  });

  it('closes the previous window when a new one opens, so windows never overlap', () => {
    const { tracker, results } = createTracker();
    tracker.open('a', 0);
    tracker.addSample(frame(100, 30, 30));
    tracker.open('b', 200);
    tracker.addSample(frame(300, 8, 17));

    tracker.close();
    expect(results.map((result) => [result.subjectId, result.peakMs])).toEqual([
      ['a', 30],
      ['b', 17]
    ]);
  });

  it('does not report a window in which no frame was rendered', () => {
    const { tracker, results } = createTracker();
    tracker.open('a', 0);
    tracker.close();

    expect(results).toEqual([]);
  });

  it('ignores samples while no window is open', () => {
    const { tracker, results } = createTracker();
    tracker.addSample(frame(10, 99, 99));
    tracker.close();

    expect(results).toEqual([]);
  });
});
