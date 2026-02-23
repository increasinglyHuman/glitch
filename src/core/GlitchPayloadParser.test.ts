import { describe, it, expect } from 'vitest';
import {
  parseSpawnPayload,
  isValidGlitchType,
  isValidCameraMode,
  isValidVec3,
} from './GlitchPayloadParser.js';

describe('GlitchPayloadParser', () => {
  describe('isValidGlitchType', () => {
    it('accepts all valid types', () => {
      expect(isValidGlitchType('terraformer')).toBe(true);
      expect(isValidGlitchType('landscaper')).toBe(true);
      expect(isValidGlitchType('scripter')).toBe(true);
      expect(isValidGlitchType('animator')).toBe(true);
      expect(isValidGlitchType('generic')).toBe(true);
    });

    it('rejects invalid types', () => {
      expect(isValidGlitchType('unknown')).toBe(false);
      expect(isValidGlitchType('')).toBe(false);
      expect(isValidGlitchType(42)).toBe(false);
      expect(isValidGlitchType(null)).toBe(false);
      expect(isValidGlitchType(undefined)).toBe(false);
    });
  });

  describe('isValidCameraMode', () => {
    it('accepts orbit and ots', () => {
      expect(isValidCameraMode('orbit')).toBe(true);
      expect(isValidCameraMode('ots')).toBe(true);
    });

    it('rejects invalid modes', () => {
      expect(isValidCameraMode('first-person')).toBe(false);
      expect(isValidCameraMode(123)).toBe(false);
    });
  });

  describe('isValidVec3', () => {
    it('accepts valid vec3', () => {
      expect(isValidVec3({ x: 0, y: 0, z: 0 })).toBe(true);
      expect(isValidVec3({ x: -5.5, y: 100, z: 0.001 })).toBe(true);
    });

    it('rejects invalid vec3', () => {
      expect(isValidVec3(null)).toBe(false);
      expect(isValidVec3({ x: 1, y: 2 })).toBe(false);
      expect(isValidVec3({ x: NaN, y: 0, z: 0 })).toBe(false);
      expect(isValidVec3({ x: Infinity, y: 0, z: 0 })).toBe(false);
      expect(isValidVec3({ x: 'a', y: 0, z: 0 })).toBe(false);
    });
  });

  describe('parseSpawnPayload', () => {
    it('parses minimal terraformer payload with type defaults', () => {
      const config = parseSpawnPayload({ glitchType: 'terraformer' });
      expect(config.glitchType).toBe('terraformer');
      expect(config.cameraMode).toBe('ots');
      expect(config.showGrid).toBe(false);
      expect(config.label).toBe('Glitch');
      expect(config.spawnPoint).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('parses minimal generic payload with type defaults', () => {
      const config = parseSpawnPayload({ glitchType: 'generic' });
      expect(config.cameraMode).toBe('orbit');
      expect(config.showGrid).toBe(true);
    });

    it('parses all five glitch types', () => {
      for (const type of ['terraformer', 'landscaper', 'scripter', 'animator', 'generic']) {
        const config = parseSpawnPayload({ glitchType: type });
        expect(config.glitchType).toBe(type);
      }
    });

    it('overrides defaults with payload values', () => {
      const config = parseSpawnPayload({
        glitchType: 'terraformer',
        label: 'Canyon Preview',
        spawnPoint: { x: 128, y: 10, z: 128 },
        spawnRotation: Math.PI,
        camera: { mode: 'orbit', distance: 20 },
        options: { showGrid: true, ambient: '#ff0000' },
      });
      expect(config.label).toBe('Canyon Preview');
      expect(config.spawnPoint).toEqual({ x: 128, y: 10, z: 128 });
      expect(config.spawnRotation).toBe(Math.PI);
      expect(config.cameraMode).toBe('orbit');
      expect(config.cameraDistance).toBe(20);
      expect(config.showGrid).toBe(true);
      expect(config.ambientColor).toBe('#ff0000');
    });

    it('ignores extra fields', () => {
      const config = parseSpawnPayload({
        glitchType: 'generic',
        unknownField: 'ignored',
        terrain: { heightmap: 'data' },
      });
      expect(config.glitchType).toBe('generic');
    });

    it('throws on null input', () => {
      expect(() => parseSpawnPayload(null)).toThrow('non-null object');
    });

    it('throws on non-object input', () => {
      expect(() => parseSpawnPayload('string')).toThrow('non-null object');
      expect(() => parseSpawnPayload(42)).toThrow('non-null object');
    });

    it('throws on missing glitchType', () => {
      expect(() => parseSpawnPayload({})).toThrow('Invalid glitchType');
    });

    it('throws on invalid glitchType', () => {
      expect(() => parseSpawnPayload({ glitchType: 'invalid' })).toThrow('Invalid glitchType');
    });

    it('throws on non-string label', () => {
      expect(() => parseSpawnPayload({ glitchType: 'generic', label: 42 })).toThrow(
        'label must be a string',
      );
    });

    it('throws on invalid spawnPoint', () => {
      expect(() =>
        parseSpawnPayload({ glitchType: 'generic', spawnPoint: { x: NaN, y: 0, z: 0 } }),
      ).toThrow('spawnPoint');
    });

    it('throws on invalid spawnRotation', () => {
      expect(() =>
        parseSpawnPayload({ glitchType: 'generic', spawnRotation: Infinity }),
      ).toThrow('spawnRotation');
    });

    it('throws on invalid camera.mode', () => {
      expect(() =>
        parseSpawnPayload({ glitchType: 'generic', camera: { mode: 'fps' } }),
      ).toThrow('Invalid camera.mode');
    });

    it('throws on invalid camera.distance', () => {
      expect(() =>
        parseSpawnPayload({ glitchType: 'generic', camera: { distance: -5 } }),
      ).toThrow('camera.distance');
      expect(() =>
        parseSpawnPayload({ glitchType: 'generic', camera: { distance: 0 } }),
      ).toThrow('camera.distance');
    });

    it('does not mutate the original spawnPoint', () => {
      const original = { x: 1, y: 2, z: 3 };
      const config = parseSpawnPayload({ glitchType: 'generic', spawnPoint: original });
      config.spawnPoint.x = 999;
      expect(original.x).toBe(1);
    });
  });
});
