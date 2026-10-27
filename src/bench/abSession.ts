import { readJson, writeJson, type StorageLike } from '../app/storage';
import type { TextureFormat } from '../app/settings';
import type { WarmupMode } from '../warmup/appearStrategy';
import type { AbRun } from './abReport';

/** A run that was left behind (tab closed mid-run) is dropped instead of hijacking the page later. */
const STALE_AFTER_MS = 30 * 60 * 1000;
export const MAX_ATTEMPTS_PER_STEP = 3;
export const REPEAT_CHOICES = [1, 3, 5] as const;
export const DEFAULT_REPEATS = 3;

export interface AbState {
  repeats: number;
  /** One entry per page load, alternating: off, on, off, on... so slow drift of the machine hits both modes. */
  plan: WarmupMode[];
  step: number;
  /** Failed tries of the current step (hidden tab, lost context): the step is repeated, up to a limit. */
  failedAttempts: number;
  runs: AbRun[];
  parallelCompile: boolean;
  textureFormat: TextureFormat;
  startedAtMs: number;
}

export function createAbState(
  repeats: number,
  settings: { parallelCompile: boolean; textureFormat: TextureFormat },
  nowMs: number
): AbState {
  const plan: WarmupMode[] = [];
  for (let repeat = 0; repeat < repeats; repeat++) plan.push('off', 'on');
  return { repeats, plan, step: 0, failedAttempts: 0, runs: [], startedAtMs: nowMs, ...settings };
}

export function currentMode(state: AbState): WarmupMode {
  return state.plan[state.step] ?? 'off';
}

export function isFinished(state: AbState): boolean {
  return state.step >= state.plan.length;
}

export function recordRun(state: AbState, run: AbRun): AbState {
  return { ...state, runs: [...state.runs, run], step: state.step + 1, failedAttempts: 0 };
}

/** Returns the state to retry the step with, or null when the step has failed too many times. */
export function recordFailure(state: AbState): AbState | null {
  const failedAttempts = state.failedAttempts + 1;
  return failedAttempts >= MAX_ATTEMPTS_PER_STEP ? null : { ...state, failedAttempts };
}

export function runsOf(state: AbState, mode: WarmupMode): AbRun[] {
  return state.runs.filter((run) => run.mode === mode);
}

const STATE_KEY = 'warmup.ab.state';
const REPORT_KEY = 'warmup.ab.report';

export class AbSessionStore {
  constructor(private readonly storage: StorageLike) {}

  loadActive(nowMs: number): AbState | null {
    const state = readJson<AbState>(this.storage, STATE_KEY);
    if (!state) return null;
    if (nowMs - state.startedAtMs > STALE_AFTER_MS) {
      this.clearActive();
      return null;
    }
    return state;
  }

  saveActive(state: AbState): void {
    writeJson(this.storage, STATE_KEY, state);
  }

  clearActive(): void {
    this.storage.removeItem(STATE_KEY);
  }

  loadReport(): string | null {
    return readJson<string>(this.storage, REPORT_KEY);
  }

  saveReport(report: string): void {
    writeJson(this.storage, REPORT_KEY, report);
  }

  clearReport(): void {
    this.storage.removeItem(REPORT_KEY);
  }
}
