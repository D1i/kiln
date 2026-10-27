import type { GuestId } from '../scene/guestCatalog';
import type { WarmupMode } from '../warmup/appearStrategy';
import { readJson, writeJson, type StorageLike } from './storage';

export interface ModeResults {
  loadMs: number | null;
  peaks: Partial<Record<GuestId, number>>;
}

interface StoredResults {
  comparabilityKey: string;
  off: ModeResults;
  on: ModeResults;
}

const STORAGE_KEY = 'warmup.results';

const emptyMode = (): ModeResults => ({ loadMs: null, peaks: {} });

/**
 * Keeps the last numbers of both modes across the reloads that every switch causes, so the table can show
 * "off" and "on" side by side. Numbers taken under different settings are dropped, see `comparabilityKey`.
 */
export class ResultsStore {
  private data: StoredResults;

  constructor(
    private readonly storage: StorageLike,
    comparabilityKey: string
  ) {
    const stored = readJson<StoredResults>(storage, STORAGE_KEY);
    this.data =
      stored && stored.comparabilityKey === comparabilityKey
        ? stored
        : { comparabilityKey, off: emptyMode(), on: emptyMode() };
  }

  get(mode: WarmupMode): ModeResults {
    return this.data[mode];
  }

  setLoadMs(mode: WarmupMode, loadMs: number): void {
    this.data[mode].loadMs = loadMs;
    this.save();
  }

  setPeak(mode: WarmupMode, guestId: GuestId, peakMs: number): void {
    this.data[mode].peaks[guestId] = peakMs;
    this.save();
  }

  replaceMode(mode: WarmupMode, results: ModeResults): void {
    this.data[mode] = results;
    this.save();
  }

  clearMode(mode: WarmupMode): void {
    this.data[mode] = emptyMode();
    this.save();
  }

  private save(): void {
    writeJson(this.storage, STORAGE_KEY, this.data);
  }
}
