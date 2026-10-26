import type { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GUEST_CATALOG, guestSlot, type GuestId } from '../scene/guestCatalog';
import { GUEST_FACTORIES } from '../scene/guests/guestFactories';
import type { GuestInstance } from '../scene/guests/guestKit';
import type { AppearStrategy } from './appearStrategy';

/** Warm-up off: a guest is created, and its textures start loading, at the moment it appears. */
export class LazyAppearStrategy implements AppearStrategy {
  readonly mode = 'off';
  private readonly instances = new Map<GuestId, GuestInstance>();

  constructor(
    private readonly scene: Scene,
    private readonly textureBaseUrl: string
  ) {}

  async prepare(): Promise<void> {
    // Nothing to do: the environment is the whole loading screen in this mode.
  }

  reveal(guestId: GuestId): void {
    if (this.instances.has(guestId)) return;
    const index = GUEST_CATALOG.findIndex((guest) => guest.id === guestId);
    const { x, z } = guestSlot(index);
    const instance = GUEST_FACTORIES[guestId]({
      scene: this.scene,
      position: new Vector3(x, 0, z),
      textureUrl: (fileName) => `${this.textureBaseUrl}${fileName}`
    });
    this.instances.set(guestId, instance);
  }

  reset(): void {
    for (const instance of this.instances.values()) instance.dispose();
    this.instances.clear();
  }
}
