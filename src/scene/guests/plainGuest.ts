import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { assembleGuest, createGuestRoot, createMatteMaterial, type GuestFactory } from './guestKit';

/** The baseline variant: a lit standard material with no textures. */
export const createPlainGuest: GuestFactory = (context) => {
  const root = createGuestRoot(context, 'plain');
  const mesh = CreateSphere('plain-mesh', { diameter: 1.6, segments: 32 }, context.scene);
  mesh.parent = root;
  mesh.position.y = 0.8;
  const material = createMatteMaterial(context, 'plain-material', new Color3(0.85, 0.45, 0.35));
  mesh.material = material;
  return assembleGuest({ root, meshes: [mesh], materials: [material] });
};
