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
    const prevCam = this.scene.activeCamera;
    console.log(`[Glitch][CamSwitch] ===== ${this.activeMode} → ${mode} =====`);
    console.log(`[Glitch][CamSwitch] BEFORE: activeCamera="${prevCam?.name}", activeCameras=[${this.scene.activeCameras?.map(c => c.name).join(',')}], scene.cameras=[${this.scene.cameras.map(c => c.name).join(',')}]`);
    console.log(`[Glitch][CamSwitch] scene meshes: ${this.scene.meshes.length}, visible: ${this.scene.meshes.filter(m => m.isVisible).length}`);

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

    const newCam = this.scene.activeCamera!;
    console.log(`[Glitch][CamSwitch] AFTER: activeCamera="${newCam.name}", activeCameras=[${this.scene.activeCameras?.map(c => c.name).join(',')}]`);
    console.log(`[Glitch][CamSwitch] cam pos=(${newCam.position.x.toFixed(2)}, ${newCam.position.y.toFixed(2)}, ${newCam.position.z.toFixed(2)})`);
    if ('target' in newCam) {
      const t = (newCam as import('@babylonjs/core').ArcRotateCamera).getTarget();
      const arc = newCam as import('@babylonjs/core').ArcRotateCamera;
      console.log(`[Glitch][CamSwitch] cam target=(${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)}) alpha=${arc.alpha.toFixed(3)} beta=${arc.beta.toFixed(3)} radius=${arc.radius.toFixed(2)}`);
      console.log(`[Glitch][CamSwitch] cam minZ=${arc.minZ} maxZ=${arc.maxZ} fov=${arc.fov.toFixed(3)}`);
    }

    this.hud.setCameraMode(mode);
    this.hud.showCoordinates(mode === 'ots');
    console.log(`[Glitch][CamSwitch] ===== switch complete =====`);
  }

  getMode(): CameraMode {
    return this.activeMode;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }
}
