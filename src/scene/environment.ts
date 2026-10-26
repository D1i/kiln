import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { Scene } from '@babylonjs/core/scene';

/** The panel covers the left of the screen; aiming left of the origin keeps all 12 guests clear of it. */
const CAMERA_TARGET_X = -2.4;

export interface Environment {
  scene: Scene;
  camera: ArcRotateCamera;
}

/** Floor, orbit camera and the one light that reaches every guest. Identical in both modes. */
export function createEnvironment(engine: Engine, canvas: HTMLCanvasElement): Environment {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.055, 0.067, 0.09, 1);

  const camera = new ArcRotateCamera(
    'camera',
    -Math.PI / 2,
    0.95,
    19,
    new Vector3(CAMERA_TARGET_X, 0.6, 0),
    scene
  );
  camera.lowerRadiusLimit = 6;
  camera.upperRadiusLimit = 30;
  camera.upperBetaLimit = Math.PI / 2 - 0.05;
  camera.wheelPrecision = 30;
  camera.attachControl(canvas, true);

  const light = new HemisphericLight('base-light', new Vector3(0.2, 1, -0.3), scene);
  light.intensity = 1;
  light.groundColor = new Color3(0.25, 0.27, 0.32);

  const floor = CreateGround('floor', { width: 17, height: 13 }, scene);
  const floorMaterial = new StandardMaterial('floor-material', scene);
  floorMaterial.diffuseColor = new Color3(0.16, 0.18, 0.24);
  floorMaterial.specularColor = Color3.Black();
  floor.material = floorMaterial;

  return { scene, camera };
}
