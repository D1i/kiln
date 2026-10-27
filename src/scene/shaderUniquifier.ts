import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';

const SHADER_FAMILIES = ['default', 'pbr', 'shadowMap'] as const;

/**
 * Drivers (and Chromium's GPU process) keep a disk cache of compiled programs, so a page reload would find its
 * shaders already compiled and the "cold" path would look cheap. Adding a statement with a literal that is new on
 * every page load makes the translated source different, so the cache cannot match. The statement adds about
 * 1e-30 to a value that is never smaller than 1e-6 in a way anyone could see, and no compiler may drop it.
 *
 * Returns how many shaders were changed, so the page can say whether the guarantee holds.
 */
export function uniquifyShaders(runToken: string): number {
  const literal = `1.${runToken}e-30`;
  let changed = 0;
  for (const family of SHADER_FAMILIES) {
    changed += append(`${family}VertexShader`, `gl_Position.w+=${literal};`);
    changed += append(`${family}PixelShader`, `gl_FragColor.r+=${literal};`);
  }
  return changed;
}

function append(shaderName: string, statement: string): number {
  const source = ShaderStore.ShadersStore[shaderName];
  if (source === undefined) return 0;
  const endOfMain = source.lastIndexOf('}');
  if (endOfMain < 0) return 0;
  ShaderStore.ShadersStore[shaderName] =
    `${source.slice(0, endOfMain)}${statement}\n${source.slice(endOfMain)}`;
  return 1;
}

export function createRunToken(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}
