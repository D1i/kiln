import { GUEST_CATALOG, guestOrdinal, type GuestId } from '../scene/guestCatalog';
import type { WarmupMode } from '../warmup/appearStrategy';

export interface AbRun {
  mode: WarmupMode;
  loadMs: number;
  peaks: Record<GuestId, number>;
}

export interface ModeSummary {
  loadMs: number;
  /** Sum over the 12 objects of the median (over repeats) peak. */
  sumOfPeaksMs: number;
  maxPeakMs: number;
  maxPeakGuest: GuestId;
  peaksByGuest: Record<GuestId, number>;
}

export interface AbEnvironment {
  gpu: string;
  browser: string;
  resolution: string;
  parallelCompile: 'on' | 'off' | 'unavailable';
  textureFormat: string;
  repeats: number;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError('median of nothing');
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** Collapses the repeats of one mode into one number per object (median), then totals them. */
export function summarizeMode(runs: readonly AbRun[]): ModeSummary {
  if (runs.length === 0) throw new RangeError('no runs to summarize');
  const peaksByGuest = {} as Record<GuestId, number>;
  for (const guest of GUEST_CATALOG) peaksByGuest[guest.id] = median(runs.map((run) => run.peaks[guest.id]));

  let maxPeakGuest: GuestId = GUEST_CATALOG[0].id;
  let sumOfPeaksMs = 0;
  for (const guest of GUEST_CATALOG) {
    sumOfPeaksMs += peaksByGuest[guest.id];
    if (peaksByGuest[guest.id] > peaksByGuest[maxPeakGuest]) maxPeakGuest = guest.id;
  }
  return {
    loadMs: median(runs.map((run) => run.loadMs)),
    sumOfPeaksMs,
    maxPeakMs: peaksByGuest[maxPeakGuest],
    maxPeakGuest,
    peaksByGuest
  };
}

const labelOf = (id: GuestId): string => GUEST_CATALOG.find((guest) => guest.id === id)?.label ?? id;
const ms = (value: number, width: number): string => value.toFixed(1).padStart(width);
const ratio = (numerator: number, denominator: number): string =>
  denominator > 0 ? `${(numerator / denominator).toFixed(1)}×` : 'n/a';

/** The text that goes to the clipboard: plain, monospaced, readable in a comment or a README. */
export function formatAbReport(environment: AbEnvironment, off: ModeSummary, on: ModeSummary): string {
  const repeats = environment.repeats === 1 ? 'single run' : `median of ${environment.repeats} runs per mode`;
  const lines = [
    environment.gpu,
    `${environment.browser} · ${environment.resolution} · parallel compile: ${environment.parallelCompile} · textures: ${environment.textureFormat} · ${repeats}`,
    `Warm-up off  load ${off.loadMs.toFixed(0).padStart(5)} ms · sum of peaks ${ms(off.sumOfPeaksMs, 7)} ms · max peak ${ms(off.maxPeakMs, 6)} ms (${labelOf(off.maxPeakGuest)})`,
    `Warm-up on   load ${on.loadMs.toFixed(0).padStart(5)} ms · sum of peaks ${ms(on.sumOfPeaksMs, 7)} ms · max peak ${ms(on.maxPeakMs, 6)} ms (${labelOf(on.maxPeakGuest)})`,
    `→ off/on: sum of peaks ${ratio(off.sumOfPeaksMs, on.sumOfPeaksMs)}, max peak ${ratio(off.maxPeakMs, on.maxPeakMs)}; the loading screen takes ${(on.loadMs - off.loadMs).toFixed(0)} ms longer`,
    '',
    'peak per object, ms (off → on):'
  ];
  const nameWidth = Math.max(...GUEST_CATALOG.map((guest) => guest.label.length));
  for (const guest of GUEST_CATALOG) {
    const name = `${String(guestOrdinal(guest.id)).padStart(2)}. ${guest.label}`.padEnd(nameWidth + 4);
    lines.push(`${name} ${ms(off.peaksByGuest[guest.id], 7)} → ${ms(on.peaksByGuest[guest.id], 7)}`);
  }
  return lines.join('\n');
}
