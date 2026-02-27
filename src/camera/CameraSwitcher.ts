import type { Scene } from '@babylonjs/core';
import type { OrbitCamera } from './OrbitCamera.js';
import type { OTSCamera } from './OTSCamera.js';
import type { HUD } from '../hud/HUD.js';
import type { CameraMode } from '../types/index.js';

/**
 * Tab-key toggle between orbit and OTS camera modes.
 */
export class CameraSwitcher {
  private scene: Scene;
  private canvas: HTMLCanvasElement;
  private orbit: OrbitCamera;
  private ots: OTSCamera;
  private hud: HUD;
  private activeMode: CameraMode;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    scene: Scene,
    canvas: HTMLCanvasElement,
    orbit: OrbitCamera,
    ots: OTSCamera,
    hud: HUD,
    initialMode: CameraMode,
  ) {
    this.scene = scene;
    this.canvas = canvas;
    this.orbit = orbit;
    this.ots = ots;
    this.hud = hud;
    this.activeMode = initialMode;

    this.keyHandler = (e: KeyboardEvent): void => {
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    // Activate initial mode
    this.setMode(initialMode);
  }

  toggle(): void {
    this.setMode(this.activeMode === 'orbit' ? 'ots' : 'orbit');
  }

  setMode(mode: CameraMode): void {
    // Deactivate current
    if (this.activeMode === 'orbit') {
      this.orbit.deactivate();
    } else {
      this.ots.deactivate();
    }

    this.activeMode = mode;

    // IMPORTANT: Clear activeCameras — using it forces Babylon's multi-camera
    // rendering path which causes black screen on camera switch.
    // Single-camera mode only needs scene.activeCamera.
    this.scene.activeCameras = [];

    if (mode === 'orbit') {
      this.orbit.activate(this.canvas);
      this.scene.activeCamera = this.orbit.getCamera();
    } else {
      this.ots.activate(this.canvas);
      this.scene.activeCamera = this.ots.getCamera();
    }

    this.hud.setCameraMode(mode);
    this.hud.showCoordinates(mode === 'ots');
  }

  getMode(): CameraMode {
    return this.activeMode;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }
}
