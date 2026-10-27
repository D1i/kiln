import { Emitter } from '../util/emitter';
import { GUEST_CATALOG, type GuestCatalogEntry } from '../scene/guestCatalog';
import { delayUntilStep } from './appearSchedule';
import type { AppearStrategy } from './appearStrategy';

export const AUTO_APPEAR_INTERVAL_MS = 500;

export interface AppearState {
  appearedCount: number;
  total: number;
  autoRunning: boolean;
  /** Next guest to appear, or null when all of them have. */
  next: GuestCatalogEntry | null;
}

export interface AppearHooks {
  /** Called right before a guest is revealed, so the metrics can open a peak window first. */
  beforeAppear(entry: GuestCatalogEntry): void;
  now(): number;
}

/** Drives the order and the timing of appearances; the how is the strategy's business. */
export class AppearController {
  readonly changes = new Emitter<AppearState>();
  private appearedCount = 0;
  private autoTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly strategy: AppearStrategy,
    private readonly hooks: AppearHooks
  ) {}

  get state(): AppearState {
    return {
      appearedCount: this.appearedCount,
      total: GUEST_CATALOG.length,
      autoRunning: this.autoTimer !== null,
      next: GUEST_CATALOG[this.appearedCount] ?? null
    };
  }

  appearNext(): void {
    const entry = GUEST_CATALOG[this.appearedCount];
    if (!entry) return;
    this.hooks.beforeAppear(entry);
    this.strategy.reveal(entry.id);
    this.appearedCount++;
    this.changes.emit(this.state);
  }

  startAuto(): void {
    if (this.autoTimer !== null || this.appearedCount >= GUEST_CATALOG.length) return;
    const startMs = this.hooks.now();
    const runStep = (step: number): void => {
      this.appearNext();
      if (this.appearedCount >= GUEST_CATALOG.length) {
        this.autoTimer = null;
        this.changes.emit(this.state);
        return;
      }
      this.autoTimer = setTimeout(
        () => runStep(step + 1),
        delayUntilStep(startMs, step + 1, AUTO_APPEAR_INTERVAL_MS, this.hooks.now())
      );
    };
    this.autoTimer = setTimeout(() => runStep(0), 0);
    this.changes.emit(this.state);
  }

  stopAuto(): void {
    if (this.autoTimer === null) return;
    clearTimeout(this.autoTimer);
    this.autoTimer = null;
    this.changes.emit(this.state);
  }
}
