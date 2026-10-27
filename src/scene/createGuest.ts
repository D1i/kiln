import type { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GUEST_CATALOG, guestSlot, type GuestId } from './guestCatalog';
import { GUEST_FACTORIES } from './guests/guestFactories';
import type { GuestInstance } from './guests/guestKit';

/** Builds one guest in its cell of the grid. Both modes use it; they differ in when they call it. */
export function createGuest(
  scene: Scene,
  guestId: GuestId,
  textureUrl: (fileName: string) => string
): GuestInstance {
  const index = GUEST_CATALOG.findIndex((guest) => guest.id === guestId);
  const { x, z } = guestSlot(index);
  return GUEST_FACTORIES[guestId]({ scene, position: new Vector3(x, 0, z), textureUrl });
}
