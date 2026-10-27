import type { TextureFormat } from '../scene/textureFormat';
import type { WarmupMode } from '../warmup/appearStrategy';

export type { TextureFormat };

/** Everything the user can switch. Lives in the URL, so every switch is a reload into a cold page. */
export interface DemoSettings {
  mode: WarmupMode;
  parallelCompile: boolean;
  textureFormat: TextureFormat;
}

export const DEFAULT_SETTINGS: DemoSettings = { mode: 'off', parallelCompile: true, textureFormat: 'ktx2' };

export function parseSettings(search: string): DemoSettings {
  const params = new URLSearchParams(search);
  const mode = params.get('mode');
  const texture = params.get('texture');
  return {
    mode: mode === 'on' || mode === 'off' ? mode : DEFAULT_SETTINGS.mode,
    parallelCompile: params.get('parallel') !== '0',
    textureFormat: texture === 'ktx2' || texture === 'png' ? texture : DEFAULT_SETTINGS.textureFormat
  };
}

export function settingsToSearch(settings: DemoSettings): string {
  const params = new URLSearchParams({
    mode: settings.mode,
    parallel: settings.parallelCompile ? '1' : '0',
    texture: settings.textureFormat
  });
  return `?${params.toString()}`;
}

/**
 * Two runs are comparable only when everything but the mode is the same. Results taken under a different
 * key are dropped rather than shown next to numbers they cannot be compared with.
 */
export function comparabilityKey(settings: Pick<DemoSettings, 'parallelCompile' | 'textureFormat'>): string {
  return `parallel=${settings.parallelCompile ? 1 : 0};texture=${settings.textureFormat}`;
}
