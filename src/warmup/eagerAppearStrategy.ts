import type { Scene } from '@babylonjs/core/scene';
import { createGuest } from '../scene/createGuest';
import { GUEST_CATALOG, type GuestId } from '../scene/guestCatalog';
import type { GuestInstance } from '../scene/guests/guestKit';
import type { AppearStrategy } from './appearStrategy';
import { warmUpGuests } from './warmupRunner';

/**
 * Warm-up on: every guest is built and warmed up on the loading screen and hidden. Appearing is only
 * `setEnabled(true)`, which is the point of the technique.
 */
export class EagerAppearStrategy implements AppearStrategy {
  readonly mode = 'on';
  private readonly instances = new Map<GuestId, GuestInstance>();

  constructor(
    private readonly scene: Scene,
    private readonly textureUrl: (fileName: string) => string
  ) {}

  async prepare(onProgress: (message: string) => void): Promise<void> {
    onProgress('creating objects');
    for (const { id } of GUEST_CATALOG) {
      const instance = createGuest(this.scene, id, this.textureUrl);
      instance.root.setEnabled(false);
      this.instances.set(id, instance);
    }
    await warmUpGuests(this.scene, [...this.instances.values()], onProgress);
  }

  reveal(guestId: GuestId): void {
    this.instances.get(guestId)?.root.setEnabled(true);
  }
}
