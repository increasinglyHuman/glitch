import {
  Scene,
  Color3,
  Quaternion,
  Texture,
  Sound,
  PointerEventTypes,
  type ParticleSystem,
  type Observer,
  type PointerInfo,
} from '@babylonjs/core';
import type { StandardMaterial } from '@babylonjs/core';
import { ObjectRegistry } from './ObjectRegistry.js';
import { PrimFactory, PrimType } from './PrimFactory.js';
import { FloatingText } from './FloatingText.js';
import { ParticleAdapter } from './ParticleAdapter.js';

/**
 * Inbound command envelope from Scripter (matches ScriptCommandEnvelope shape).
 * We don't import from Scripter — structural typing only.
 */
export interface CommandEnvelope {
  readonly scriptId: string;
  readonly containerId: string;
  readonly callId: number;
  readonly command: {
    readonly type: string;
    readonly [key: string]: unknown;
  };
}

/**
 * Callback type for sending events back to Scripter.
 */
export type EventSender = (message: {
  type: 'scripter_event' | 'scripter_console';
  source: 'glitch';
  [key: string]: unknown;
}) => void;

/**
 * GlitchScriptBridge — Dispatches ScriptCommands against the Babylon.js scene.
 *
 * Phase 1 MVP handles: transform, appearance, communication, rez/die.
 * Unsupported commands are logged and ignored (no errors).
 *
 * Pattern adapted from ReferenceBabylonBridge in BlackBoxScripter,
 * but self-contained — no Scripter imports.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export class GlitchScriptBridge {
  private scene: Scene;
  private objectRegistry: ObjectRegistry;
  private primFactory: PrimFactory;
  private floatingText: FloatingText;
  private eventSender: EventSender;
  private pointerObserver: Observer<PointerInfo> | null = null;
  private particles = new Map<string, ParticleSystem>();
  private sounds = new Map<string, Sound>();

  constructor(scene: Scene, eventSender: EventSender) {
    this.scene = scene;
    this.objectRegistry = new ObjectRegistry();
    this.primFactory = new PrimFactory(scene);
    this.floatingText = new FloatingText(scene);
    this.eventSender = eventSender;

    this.setupTouchEvents();
  }

  /**
   * Create the root prim for a script (called before script execution).
   */
  createRootPrim(
    objectId: string,
    primType: number = PrimType.BOX,
    position?: { x: number; y: number; z: number },
    scale?: { x: number; y: number; z: number },
    name?: string,
  ): void {
    const mesh = this.primFactory.create({
      objectId,
      primType: primType as (typeof PrimType)[keyof typeof PrimType],
      position: position ?? { x: 0, y: 0.5, z: 0 },
      scale,
      name: name ?? 'root',
    });
    this.objectRegistry.register(objectId, mesh);
  }

  /**
   * Handle a ScriptCommand envelope from Scripter.
   */
  handle(envelope: CommandEnvelope): void {
    const cmd = envelope.command;

    switch (cmd.type) {
      // === Transform ===
      case 'setPosition': {
        const pos = cmd.position as { x: number; y: number; z: number };
        const mesh = this.objectRegistry.get(cmd.objectId as string);
        if (mesh && pos) {
          mesh.position.set(pos.x, pos.y, pos.z);
        }
        break;
      }

      case 'setRotation': {
        const rot = cmd.rotation as { x: number; y: number; z: number; s: number };
        const mesh = this.objectRegistry.get(cmd.objectId as string);
        if (mesh && rot) {
          // Protocol uses { s } (LSL convention), Babylon uses { w }
          mesh.rotationQuaternion = new Quaternion(rot.x, rot.y, rot.z, rot.s);
        }
        break;
      }

      case 'setScale': {
        const scale = cmd.scale as { x: number; y: number; z: number };
        const mesh = this.objectRegistry.get(cmd.objectId as string);
        if (mesh && scale) {
          mesh.scaling.set(scale.x, scale.y, scale.z);
        }
        break;
      }

      // === Appearance ===
      case 'setColor': {
        const color = cmd.color as { r: number; g: number; b: number };
        const mesh = this.objectRegistry.get(cmd.objectId as string);
        if (mesh?.material && color) {
          (mesh.material as StandardMaterial).diffuseColor = new Color3(color.r, color.g, color.b);
        }
        break;
      }

      case 'setAlpha': {
        const alpha = cmd.alpha as number;
        const mesh = this.objectRegistry.get(cmd.objectId as string);
        if (mesh && alpha !== undefined) {
          mesh.visibility = alpha;
          if (mesh.material) {
            (mesh.material as StandardMaterial).alpha = alpha;
          }
        }
        break;
      }

      case 'setText': {
        const mesh = this.objectRegistry.get(cmd.objectId as string);
        if (mesh) {
          const text = cmd.text as string;
          const color = cmd.color as { r: number; g: number; b: number } | undefined;
          const alpha = (cmd.alpha as number) ?? 1.0;
          // FloatingText expects color as {x,y,z} for RGB
          const textColor = color ? { x: color.r, y: color.g, z: color.b } : { x: 1, y: 1, z: 1 };
          this.floatingText.setText(cmd.objectId as string, mesh, text, textColor, alpha);
        }
        break;
      }

      case 'setGlow': {
        const glow = cmd.glow as number;
        const mesh = this.objectRegistry.get(cmd.objectId as string);
        if (mesh?.material && glow !== undefined) {
          const mat = mesh.material as StandardMaterial;
          const base = mat.diffuseColor ?? new Color3(0.5, 0.5, 0.5);
          mat.emissiveColor = new Color3(
            base.r * glow,
            base.g * glow,
            base.b * glow,
          );
        }
        break;
      }

      // === Communication ===
      case 'say':
      case 'whisper':
      case 'shout': {
        const channel = cmd.channel as number;
        const message = cmd.message as string;
        this.eventSender({
          type: 'scripter_console',
          source: 'glitch',
          channel,
          message,
          senderName: envelope.containerId,
          objectId: envelope.containerId,
          verb: cmd.type,
        });
        break;
      }

      // === Lifecycle ===
      case 'rezObject': {
        const pos = cmd.position as { x: number; y: number; z: number };
        const inventory = cmd.inventory as string;
        // Generate a unique ID for the new prim
        const newId = `rezzed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const mesh = this.primFactory.create({
          objectId: newId,
          primType: PrimType.BOX,
          position: pos,
          name: inventory ?? 'rezzed',
        });
        this.objectRegistry.register(newId, mesh);
        break;
      }

      case 'rezAtRoot': {
        const pos = cmd.position as { x: number; y: number; z: number };
        const inventory = cmd.inventory as string;
        const newId = `rezzed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const mesh = this.primFactory.create({
          objectId: newId,
          primType: PrimType.BOX,
          position: pos,
          name: inventory ?? 'rezzed',
        });
        this.objectRegistry.register(newId, mesh);
        break;
      }

      case 'die': {
        const objectId = cmd.objectId as string;
        this.floatingText.removeText(objectId);
        // Clean up particles/sounds attached to this object
        const deadParticles = this.particles.get(objectId);
        if (deadParticles) {
          ParticleAdapter.dispose(deadParticles);
          this.particles.delete(objectId);
        }
        const deadSound = this.sounds.get(objectId);
        if (deadSound) {
          deadSound.stop();
          deadSound.dispose();
          this.sounds.delete(objectId);
        }
        this.objectRegistry.remove(objectId);
        break;
      }

      // === Phase 2: Textures, Particles, Audio ===
      case 'setTexture': {
        const mesh = this.objectRegistry.get(cmd.objectId as string);
        const url = cmd.url as string | undefined;
        if (mesh?.material && url) {
          if (UUID_RE.test(url)) {
            // UUID textures can't be resolved in preview — skip silently
            if (__DEV__) console.log(`[GlitchBridge] Skipping UUID texture: ${url.slice(0, 8)}...`);
          } else {
            (mesh.material as StandardMaterial).diffuseTexture = new Texture(url, this.scene);
          }
        }
        break;
      }

      case 'setParticles': {
        const mesh = this.objectRegistry.get(cmd.objectId as string);
        const config = cmd.config as Record<string, unknown> | undefined;
        if (mesh && config) {
          // Dispose existing particles on this object
          const existing = this.particles.get(cmd.objectId as string);
          if (existing) {
            ParticleAdapter.dispose(existing);
          }
          const ps = ParticleAdapter.create(mesh, config, this.scene);
          this.particles.set(cmd.objectId as string, ps);
        }
        break;
      }

      case 'stopParticles': {
        const objectId = cmd.objectId as string;
        const ps = this.particles.get(objectId);
        if (ps) {
          ParticleAdapter.dispose(ps);
          this.particles.delete(objectId);
        }
        break;
      }

      case 'playSound': {
        const mesh = this.objectRegistry.get(cmd.objectId as string);
        const sound = cmd.sound as string | undefined;
        const volume = (cmd.volume as number) ?? 1.0;
        const loop = (cmd.loop as boolean) ?? false;
        if (sound) {
          if (UUID_RE.test(sound)) {
            if (__DEV__) console.log(`[GlitchBridge] Skipping UUID sound: ${sound.slice(0, 8)}...`);
          } else {
            // Stop existing sound on this object
            const existingSound = this.sounds.get(cmd.objectId as string);
            if (existingSound) {
              existingSound.stop();
              existingSound.dispose();
            }
            const s = new Sound(
              `sound_${cmd.objectId}`,
              sound,
              this.scene,
              null,
              {
                loop,
                volume,
                autoplay: true,
                spatialSound: !!mesh,
                distanceModel: 'linear',
                maxDistance: 20,
              },
            );
            if (mesh) {
              s.attachToMesh(mesh);
            }
            this.sounds.set(cmd.objectId as string, s);
          }
        }
        break;
      }

      case 'stopSound': {
        const objectId = cmd.objectId as string;
        const s = this.sounds.get(objectId);
        if (s) {
          s.stop();
          s.dispose();
          this.sounds.delete(objectId);
        }
        break;
      }

      // === Unsupported (Phase 3+) — log and ignore ===
      default:
        if (__DEV__) console.log(`[GlitchBridge] Unsupported command: ${cmd.type}`);
        break;
    }
  }

  /**
   * Reset the scene — dispose all script-created objects.
   */
  reset(): void {
    this.floatingText.clear();
    for (const ps of this.particles.values()) {
      ParticleAdapter.dispose(ps);
    }
    this.particles.clear();
    for (const s of this.sounds.values()) {
      s.stop();
      s.dispose();
    }
    this.sounds.clear();
    this.objectRegistry.clear();
  }

  /**
   * Wire Babylon.js pointer events to touch event messages.
   */
  private setupTouchEvents(): void {
    this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
      let eventType: string;
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        eventType = 'touchStart';
      } else if (pointerInfo.type === PointerEventTypes.POINTERUP) {
        eventType = 'touchEnd';
      } else {
        return;
      }

      const pickResult = pointerInfo.pickInfo;
      if (!pickResult?.hit || !pickResult.pickedMesh) return;

      const mesh = pickResult.pickedMesh;
      const objectId = mesh.metadata?.objectId as string | undefined;
      if (!objectId) return;

      this.eventSender({
        type: 'scripter_event',
        source: 'glitch',
        envelope: {
          objectId,
          event: {
            type: eventType,
            agentId: 'preview-user',
            agentName: 'Preview User',
            position: pickResult.pickedPoint
              ? { x: pickResult.pickedPoint.x, y: pickResult.pickedPoint.y, z: pickResult.pickedPoint.z }
              : { x: 0, y: 0, z: 0 },
          },
        },
      });
    });
  }

  getObjectRegistry(): ObjectRegistry {
    return this.objectRegistry;
  }

  dispose(): void {
    if (this.pointerObserver) {
      this.scene.onPointerObservable.remove(this.pointerObserver);
      this.pointerObserver = null;
    }
    for (const ps of this.particles.values()) {
      ParticleAdapter.dispose(ps);
    }
    this.particles.clear();
    for (const s of this.sounds.values()) {
      s.stop();
      s.dispose();
    }
    this.sounds.clear();
    this.floatingText.dispose();
    this.objectRegistry.dispose();
    this.primFactory.dispose();
  }
}
