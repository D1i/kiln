import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { assembleGuest, createGuestRoot, createMatteMaterial, type GuestFactory } from './guestKit';

export const createTransparentGuest: GuestFactory = (context) => {
  const root = createGuestRoot(context, 'transparent');
  const mesh = CreateSphere('transparent-mesh', { diameter: 1.7, segments: 32 }, context.scene);
  mesh.parent = root;
  mesh.position.y = 0.85;
  const material = createMatteMaterial(context, 'transparent-material', new Color3(0.35, 0.8, 0.95));
  material.alpha = 0.45;
  mesh.material = material;
  return assembleGuest({ root, meshes: [mesh], materials: [material] });
};

/**
 * Light and shadow settings change the shader of every mesh the light reaches. `includedOnlyMeshes` keeps the
 * extra light on this guest alone, so no other guest gets a new shader variant when this one is created.
 */
export const createShadowGuest: GuestFactory = (context) => {
  const root = createGuestRoot(context, 'shadow');
  const caster = CreateBox('shadow-caster', { size: 1 }, context.scene);
  caster.parent = root;
  caster.position.y = 1.1;
  caster.rotation.y = Math.PI / 6;
  const casterMaterial = createMatteMaterial(context, 'shadow-caster-material', new Color3(0.9, 0.35, 0.4));
  caster.material = casterMaterial;

  const receiver = CreateGround('shadow-receiver', { width: 3, height: 3 }, context.scene);
  receiver.parent = root;
  receiver.position.y = 0.01;
  receiver.receiveShadows = true;
  const receiverMaterial = createMatteMaterial(
    context,
    'shadow-receiver-material',
    new Color3(0.85, 0.85, 0.9)
  );
  receiver.material = receiverMaterial;

  const light = new DirectionalLight('shadow-light', new Vector3(-0.6, -1.2, -0.5), context.scene);
  light.position = context.position.add(new Vector3(3, 6, 3));
  light.intensity = 0.8;
  light.includedOnlyMeshes = [caster, receiver];

  const shadowGenerator = new ShadowGenerator(1024, light);
  shadowGenerator.usePercentageCloserFiltering = true;
  shadowGenerator.addShadowCaster(caster);

  return assembleGuest({
    root,
    meshes: [caster, receiver],
    materials: [casterMaterial, receiverMaterial],
    shadowGenerator
  });
};

export const createTwoLightsGuest: GuestFactory = (context) => {
  const root = createGuestRoot(context, 'two-lights');
  const mesh = CreateSphere('two-lights-mesh', { diameter: 1.7, segments: 32 }, context.scene);
  mesh.parent = root;
  mesh.position.y = 0.85;
  const material = createMatteMaterial(context, 'two-lights-material', new Color3(0.9, 0.9, 0.95));
  mesh.material = material;

  const light = new PointLight(
    'two-lights-point',
    context.position.add(new Vector3(1.6, 2.6, -1.6)),
    context.scene
  );
  light.diffuse = new Color3(1, 0.65, 0.3);
  light.intensity = 1.2;
  light.includedOnlyMeshes = [mesh];

  return assembleGuest({ root, meshes: [mesh], materials: [material] });
};
