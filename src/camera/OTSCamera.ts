import { Scene, ArcRotateCamera, Vector3, Observer } from '@babylonjs/core';
import type { Mannequin } from '../character/Mannequin.js';

const HEIGHT_OFFSET = 1.6;
const SPRING_STRENGTH = 0.08;
const ALPHA_BLEND = 0.08;
const RADIUS_LERP = 0.12;
const BETA_LERP = 0.06;
const DEFAULT_RADIUS = 3.5;
const DEFAULT_BETA = (85 * Math.PI) / 180;

/**
 * Over-the-shoulder follow camera.
 * Simplified elastic band from World's HybridSLCamera.
 * Reusable Vector3s prevent GC thrashing.
 */
export class OTSCamera {
  private camera: ArcRotateCamera;
  private scene: Scene;
  private mannequin: Mannequin;
  private followObserver: Observer<Scene> | null = null;

  // Reusable vectors (GC prevention pattern from HybridSLCamera)
  private _tempMovement = Vector3.Zero();
  private _lastPos = Vector3.Zero();
  private _forwardHint = new Vector3(0, 0, 1);

  constructor(scene: Scene, mannequin: Mannequin) {
    this.scene = scene;
    this.mannequin = mannequin;

    const pos = mannequin.getPosition();
    const target = new Vector3(pos.x, pos.y + HEIGHT_OFFSET, pos.z);

    this.camera = new ArcRotateCamera(
      'ots',
      Math.PI / 2,
      DEFAULT_BETA,
      DEFAULT_RADIUS,
      target,
      scene,
    );

    this.camera.lowerRadiusLimit = 1.2;
    this.camera.upperRadiusLimit = 40;
    this.camera.wheelPrecision = 25;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1000;
    this.camera.lowerBetaLimit = 0.01;
    this.camera.upperBetaLimit = Math.PI - 0.01;

    this._lastPos.copyFrom(pos);
  }

  activate(canvas: HTMLCanvasElement): void {
    const pos = this.mannequin.getPosition();
    const alpha = Math.PI / 2;
    const beta = DEFAULT_BETA;
    const radius = DEFAULT_RADIUS;

    // Compute both target and camera position explicitly.
    // This makes rebuildAnglesAndRadius a no-op (values already correct).
    const tx = pos.x;
    const ty = pos.y + HEIGHT_OFFSET;
    const tz = pos.z;
    const sinB = Math.sin(beta);
    const camX = tx + radius * sinB * Math.sin(alpha);
    const camY = ty + radius * Math.cos(beta);
    const camZ = tz + radius * sinB * Math.cos(alpha);

    if (__DEV__) console.log(`[Glitch][OTS] activate: cam=(${camX.toFixed(2)}, ${camY.toFixed(2)}, ${camZ.toFixed(2)})`);

    // Set position FIRST so rebuildAnglesAndRadius computes correct values
    this.camera.position.copyFromFloats(camX, camY, camZ);
    this.camera.setTarget(new Vector3(tx, ty, tz));


    this._lastPos.copyFrom(pos);
    this.camera.attachControl(canvas, true);

    // Start elastic band follow
    this.followObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.updateFollow();
    });
  }

  deactivate(): void {
    this.camera.detachControl();
    if (this.followObserver) {
      this.scene.onBeforeRenderObservable.remove(this.followObserver);
      this.followObserver = null;
    }
  }

  private updateFollow(): void {
    const avatarPos = this.mannequin.getPosition();

    // Track movement direction for "stay behind" orbit
    avatarPos.subtractToRef(this._lastPos, this._tempMovement);
    if (this._tempMovement.lengthSquared() > 1e-4) {
      this._forwardHint.copyFrom(this._tempMovement).normalize();
      this._lastPos.copyFrom(avatarPos);
    }

    // Desired target = avatar + height offset
    const tx = avatarPos.x;
    const ty = avatarPos.y + HEIGHT_OFFSET;
    const tz = avatarPos.z;

    // Elastic band: lerp camera target toward avatar.
    // CRITICAL: Mutate target directly — DO NOT call setTarget() here.
    // setTarget() triggers rebuildAnglesAndRadius which recomputes alpha/beta/radius
    // from camera.position, destroying our managed values every frame.
    const t = this.camera.target;
    t.x += (tx - t.x) * SPRING_STRENGTH;
    t.y += (ty - t.y) * SPRING_STRENGTH;
    t.z += (tz - t.z) * SPRING_STRENGTH;

    // Orbit alpha to stay behind movement direction
    if (this._tempMovement.lengthSquared() > 0.01) {
      const desiredAlpha = Math.atan2(-this._forwardHint.x, -this._forwardHint.z);
      this.camera.alpha = this.blendAngle(this.camera.alpha, desiredAlpha, ALPHA_BLEND);
    }

    // Radius recovery toward default distance
    this.camera.radius += (DEFAULT_RADIUS - this.camera.radius) * RADIUS_LERP;

    // Beta recovery toward default angle
    this.camera.beta += (DEFAULT_BETA - this.camera.beta) * BETA_LERP;
  }

  private blendAngle(current: number, target: number, amount: number): number {
    const delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
    return current + delta * amount;
  }

  getCamera(): ArcRotateCamera {
    return this.camera;
  }

  dispose(): void {
    this.deactivate();
    this.camera.dispose();
  }
}
