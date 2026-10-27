import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Material } from '@babylonjs/core/Materials/material';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import type { Scene } from '@babylonjs/core/scene';
import type { TextureFormat } from '../textureFormat';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { textureBuffer } from '../textureCache';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

export interface GuestContext {
  scene: Scene;
  textureFormat: TextureFormat;
  /** Floor position of the guest's grid cell. */
  position: Vector3;
  textureUrl(fileName: string): string;
}

export interface GuestInstance {
  /** Parent of everything the guest owns: `setEnabled` on it shows or hides the whole guest. */
  root: TransformNode;
  /** Every mesh of the guest, so warm-up can compile its materials against real geometry. */
  meshes: AbstractMesh[];
  materials: Material[];
  textures: Texture[];
  shadowGenerator?: ShadowGenerator;
}

export type GuestFactory = (context: GuestContext) => GuestInstance;

interface GuestParts {
  root: TransformNode;
  meshes: AbstractMesh[];
  materials: Material[];
  textures?: Texture[];
  shadowGenerator?: ShadowGenerator;
}

export function createGuestRoot(context: GuestContext, id: string): TransformNode {
  const root = new TransformNode(`guest-${id}`, context.scene);
  root.position.copyFrom(context.position);
  return root;
}

export function assembleGuest(parts: GuestParts): GuestInstance {
  return {
    root: parts.root,
    meshes: parts.meshes,
    materials: parts.materials,
    textures: parts.textures ?? [],
    shadowGenerator: parts.shadowGenerator
  };
}

/** A dull standard material: no specular highlight, so the only visual feature is the one the guest is about. */
export function createMatteMaterial(context: GuestContext, name: string, color: Color3): StandardMaterial {
  const material = new StandardMaterial(name, context.scene);
  material.diffuseColor = color;
  material.specularColor = Color3.Black();
  return material;
}

export function loadTexture(context: GuestContext, fileName: string): Texture {
  // With a prefetched buffer Babylon.js skips the network; the url still names the file, so the loader is
  // chosen by its extension (.ktx2 goes to the KTX2 decoder) and the decode happens here, not on the loading screen.
  const buffer = textureBuffer(fileName);
  return new Texture(context.textureUrl(fileName), context.scene, buffer ? { buffer } : undefined);
}
