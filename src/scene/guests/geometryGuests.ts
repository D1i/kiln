import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Axis, Space } from '@babylonjs/core/Maths/math.axis';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { MorphTarget } from '@babylonjs/core/Morph/morphTarget';
import { MorphTargetManager } from '@babylonjs/core/Morph/morphTargetManager';
import { Bone } from '@babylonjs/core/Bones/bone';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { assembleGuest, createGuestRoot, createMatteMaterial, type GuestFactory } from './guestKit';

export const createVertexColorsGuest: GuestFactory = (context) => {
  const root = createGuestRoot(context, 'vertex-colors');
  const mesh = CreateBox('vertex-colors-mesh', { size: 1.5 }, context.scene);
  mesh.parent = root;
  mesh.position.y = 0.75;
  mesh.rotation.y = Math.PI / 5;
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
  const colors: number[] = [];
  for (let vertex = 0; vertex < positions.length; vertex += 3) {
    colors.push(
      (positions[vertex] ?? 0) + 0.75,
      (positions[vertex + 1] ?? 0) + 0.75,
      (positions[vertex + 2] ?? 0) + 0.75,
      1
    );
  }
  mesh.setVerticesData(
    VertexBuffer.ColorKind,
    colors.map((value) => value / 1.5)
  );
  const material = createMatteMaterial(context, 'vertex-colors-material', Color3.White());
  mesh.material = material;
  return assembleGuest({ root, meshes: [mesh], materials: [material] });
};

/**
 * Two morph targets, both kept at a non-zero influence: the number of active influencers is part of the shader
 * variant, so an influence passing through zero would trigger a compile in the middle of the animation.
 */
export const createMorphGuest: GuestFactory = (context) => {
  const root = createGuestRoot(context, 'morph');
  const mesh = CreateSphere('morph-mesh', { diameter: 1.5, segments: 32, updatable: true }, context.scene);
  mesh.parent = root;
  mesh.position.y = 0.85;
  const basePositions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];

  const stretchPositions = Float32Array.from(basePositions);
  const bulgePositions = Float32Array.from(basePositions);
  for (let vertex = 0; vertex < basePositions.length; vertex += 3) {
    const x = basePositions[vertex] ?? 0;
    const y = basePositions[vertex + 1] ?? 0;
    const z = basePositions[vertex + 2] ?? 0;
    stretchPositions[vertex + 1] = y * 1.7;
    const ripple = 1 + 0.35 * Math.sin(y * 9);
    bulgePositions[vertex] = x * ripple;
    bulgePositions[vertex + 2] = z * ripple;
  }

  const manager = new MorphTargetManager(context.scene);
  const stretch = new MorphTarget('stretch', 0.5, context.scene);
  stretch.setPositions(stretchPositions);
  const bulge = new MorphTarget('bulge', 0.5, context.scene);
  bulge.setPositions(bulgePositions);
  manager.addTarget(stretch);
  manager.addTarget(bulge);
  mesh.morphTargetManager = manager;

  const material = createMatteMaterial(context, 'morph-material', new Color3(0.55, 0.85, 0.5));
  mesh.material = material;

  const observer = context.scene.onBeforeRenderObservable.add(() => {
    const seconds = performance.now() / 1000;
    stretch.influence = 0.55 + 0.45 * Math.sin(seconds * 1.7);
    bulge.influence = 0.55 + 0.45 * Math.sin(seconds * 1.1 + 1);
  });

  return assembleGuest({
    root,
    meshes: [mesh],
    materials: [material],
    owned: [manager, { dispose: () => context.scene.onBeforeRenderObservable.remove(observer) }]
  });
};

/** A cylinder skinned to two bones; the upper bone sways, so the skinning shader path is really executed. */
export const createSkinnedGuest: GuestFactory = (context) => {
  const root = createGuestRoot(context, 'skinned');
  const mesh = CreateCylinder(
    'skinned-mesh',
    { height: 2, diameter: 0.8, tessellation: 24, subdivisions: 12 },
    context.scene
  );
  mesh.parent = root;
  mesh.position.y = 1;

  const skeleton = new Skeleton('skinned-skeleton', 'skinned-skeleton', context.scene);
  const lowerBone = new Bone('lower', skeleton, null, Matrix.Translation(0, -1, 0));
  const upperBone = new Bone('upper', skeleton, lowerBone, Matrix.Translation(0, 1, 0));

  // Below the upper joint (y = 0) a vertex follows the lower bone only; above it, it blends towards the upper one.
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
  const boneIndices: number[] = [];
  const boneWeights: number[] = [];
  for (let vertex = 0; vertex < positions.length; vertex += 3) {
    const y = positions[vertex + 1] ?? 0;
    const upperWeight = Math.min(1, Math.max(0, y / 0.8));
    boneIndices.push(0, 1, 0, 0);
    boneWeights.push(1 - upperWeight, upperWeight, 0, 0);
  }
  mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, boneIndices, false);
  mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, boneWeights, false);
  mesh.skeleton = skeleton;

  const material = createMatteMaterial(context, 'skinned-material', new Color3(0.95, 0.8, 0.35));
  mesh.material = material;

  let appliedAngle = 0;
  const observer = context.scene.onBeforeRenderObservable.add(() => {
    const angle = 0.6 * Math.sin(performance.now() / 600);
    upperBone.rotate(Axis.Z, angle - appliedAngle, Space.LOCAL);
    appliedAngle = angle;
  });

  return assembleGuest({
    root,
    meshes: [mesh],
    materials: [material],
    owned: [skeleton, { dispose: () => context.scene.onBeforeRenderObservable.remove(observer) }]
  });
};
