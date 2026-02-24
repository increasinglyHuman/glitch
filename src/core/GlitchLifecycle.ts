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
  private debugKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private wireframeOn = false;

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

      // 7. Animation state machine (bind GLB animations)
      this.animationManager = new AnimationManager();
      this.animationManager.bindAnimations(this.mannequin.getAnimationGroups());

      // 8. Cameras (both track mannequin)
      this.orbitCamera = new OrbitCamera(scene);
      this.orbitCamera.setMannequin(this.mannequin);
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

      // 12. Debug keys (F1 = dump state, F2 = wireframe toggle, F3 = inspector)
      this.debugKeyHandler = (e: KeyboardEvent): void => {
        if (e.code === 'F1') {
          e.preventDefault();
          this.dumpSceneState();
        } else if (e.code === 'F2') {
          e.preventDefault();
          this.toggleWireframe();
        } else if (e.code === 'F3') {
          e.preventDefault();
          this.toggleInspector();
        }
      };
      window.addEventListener('keydown', this.debugKeyHandler);

      // 13. Start rendering
      this.glitchEngine.startRenderLoop();
      this.state = 'running';
      console.log(`[Glitch] Running: ${config.glitchType} "${config.label}"`);
      console.log('[Glitch] Debug keys: F1=dump state, F2=wireframe, F3=inspector');
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

  private dumpSceneState(): void {
    const scene = this.glitchEngine?.getScene();
    if (!scene) return;
    const cam = scene.activeCamera;
    console.log('===== [Glitch] SCENE STATE DUMP (F1) =====');
    console.log(`activeCamera: ${cam?.name ?? 'null'}`);
    console.log(`activeCameras: [${scene.activeCameras?.map(c => c.name).join(', ') ?? ''}]`);
    console.log(`scene.cameras: [${scene.cameras.map(c => c.name).join(', ')}]`);
    console.log(`meshes (${scene.meshes.length}):`);
    for (const m of scene.meshes) {
      console.log(`  "${m.name}" visible=${m.isVisible} pickable=${m.isPickable} enabled=${m.isEnabled()} vertices=${m.getTotalVertices()}`);
    }
    console.log(`lights (${scene.lights.length}): [${scene.lights.map(l => l.name).join(', ')}]`);
    if (cam) {
      console.log(`cam position: (${cam.position.x.toFixed(2)}, ${cam.position.y.toFixed(2)}, ${cam.position.z.toFixed(2)})`);
      if ('getTarget' in cam) {
        const arc = cam as import('@babylonjs/core').ArcRotateCamera;
        const t = arc.getTarget();
        console.log(`cam target: (${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)})`);
        console.log(`cam alpha=${arc.alpha.toFixed(3)} beta=${arc.beta.toFixed(3)} radius=${arc.radius.toFixed(2)}`);
        console.log(`cam viewport: x=${arc.viewport.x} y=${arc.viewport.y} w=${arc.viewport.width} h=${arc.viewport.height}`);
      }
    }
    if (this.mannequin) {
      const p = this.mannequin.getPosition();
      console.log(`mannequin pos: (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`);
    }
    if (this.animationManager) {
      console.log(`animation state: ${this.animationManager.getCurrentState()}`);
    }
    console.log('===== END DUMP =====');
  }

  private toggleWireframe(): void {
    const scene = this.glitchEngine?.getScene();
    if (!scene) return;
    this.wireframeOn = !this.wireframeOn;
    for (const mesh of scene.meshes) {
      if (mesh.material) {
        mesh.material.wireframe = this.wireframeOn;
      }
    }
    console.log(`[Glitch] Wireframe: ${this.wireframeOn ? 'ON' : 'OFF'}`);
  }

  private async toggleInspector(): Promise<void> {
    const scene = this.glitchEngine?.getScene();
    if (!scene) return;

    // Load inspector from CDN on first use (avoids bundling React + FluentUI)
    if (!scene.debugLayer.isVisible()) {
      if (!document.querySelector('script[data-babylon-inspector]')) {
        console.log('[Glitch] Loading inspector from CDN...');
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.babylonjs.com/inspector/babylon.inspector.bundle.js';
          script.setAttribute('data-babylon-inspector', '1');
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load inspector'));
          document.head.appendChild(script);
        });
      }
      await scene.debugLayer.show({ overlay: true });
      console.log('[Glitch] Inspector: ON');
    } else {
      scene.debugLayer.hide();
      console.log('[Glitch] Inspector: OFF');
    }
  }

  dispose(): void {
    if (this.state === 'disposed') return;

    if (this.debugKeyHandler) {
      window.removeEventListener('keydown', this.debugKeyHandler);
    }

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
