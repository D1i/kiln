import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Material } from '@babylonjs/core/Materials/material';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

export interface GuestContext {
  scene: Scene;
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
  textures: BaseTexture[];
  shadowGenerator?: ShadowGenerator;
  dispose(): void;
}

export type GuestFactory = (context: GuestContext) => GuestInstance;

interface GuestParts {
  root: TransformNode;
  meshes: AbstractMesh[];
  materials: Material[];
  textures?: BaseTexture[];
  shadowGenerator?: ShadowGenerator;
  /** Lights, observers and other things that are not children of `root` but live and die with the guest. */
  owned?: Array<{ dispose(): void }>;
}

export function createGuestRoot(context: GuestContext, id: string): TransformNode {
  const root = new TransformNode(`guest-${id}`, context.scene);
  root.position.copyFrom(context.position);
  return root;
}

export function assembleGuest(parts: GuestParts): GuestInstance {
  const owned = parts.owned ?? [];
  return {
    root: parts.root,
    meshes: parts.meshes,
    materials: parts.materials,
    textures: parts.textures ?? [],
    shadowGenerator: parts.shadowGenerator,
    dispose() {
      for (const resource of owned) resource.dispose();
      parts.root.dispose(false, true);
    }
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
  return new Texture(context.textureUrl(fileName), context.scene);
}
