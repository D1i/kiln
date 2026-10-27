import { comparabilityKey, DEFAULT_SETTINGS, parseSettings, settingsToSearch } from '../src/app/settings';

describe('settings', () => {
  it('falls back to defaults for an empty or broken query', () => {
    expect(parseSettings('')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('?mode=sideways&texture=bmp')).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips through the query string', () => {
    const settings = { mode: 'on', parallelCompile: false, textureFormat: 'ktx2' } as const;

    expect(parseSettings(settingsToSearch(settings))).toEqual(settings);
  });

  it('treats only parallel=0 as "off"', () => {
    expect(parseSettings('?parallel=0').parallelCompile).toBe(false);
    expect(parseSettings('?parallel=1').parallelCompile).toBe(true);
    expect(parseSettings('?parallel=yes').parallelCompile).toBe(true);
  });

  it('makes runs with different parallel compile or texture format incomparable, but not different modes', () => {
    const base = { parallelCompile: true, textureFormat: 'png' } as const;

    expect(comparabilityKey(base)).toBe(comparabilityKey({ ...base }));
    expect(comparabilityKey(base)).not.toBe(comparabilityKey({ ...base, parallelCompile: false }));
    expect(comparabilityKey(base)).not.toBe(comparabilityKey({ ...base, textureFormat: 'ktx2' }));
  });
});
