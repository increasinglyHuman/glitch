/**
 * poqpoq Glitch — Type Definitions
 *
 * Phase 1 payload types. Only fields used in Phase 1 are defined here.
 * The full GlitchSpawnPayload (terrain, objects, scripts, backpack) will be
 * added in subsequent phases as those features land.
 */

export type GlitchType = 'terraformer' | 'landscaper' | 'scripter' | 'animator' | 'generic';

export type CameraMode = 'orbit' | 'ots';

export type GlitchState = 'idle' | 'loading' | 'running' | 'disposed';

export type MovementState = 'idle' | 'walking' | 'running' | 'jumping' | 'falling';

export type AnimationState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'land';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GlitchSpawnPayload {
  glitchType: GlitchType;
  label?: string;
  spawnPoint?: Vec3;
  spawnRotation?: number;
  camera?: {
    mode: CameraMode;
    distance?: number;
  };
  options?: {
    showGrid?: boolean;
    ambient?: string;
  };
}

export interface GlitchMessage {
  type: 'glitch_spawn' | 'glitch_ready' | 'glitch_close' | 'glitch_error';
  source?: 'glitch' | 'parent';
  payload?: GlitchSpawnPayload;
  error?: string;
}

export interface GlitchConfig {
  glitchType: GlitchType;
  label: string;
  spawnPoint: Vec3;
  spawnRotation: number;
  cameraMode: CameraMode;
  cameraDistance: number;
  showGrid: boolean;
  ambientColor: string;
}

export const VALID_GLITCH_TYPES: readonly GlitchType[] = [
  'terraformer',
  'landscaper',
  'scripter',
  'animator',
  'generic',
] as const;

export const VALID_CAMERA_MODES: readonly CameraMode[] = ['orbit', 'ots'] as const;

export const GLITCH_DEFAULTS: Record<GlitchType, Partial<GlitchConfig>> = {
  terraformer: { cameraMode: 'ots', showGrid: false },
  landscaper: { cameraMode: 'ots', showGrid: false },
  scripter: { cameraMode: 'ots', showGrid: true },
  animator: { cameraMode: 'orbit', showGrid: true },
  generic: { cameraMode: 'orbit', showGrid: true },
};

export const BASE_DEFAULTS: GlitchConfig = {
  glitchType: 'generic',
  label: 'Glitch',
  spawnPoint: { x: 0, y: 0, z: 0 },
  spawnRotation: 0,
  cameraMode: 'orbit',
  cameraDistance: 10,
  showGrid: true,
  ambientColor: '#cccccc',
};
