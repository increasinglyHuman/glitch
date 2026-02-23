import type { GlitchConfig, GlitchSpawnPayload, GlitchType, CameraMode, Vec3 } from '../types/index.js';
import { VALID_GLITCH_TYPES, VALID_CAMERA_MODES, GLITCH_DEFAULTS, BASE_DEFAULTS } from '../types/index.js';

export function isValidGlitchType(value: unknown): value is GlitchType {
  return typeof value === 'string' && VALID_GLITCH_TYPES.includes(value as GlitchType);
}

export function isValidCameraMode(value: unknown): value is CameraMode {
  return typeof value === 'string' && VALID_CAMERA_MODES.includes(value as CameraMode);
}

export function isValidVec3(value: unknown): value is Vec3 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.x === 'number' && typeof v.y === 'number' && typeof v.z === 'number'
    && isFinite(v.x as number) && isFinite(v.y as number) && isFinite(v.z as number);
}

/**
 * Parse and validate a spawn payload into a fully-resolved GlitchConfig.
 * Applies type-specific defaults, then merges payload fields over them.
 * Throws on invalid input with descriptive error messages.
 */
export function parseSpawnPayload(data: unknown): GlitchConfig {
  if (!data || typeof data !== 'object') {
    throw new Error('Spawn payload must be a non-null object');
  }

  const payload = data as GlitchSpawnPayload;

  if (!isValidGlitchType(payload.glitchType)) {
    throw new Error(
      `Invalid glitchType: "${String(payload.glitchType)}". ` +
      `Must be one of: ${VALID_GLITCH_TYPES.join(', ')}`,
    );
  }

  const typeDefaults = GLITCH_DEFAULTS[payload.glitchType];

  // Build config: base defaults → type defaults → payload values
  const config: GlitchConfig = {
    ...BASE_DEFAULTS,
    ...typeDefaults,
    glitchType: payload.glitchType,
  };

  if (payload.label !== undefined) {
    if (typeof payload.label !== 'string') {
      throw new Error('label must be a string');
    }
    config.label = payload.label;
  }

  if (payload.spawnPoint !== undefined) {
    if (!isValidVec3(payload.spawnPoint)) {
      throw new Error('spawnPoint must be { x: number, y: number, z: number } with finite values');
    }
    config.spawnPoint = { ...payload.spawnPoint };
  }

  if (payload.spawnRotation !== undefined) {
    if (typeof payload.spawnRotation !== 'number' || !isFinite(payload.spawnRotation)) {
      throw new Error('spawnRotation must be a finite number');
    }
    config.spawnRotation = payload.spawnRotation;
  }

  if (payload.camera !== undefined) {
    if (payload.camera && typeof payload.camera === 'object') {
      if (payload.camera.mode !== undefined) {
        if (!isValidCameraMode(payload.camera.mode)) {
          throw new Error(
            `Invalid camera.mode: "${String(payload.camera.mode)}". Must be "orbit" or "ots"`,
          );
        }
        config.cameraMode = payload.camera.mode;
      }
      if (payload.camera.distance !== undefined) {
        if (typeof payload.camera.distance !== 'number' || !isFinite(payload.camera.distance) || payload.camera.distance <= 0) {
          throw new Error('camera.distance must be a positive finite number');
        }
        config.cameraDistance = payload.camera.distance;
      }
    }
  }

  if (payload.options !== undefined) {
    if (payload.options && typeof payload.options === 'object') {
      if (payload.options.showGrid !== undefined) {
        config.showGrid = Boolean(payload.options.showGrid);
      }
      if (payload.options.ambient !== undefined) {
        if (typeof payload.options.ambient !== 'string') {
          throw new Error('options.ambient must be a hex color string');
        }
        config.ambientColor = payload.options.ambient;
      }
    }
  }

  return config;
}
