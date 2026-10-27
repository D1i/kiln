import type { Scene } from '@babylonjs/core/scene';
import { createGuest } from '../scene/createGuest';
import type { GuestId } from '../scene/guestCatalog';
import type { TextureFormat } from '../scene/textureFormat';
import type { AppearStrategy } from './appearStrategy';

/** Warm-up off: a guest is created, and its textures start loading, at the moment it appears. */
export class LazyAppearStrategy implements AppearStrategy {
  readonly mode = 'off';
  private readonly revealed = new Set<GuestId>();

  constructor(
    private readonly scene: Scene,
    private readonly textureUrl: (fileName: string) => string,
    private readonly textureFormat: TextureFormat
  ) {}

  async prepare(): Promise<void> {
    // Nothing to do: the environment is the whole loading screen in this mode.
  }

  reveal(guestId: GuestId): void {
    if (this.revealed.has(guestId)) return;
    this.revealed.add(guestId);
    createGuest(this.scene, guestId, this.textureUrl, this.textureFormat);
  }
}
