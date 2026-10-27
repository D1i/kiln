import {
  AbSessionStore,
  MAX_ATTEMPTS_PER_STEP,
  createAbState,
  currentMode,
  isFinished,
  recordFailure,
  recordRun,
  runsOf
} from '../src/bench/abSession';
import type { AbRun } from '../src/bench/abReport';
import type { GuestId } from '../src/scene/guestCatalog';
import { createMemoryStorage } from './memoryStorage';

const settings = { parallelCompile: true, textureFormat: 'png' } as const;
const aRun = (mode: 'off' | 'on'): AbRun => ({ mode, loadMs: 1, peaks: {} as Record<GuestId, number> });

describe('A/B plan', () => {
  it('alternates off and on, once per repeat', () => {
    const state = createAbState(3, settings, 0);

    expect(state.plan).toEqual(['off', 'on', 'off', 'on', 'off', 'on']);
    expect(currentMode(state)).toBe('off');
  });

  it('moves to the next step when a run is recorded and finishes after the last one', () => {
    let state = createAbState(1, settings, 0);
    state = recordRun(state, aRun('off'));
    expect(currentMode(state)).toBe('on');
    expect(isFinished(state)).toBe(false);

    state = recordRun(state, aRun('on'));
    expect(isFinished(state)).toBe(true);
    expect(runsOf(state, 'on')).toHaveLength(1);
    expect(runsOf(state, 'off')).toHaveLength(1);
  });

  it('repeats a failed step a limited number of times, then gives up', () => {
    let state: ReturnType<typeof createAbState> | null = createAbState(1, settings, 0);
    for (let attempt = 1; attempt < MAX_ATTEMPTS_PER_STEP; attempt++) {
      state = state && recordFailure(state);
      expect(state?.step).toBe(0);
    }

    expect(state && recordFailure(state)).toBeNull();
  });

  it('forgets failures once the step succeeds', () => {
    const failed = recordFailure(createAbState(1, settings, 0));

    expect(failed && recordRun(failed, aRun('off')).failedAttempts).toBe(0);
  });
});

describe('AbSessionStore', () => {
  it('returns a saved run and nothing after it is cleared', () => {
    const store = new AbSessionStore(createMemoryStorage());
    const state = createAbState(1, settings, 1000);
    store.saveActive(state);

    expect(store.loadActive(2000)).toEqual(state);
    store.clearActive();
    expect(store.loadActive(2000)).toBeNull();
  });

  it('drops a run that was abandoned long ago', () => {
    const store = new AbSessionStore(createMemoryStorage());
    store.saveActive(createAbState(1, settings, 0));

    expect(store.loadActive(31 * 60 * 1000)).toBeNull();
    expect(store.loadActive(0)).toBeNull();
  });

  it('keeps the finished report', () => {
    const store = new AbSessionStore(createMemoryStorage());
    store.saveReport('line 1\nline 2');

    expect(store.loadReport()).toBe('line 1\nline 2');
  });
});
