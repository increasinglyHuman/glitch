import { Scene, ArcRotateCamera, Vector3 } from '@babylonjs/core';

/**
 * Orbit camera for Glitch. Left-drag rotate, right-drag pan, scroll zoom.
 * Config adapted from World's BabylonEngine.ts setupArcRotateCamera.
 */
export class OrbitCamera {
  private camera: ArcRotateCamera;

  constructor(scene: Scene) {
    this.camera = new ArcRotateCamera(
      'orbit',
      Math.PI / 4,
      Math.PI / 3,
      10,
      Vector3.Zero(),
      scene,
    );

    this.camera.wheelPrecision = 25;
    this.camera.lowerRadiusLimit = 2;
    this.camera.upperRadiusLimit = 200;
    this.camera.lowerBetaLimit = 0.1;
    this.camera.upperBetaLimit = Math.PI - 0.1;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1000;
    this.camera.panningSensibility = 50;
  }

  activate(canvas: HTMLCanvasElement): void {
    this.camera.attachControl(canvas, true);
  }

  deactivate(): void {
    this.camera.detachControl();
  }

  setTarget(target: Vector3): void {
    this.camera.setTarget(target);
  }

  getCamera(): ArcRotateCamera {
    return this.camera;
  }

  dispose(): void {
    this.camera.dispose();
  }
}
