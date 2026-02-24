import { Scene, ArcRotateCamera, Vector3, Observer } from '@babylonjs/core';
import type { Mannequin } from '../character/Mannequin.js';

/**
 * Orbit camera for Glitch. Left-drag rotate, right-drag pan, scroll zoom.
 * Auto-tracks mannequin position as the orbit target.
 */
export class OrbitCamera {
  private camera: ArcRotateCamera;
  private scene: Scene;
  private mannequin: Mannequin | null = null;
  private trackObserver: Observer<Scene> | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
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

  setMannequin(mannequin: Mannequin): void {
    this.mannequin = mannequin;
  }

  activate(canvas: HTMLCanvasElement): void {
    // Sync target to mannequin before attaching
    if (this.mannequin) {
      const pos = this.mannequin.getPosition();
      this.camera.setTarget(new Vector3(pos.x, pos.y + 1.0, pos.z));
    }

    this.camera.attachControl(canvas, true);

    // Auto-track mannequin as orbit target
    this.trackObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (!this.mannequin) return;
      const pos = this.mannequin.getPosition();
      this.camera.setTarget(new Vector3(pos.x, pos.y + 1.0, pos.z));
    });
  }

  deactivate(): void {
    this.camera.detachControl();
    if (this.trackObserver) {
      this.scene.onBeforeRenderObservable.remove(this.trackObserver);
      this.trackObserver = null;
    }
  }

  setTarget(target: Vector3): void {
    this.camera.setTarget(target);
  }

  getCamera(): ArcRotateCamera {
    return this.camera;
  }

  dispose(): void {
    this.deactivate();
    this.camera.dispose();
  }
}
