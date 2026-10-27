import type { Engine } from '@babylonjs/core/Engines/engine';

/**
 * Number of distinct shader programs the engine has compiled so far. Babylon keeps them in a protected map, which is
 * the only place that knows; this is a diagnostic read, used to show how many programs an appearance had to compile.
 */
export function compiledEffectCount(engine: Engine): number {
  const registry = (engine as unknown as { _compiledEffects: Record<string, unknown> })._compiledEffects;
  return Object.keys(registry).length;
}
