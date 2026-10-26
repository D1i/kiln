import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { PBRMetallicRoughnessMaterial } from '@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial';
import {
  assembleGuest,
  createGuestRoot,
  createMatteMaterial,
  loadTexture,
  type GuestFactory
} from './guestKit';

function createTexturedBoxGuest(id: string, textureFile: string): GuestFactory {
  return (context) => {
    const root = createGuestRoot(context, id);
    const mesh = CreateBox(`${id}-mesh`, { size: 1.5 }, context.scene);
    mesh.parent = root;
    mesh.position.y = 0.75;
    mesh.rotation.y = Math.PI / 5;
    const material = createMatteMaterial(context, `${id}-material`, Color3.White());
    const diffuse = loadTexture(context, textureFile);
    material.diffuseTexture = diffuse;
    mesh.material = material;
    return assembleGuest({ root, meshes: [mesh], materials: [material], textures: [diffuse] });
  };
}

/** The headline case of the post: a 2048² diffuse texture is uploaded and mipmapped on its first draw. */
export const createTexture2048Guest = createTexturedBoxGuest('texture-2048', 'diffuse-2048.png');

/**
 * Stage 1 loads the PNG twin of the texture; the KTX2 container (with a ready mip chain) replaces it when the
 * KTX2 vs PNG switch lands.
 */
export const createKtx2Guest = createTexturedBoxGuest('ktx2-2048', 'basis-2048.png');

/** 64 MB of RGBA in video memory plus the mip chain, and a PNG that has to be decoded first. */
export const createPng4096Guest = createTexturedBoxGuest('png-4096', 'png-4096.png');

export const createDiffuseNormalGuest: GuestFactory = (context) => {
  const root = createGuestRoot(context, 'diffuse-normal');
  const mesh = CreateSphere('diffuse-normal-mesh', { diameter: 1.7, segments: 48 }, context.scene);
  mesh.parent = root;
  mesh.position.y = 0.85;
  const material = createMatteMaterial(context, 'diffuse-normal-material', Color3.White());
  const diffuse = loadTexture(context, 'diffuse-1024.png');
  const normal = loadTexture(context, 'normal-1024.png');
  material.diffuseTexture = diffuse;
  material.bumpTexture = normal;
  mesh.material = material;
  return assembleGuest({ root, meshes: [mesh], materials: [material], textures: [diffuse, normal] });
};

export const createPbrGuest: GuestFactory = (context) => {
  const root = createGuestRoot(context, 'pbr');
  const mesh = CreateSphere('pbr-mesh', { diameter: 1.7, segments: 48 }, context.scene);
  mesh.parent = root;
  mesh.position.y = 0.85;
  const material = new PBRMetallicRoughnessMaterial('pbr-material', context.scene);
  const baseColor = loadTexture(context, 'pbr-albedo-1024.png');
  const metallicRoughness = loadTexture(context, 'pbr-metal-rough-1024.png');
  material.baseTexture = baseColor;
  material.metallicRoughnessTexture = metallicRoughness;
  material.metallic = 0.7;
  material.roughness = 1;
  mesh.material = material;
  return assembleGuest({
    root,
    meshes: [mesh],
    materials: [material],
    textures: [baseColor, metallicRoughness]
  });
};
