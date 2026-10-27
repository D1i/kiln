import { formatAbReport, median, summarizeMode, type AbRun } from '../src/bench/abReport';
import { GUEST_CATALOG, type GuestId } from '../src/scene/guestCatalog';

function runWith(mode: 'off' | 'on', loadMs: number, peak: (id: GuestId, index: number) => number): AbRun {
  const peaks = {} as Record<GuestId, number>;
  GUEST_CATALOG.forEach((guest, index) => (peaks[guest.id] = peak(guest.id, index)));
  return { mode, loadMs, peaks };
}

describe('median', () => {
  it('takes the middle value, or the mean of the two middle ones', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([7])).toBe(7);
  });

  it('refuses an empty list instead of inventing a number', () => {
    expect(() => median([])).toThrow(RangeError);
  });
});

describe('summarizeMode', () => {
  it('takes the median per object so one outlier run does not move the result', () => {
    const runs = [
      runWith('off', 300, () => 10),
      runWith('off', 320, () => 12),
      runWith('off', 5000, () => 900)
    ];

    const summary = summarizeMode(runs);

    expect(summary.peaksByGuest.plain).toBe(12);
    expect(summary.sumOfPeaksMs).toBe(12 * 12);
    expect(summary.loadMs).toBe(320);
  });

  it('finds the object with the largest peak', () => {
    const summary = summarizeMode([runWith('on', 1000, (id) => (id === 'shadow' ? 40 : 2))]);

    expect(summary.maxPeakGuest).toBe('shadow');
    expect(summary.maxPeakMs).toBe(40);
    expect(summary.sumOfPeaksMs).toBe(40 + 11 * 2);
  });
});

describe('formatAbReport', () => {
  const environment = {
    gpu: 'ANGLE (Test GPU)',
    browser: 'Chrome 131',
    resolution: '1920×1080',
    parallelCompile: 'on',
    textureFormat: 'png',
    repeats: 3
  } as const;

  it('puts the totals, the ratios and one line per object into the text', () => {
    const off = summarizeMode([runWith('off', 300, (_, index) => 20 + index)]);
    const on = summarizeMode([runWith('on', 1800, () => 5)]);

    const text = formatAbReport(environment, off, on);

    expect(text).toContain('ANGLE (Test GPU)');
    expect(text).toContain('median of 3 runs per mode');
    expect(text).toContain('Warm-up off');
    expect(text).toContain('Warm-up on');
    expect(text).toContain('the loading screen takes 1500 ms longer');
    expect(text.split('\n').filter((line) => /^\s*\d+\. /.test(line))).toHaveLength(12);
  });

  it('does not divide by zero when the warm-up peaks are all zero', () => {
    const off = summarizeMode([runWith('off', 1, () => 10)]);
    const on = summarizeMode([runWith('on', 1, () => 0)]);

    expect(formatAbReport(environment, off, on)).toContain('n/a');
  });
});
