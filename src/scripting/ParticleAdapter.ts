import {
  ParticleSystem,
  Color4,
  Vector3,
  Texture,
  type AbstractMesh,
  type Scene,
} from '@babylonjs/core';

/**
 * ParticleAdapter — Maps LSL PSYS_* particle config to Babylon.js ParticleSystem.
 *
 * LSL particle configs are Record<string, unknown> where keys are PSYS_* constant
 * values (string numbers: "0", "1", ...). The transpiler constants.ts defines:
 *
 *   PSYS_PART_FLAGS: "0"
 *   PSYS_PART_START_COLOR: "1"    → color1 (Color4)
 *   PSYS_PART_START_ALPHA: "2"    → color1.a
 *   PSYS_PART_END_COLOR: "3"      → color2 (Color4)
 *   PSYS_PART_END_ALPHA: "4"      → color2.a
 *   PSYS_PART_START_SCALE: "5"    → minSize
 *   PSYS_PART_END_SCALE: "6"      → maxSize
 *   PSYS_PART_MAX_AGE: "7"        → maxLifeTime
 *   PSYS_SRC_ACCEL: "8"           → gravity (Vector3)
 *   PSYS_SRC_PATTERN: "9"         → emitter type (drop/explode/angle/cone)
 *   PSYS_SRC_TEXTURE: "12"        → particleTexture
 *   PSYS_SRC_BURST_RATE: "13"     → emitRate
 *   PSYS_SRC_BURST_PART_COUNT: "15" → emitRate multiplier
 *   PSYS_SRC_BURST_RADIUS: "16"   → emit box size
 *   PSYS_SRC_BURST_SPEED_MIN: "17" → minEmitPower
 *   PSYS_SRC_BURST_SPEED_MAX: "18" → maxEmitPower
 *   PSYS_SRC_MAX_AGE: "19"        → targetStopDuration
 *   PSYS_SRC_OMEGA: "21"          → angular speed
 *   PSYS_SRC_ANGLE_BEGIN: "22"    → cone min angle
 *   PSYS_SRC_ANGLE_END: "23"      → cone max angle
 *
 * Pattern values (also strings):
 *   DROP: "1"  EXPLODE: "2"  ANGLE: "4"  ANGLE_CONE: "8"  ANGLE_CONE_EMPTY: "16"
 *
 * @see ADR-005 Phase 2
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

type Vec3Like = { x: number; y: number; z: number };

/**
 * Look up a config parameter by key. The config may use string or numeric keys
 * depending on how the transpiler serialized them.
 */
function getParam<T = unknown>(config: Record<string, unknown>, key: string): T | undefined {
  const val = config[key] ?? config[String(key)];
  return val as T | undefined;
}

function toColor4(color: Vec3Like | undefined, alpha: number): Color4 {
  if (!color) return new Color4(1, 1, 1, alpha);
  return new Color4(color.x, color.y, color.z, alpha);
}

