import type { FrameRecorder } from '../metrics/frameRecorder';
import { GUEST_CATALOG, type GuestId } from '../scene/guestCatalog';
import type { AppearController } from '../warmup/appearController';
import type { WarmupMode } from '../warmup/appearStrategy';
import type { AbRun } from './abReport';

/** Quiet time after loading, so the tail of the loading screen is not blamed on the first object. */
const SETTLE_MS = 1000;
/** After the last object: long enough for its peak window to close. */
const TAIL_MS = 900;
const STEP_TIMEOUT_MS = 90_000;

const sleep = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * Notices what makes a measurement worthless: a tab that went to the background (the browser throttles
 * rendering there) or a lost WebGL context. Both mark the current step invalid, and it is repeated.
 */
export class RunValidityGuard {
  private failure: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    if (document.visibilityState === 'hidden') this.failure = 'the tab is in the background';
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.failure = 'the tab went to the background';
    });
    canvas.addEventListener('webglcontextlost', () => (this.failure = 'the WebGL context was lost'));
  }

  get problem(): string | null {
    return this.failure;
  }
}

export interface StepOutcome {
  run: AbRun | null;
  problem: string | null;
}

/** One page load of the benchmark: appear all 12 objects on the 500 ms timer and collect their peaks. */
export async function runAbStep(
  mode: WarmupMode,
  loadMs: number,
  controller: AppearController,
  recorder: FrameRecorder,
  validity: RunValidityGuard
): Promise<StepOutcome> {
  await sleep(SETTLE_MS);

  const peaks: Partial<Record<GuestId, number>> = {};
  const stopListening = recorder.peaks.subscribe((peak) => (peaks[peak.subjectId as GuestId] = peak.peakMs));
  controller.startAuto();

  const deadline = performance.now() + STEP_TIMEOUT_MS;
  while (controller.state.appearedCount < GUEST_CATALOG.length) {
    if (performance.now() > deadline) return { run: null, problem: 'the step timed out' };
    await sleep(50);
  }
  await sleep(TAIL_MS);
  recorder.finishWindow();
  stopListening();

  if (validity.problem) return { run: null, problem: validity.problem };
  const missing = GUEST_CATALOG.filter((guest) => peaks[guest.id] === undefined);
  if (missing.length > 0) return { run: null, problem: `no frames recorded for ${missing.length} object(s)` };
  return { run: { mode, loadMs, peaks: peaks as Record<GuestId, number> }, problem: null };
}
