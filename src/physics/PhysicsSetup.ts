import type { Scene } from '@babylonjs/core';

/**
 * Phase 1 physics: stub module.
 * Gravity and ground collision are handled directly by MannequinController
 * via raycast. Full Cannon.js integration comes in Phase 2 when objects arrive.
 */
export class PhysicsSetup {
  constructor(_scene: Scene) {
    // No physics engine initialization in Phase 1.
    // MannequinController handles gravity + ground raycast directly.
  }

  dispose(): void {
    // Nothing to dispose in Phase 1
  }
}
