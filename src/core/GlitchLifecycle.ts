import type { GlitchConfig, GlitchState } from '../types/index.js';
import { GlitchEngine } from './GlitchEngine.js';
import { LightingSetup } from '../scene/LightingSetup.js';
import { GridFloor } from '../scene/GridFloor.js';
import { PhysicsSetup } from '../physics/PhysicsSetup.js';
import { Mannequin } from '../character/Mannequin.js';
import { MannequinController } from '../character/MannequinController.js';
import { AnimationManager } from '../character/AnimationManager.js';
import { OrbitCamera } from '../camera/OrbitCamera.js';
import { OTSCamera } from '../camera/OTSCamera.js';
import { CameraSwitcher } from '../camera/CameraSwitcher.js';
import { HUD } from '../hud/HUD.js';

/**
 * Orchestrates the full Glitch lifecycle: spawn → run → dispose.
 */
export class GlitchLifecycle {
  private state: GlitchState = 'idle';

  private glitchEngine: GlitchEngine | null = null;
  private lighting: LightingSetup | null = null;
  private grid: GridFloor | null = null;
  private physics: PhysicsSetup | null = null;
  private mannequin: Mannequin | null = null;
  private controller: MannequinController | null = null;
  private animationManager: AnimationManager | null = null;
  private orbitCamera: OrbitCamera | null = null;
  private otsCamera: OTSCamera | null = null;
  private cameraSwitcher: CameraSwitcher | null = null;
  private hud: HUD | null = null;

  private container: HTMLElement;
  private canvas: HTMLCanvasElement;

  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    this.container = container;
    this.canvas = canvas;
  }

  async spawn(config: GlitchConfig): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot spawn in state "${this.state}"`);
    }

    this.state = 'loading';

    try {
      // 1. Engine
      this.glitchEngine = new GlitchEngine(this.canvas);
      await this.glitchEngine.initialize();
      const scene = this.glitchEngine.getScene();

      // 2. Lighting
      this.lighting = new LightingSetup(scene);

      // 3. Grid floor
      this.grid = new GridFloor(scene);
      if (!config.showGrid) {
        this.grid.setVisible(false);
      }

      // 4. Physics stub
      this.physics = new PhysicsSetup(scene);

      // 5. Mannequin
      this.mannequin = new Mannequin(scene);
      await this.mannequin.load(config.spawnPoint, config.spawnRotation);

      // 6. Controller
      this.controller = new MannequinController(this.mannequin, scene);

      // 7. Animation state machine
      this.animationManager = new AnimationManager();

      // 8. Cameras
      this.orbitCamera = new OrbitCamera(scene);
      this.otsCamera = new OTSCamera(scene, this.mannequin);

      // 9. HUD
      this.hud = new HUD(this.container);
      this.hud.setLabel(config.label);

      // 10. Camera switcher
      this.cameraSwitcher = new CameraSwitcher(
        scene,
        this.canvas,
        this.orbitCamera,
        this.otsCamera,
        this.hud,
        config.cameraMode,
      );

      // 11. Per-frame updates
      scene.registerBeforeRender(() => {
        if (!this.controller || !this.animationManager || !this.mannequin || !this.hud || !this.glitchEngine) return;
        const dt = this.glitchEngine.getEngine().getDeltaTime() / 1000;

        // Animation state
        this.animationManager.update(this.controller.getMovementState(), dt);

        // HUD updates
        const pos = this.mannequin.getPosition();
        this.hud.setCoordinates(pos.x, pos.y, pos.z);
        this.hud.setFPS(this.glitchEngine.getFPS());
      });

      // 12. Start rendering
      this.glitchEngine.startRenderLoop();
      this.state = 'running';
      console.log(`[Glitch] Running: ${config.glitchType} "${config.label}"`);
    } catch (error) {
      this.state = 'disposed';
      throw error;
    }
  }

  getHUD(): HUD | null {
    return this.hud;
  }

  getState(): GlitchState {
    return this.state;
  }

  dispose(): void {
    if (this.state === 'disposed') return;

    // Dispose in reverse order
    this.cameraSwitcher?.dispose();
    this.hud?.dispose();
    this.otsCamera?.dispose();
    this.orbitCamera?.dispose();
    this.animationManager?.dispose();
    this.controller?.dispose();
    this.mannequin?.dispose();
    this.physics?.dispose();
    this.grid?.dispose();
    this.lighting?.dispose();
    this.glitchEngine?.dispose();

    this.cameraSwitcher = null;
    this.hud = null;
    this.otsCamera = null;
    this.orbitCamera = null;
    this.animationManager = null;
    this.controller = null;
    this.mannequin = null;
    this.physics = null;
    this.grid = null;
    this.lighting = null;
    this.glitchEngine = null;

    this.state = 'disposed';
    console.log('[Glitch] Disposed');
  }
}
