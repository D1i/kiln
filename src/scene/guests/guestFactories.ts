import type { GuestId } from '../guestCatalog';
import type { GuestFactory } from './guestKit';
import { createPlainGuest } from './plainGuest';
import {
  createDiffuseNormalGuest,
  createKtx2Guest,
  createPbrGuest,
  createPng4096Guest,
  createTexture2048Guest
} from './texturedGuests';
import { createShadowGuest, createTransparentGuest, createTwoLightsGuest } from './lightingGuests';
import { createMorphGuest, createSkinnedGuest, createVertexColorsGuest } from './geometryGuests';

/** Exhaustive by type: adding an id to the catalog without a factory does not compile. */
export const GUEST_FACTORIES: Record<GuestId, GuestFactory> = {
  plain: createPlainGuest,
  'texture-2048': createTexture2048Guest,
  'diffuse-normal': createDiffuseNormalGuest,
  pbr: createPbrGuest,
  transparent: createTransparentGuest,
  shadow: createShadowGuest,
  'two-lights': createTwoLightsGuest,
  'vertex-colors': createVertexColorsGuest,
  morph: createMorphGuest,
  skinned: createSkinnedGuest,
  'ktx2-2048': createKtx2Guest,
  'png-4096': createPng4096Guest
};