export class ParticleAdapter {
  /**
   * Create a Babylon.js ParticleSystem from an LSL particle config.
   * Attaches the system to the given mesh and starts it.
   */
  static create(
    mesh: AbstractMesh,
    config: Record<string, unknown>,
    scene: Scene,
  ): ParticleSystem {
    const ps = new ParticleSystem(
      `particles_${mesh.metadata?.objectId ?? 'unknown'}`,
      200, // capacity — reasonable default for LSL particle systems
      scene,
    );

    // Emitter
    ps.emitter = mesh;

    // Colors
    const startColor = getParam<Vec3Like>(config, '1');
    const startAlpha = getParam<number>(config, '2') ?? 1.0;
    const endColor = getParam<Vec3Like>(config, '3');
    const endAlpha = getParam<number>(config, '4') ?? 1.0;
    ps.color1 = toColor4(startColor, startAlpha);
    ps.color2 = toColor4(endColor, endAlpha);
    ps.colorDead = new Color4(0, 0, 0, 0);

    // Scale
    const startScale = getParam<Vec3Like>(config, '5');
    const endScale = getParam<Vec3Like>(config, '6');
    ps.minSize = startScale ? startScale.x : 0.1;
    ps.maxSize = endScale ? endScale.x : 0.3;

    // Lifetime
    const partMaxAge = getParam<number>(config, '7');
    ps.minLifeTime = partMaxAge ? partMaxAge * 0.5 : 1.0;
    ps.maxLifeTime = partMaxAge ?? 2.0;

    // Source max age (auto-stop)
    const srcMaxAge = getParam<number>(config, '19');
    if (srcMaxAge && srcMaxAge > 0) {
      ps.targetStopDuration = srcMaxAge;
    }

    // Acceleration / gravity
    const accel = getParam<Vec3Like>(config, '8');
    if (accel) {
      ps.gravity = new Vector3(accel.x, accel.y, accel.z);
    }

    // Burst rate → emit rate
    const burstRate = getParam<number>(config, '13');
    const burstCount = getParam<number>(config, '15') ?? 1;
    if (burstRate && burstRate > 0) {
      ps.emitRate = burstCount / burstRate;
    } else {
      ps.emitRate = 10; // default fallback
    }

    // Speed
    ps.minEmitPower = getParam<number>(config, '17') ?? 0.5;
    ps.maxEmitPower = getParam<number>(config, '18') ?? 1.0;

    // Burst radius → emit box
    const radius = getParam<number>(config, '16') ?? 0;
    if (radius > 0) {
      ps.minEmitBox = new Vector3(-radius, -radius, -radius);
      ps.maxEmitBox = new Vector3(radius, radius, radius);
    }

    // Pattern → emitter direction
    const pattern = String(getParam(config, '9') ?? '2');
    const angleBegin = getParam<number>(config, '22') ?? 0;
    const angleEnd = getParam<number>(config, '23') ?? Math.PI;

    switch (pattern) {
      case '1': // DROP — particles fall straight down
        ps.direction1 = new Vector3(0, -1, 0);
        ps.direction2 = new Vector3(0, -1, 0);
        ps.minEmitPower = 0;
        ps.maxEmitPower = 0;
        if (!accel) ps.gravity = new Vector3(0, -9.8, 0);
        break;
      case '2': // EXPLODE — omnidirectional
        ps.direction1 = new Vector3(-1, -1, -1);
        ps.direction2 = new Vector3(1, 1, 1);
        break;
      case '4':  // ANGLE
      case '8':  // ANGLE_CONE
      case '16': // ANGLE_CONE_EMPTY
        // Use angle range to create a cone-like direction
        ps.direction1 = new Vector3(
          -Math.sin(angleEnd),
          Math.cos(angleBegin),
          -Math.sin(angleEnd),
        );
        ps.direction2 = new Vector3(
          Math.sin(angleEnd),
          Math.cos(angleEnd),
          Math.sin(angleEnd),
        );
        break;
      default:
        // Default to EXPLODE
        ps.direction1 = new Vector3(-1, -1, -1);
        ps.direction2 = new Vector3(1, 1, 1);
        break;
    }

    // Angular speed (omega)
    const omega = getParam<Vec3Like>(config, '21');
    if (omega) {
      ps.minAngularSpeed = Math.min(omega.x, omega.y, omega.z);
      ps.maxAngularSpeed = Math.max(omega.x, omega.y, omega.z);
    }

    // Texture
    const texKey = getParam<string>(config, '12');
    if (texKey && !UUID_RE.test(texKey)) {
      // Only load URL textures — UUIDs can't be resolved in preview
      ps.particleTexture = new Texture(texKey, scene);
    }

    // Particle flags — check for emissive
    const flags = getParam<string>(config, '0');
    if (flags) {
      const f = parseInt(flags, 16) || parseInt(flags, 10) || 0;
      // PSYS_PART_EMISSIVE_MASK = 0x100
      if (f & 0x100) {
        ps.blendMode = ParticleSystem.BLENDMODE_ADD;
      }
    }

    ps.start();
    return ps;
  }

  /**
   * Stop and dispose a particle system.
   */
  static dispose(system: ParticleSystem): void {
    system.stop();
    system.dispose();
  }
}
