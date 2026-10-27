import '@babylonjs/core/Engines/Extensions/engine.renderTarget';
import type { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { GuestInstance } from '../scene/guests/guestKit';

const TEXTURE_LOAD_TIMEOUT_MS = 30_000;

function whenTextureReady(texture: Texture): Promise<void> {
  return new Promise((resolve, reject) => {
    if (texture.isReady()) return resolve();
    const timer = setTimeout(
      () =>
        reject(new Error(`texture "${texture.name}" did not load in ${TEXTURE_LOAD_TIMEOUT_MS / 1000} s`)),
      TEXTURE_LOAD_TIMEOUT_MS
    );
    texture.onLoadObservable.addOnce(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** Runs the jobs at once and reports each completion; with parallel shader compile this overlaps the compiles. */
async function allWithProgress(
  jobs: Array<() => Promise<void>>,
  report: (done: number, total: number) => void
) {
  let done = 0;
  await Promise.all(
    jobs.map(async (job) => {
      await job();
      report(++done, jobs.length);
    })
  );
}

/**
 * The warm-up itself, for the loading screen. Three steps, each moves one cost out of the first appearance:
 *  1. textures: wait until every file is downloaded and decoded;
 *  2. materials: compile and link every shader variant (`forceCompilationAsync`), and the depth shader of shadows;
 *  3. one draw of every guest into a 1×1 offscreen target. That is what makes the driver do the work it defers
 *     until first use: texture upload and mip chain, pipeline state, shadow map. A pixel read-back at the end
 *     waits for the GPU to finish, so nothing is still queued when the loading screen goes away.
 * Guests must be disabled when this runs; they are enabled only for the length of their own draw.
 */
export async function warmUpGuests(
  scene: Scene,
  guests: readonly GuestInstance[],
  onProgress: (message: string) => void
): Promise<void> {
  const textures = guests.flatMap((guest) => guest.textures);
  await allWithProgress(
    textures.map((texture) => () => whenTextureReady(texture)),
    (done, total) => onProgress(`textures ${done}/${total}`)
  );

  const meshesWithMaterial = guests.flatMap((guest) => guest.meshes.filter((mesh) => mesh.material));
  await allWithProgress(
    meshesWithMaterial.map((mesh) => () => mesh.material?.forceCompilationAsync(mesh) ?? Promise.resolve()),
    (done, total) => onProgress(`materials ${done}/${total}`)
  );
  for (const guest of guests) await guest.shadowGenerator?.forceCompilationAsync();

  onProgress('drawing every object once');
  const target = new RenderTargetTexture('warmup-1x1', 1, scene, false);
  target.activeCamera = scene.activeCamera;
  for (const guest of guests) drawOnce(guest, target);
  await target.readPixels();
  target.dispose();
}

function drawOnce(guest: GuestInstance, target: RenderTargetTexture): void {
  guest.root.setEnabled(true);
  for (const mesh of guest.meshes) {
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.skeleton?.prepare();
  }
  // The shadow map is drawn first: the receiver samples it in the main draw below.
  guest.shadowGenerator?.getShadowMap()?.render();
  target.renderList = guest.meshes;
  target.render();
  for (const mesh of guest.meshes) mesh.alwaysSelectAsActiveMesh = false;
  guest.root.setEnabled(false);
}
