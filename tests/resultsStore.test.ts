import { ResultsStore } from '../src/app/resultsStore';
import { createMemoryStorage } from './memoryStorage';

describe('ResultsStore', () => {
  it('keeps the numbers of both modes across a reload', () => {
    const storage = createMemoryStorage();
    const first = new ResultsStore(storage, 'k');
    first.setLoadMs('off', 300);
    first.setPeak('off', 'plain', 12.5);
    first.setPeak('on', 'plain', 3.1);

    const reloaded = new ResultsStore(storage, 'k');

    expect(reloaded.get('off')).toEqual({ loadMs: 300, peaks: { plain: 12.5 } });
    expect(reloaded.get('on').peaks).toEqual({ plain: 3.1 });
  });

  it('drops numbers taken under other settings', () => {
    const storage = createMemoryStorage();
    new ResultsStore(storage, 'parallel=1').setPeak('off', 'plain', 12.5);

    expect(new ResultsStore(storage, 'parallel=0').get('off')).toEqual({ loadMs: null, peaks: {} });
  });

  it('clears one mode and leaves the other alone', () => {
    const store = new ResultsStore(createMemoryStorage(), 'k');
    store.setPeak('off', 'plain', 1);
    store.setPeak('on', 'plain', 2);

    store.clearMode('off');

    expect(store.get('off').peaks).toEqual({});
    expect(store.get('on').peaks).toEqual({ plain: 2 });
  });

  it('survives corrupted storage', () => {
    const storage = createMemoryStorage({ 'warmup.results': '{not json' });

    expect(new ResultsStore(storage, 'k').get('off')).toEqual({ loadMs: null, peaks: {} });
  });
});
