import type { AnimationState, MovementState } from '../types/index.js';

/**
 * Animation state machine for the mannequin.
 * Phase 1: logic only (no actual animation playback — placeholder mannequin has no skeleton).
 * State is readable by HUD and external systems.
 */
export class AnimationManager {
  private currentState: AnimationState = 'idle';
  private landTimer = 0;
  private readonly LAND_DURATION = 0.3; // seconds before land → idle

  update(movementState: MovementState, dt: number): void {
    const prev = this.currentState;

    switch (this.currentState) {
      case 'idle':
        if (movementState === 'walking') this.currentState = 'walk';
        else if (movementState === 'running') this.currentState = 'run';
        else if (movementState === 'jumping') this.currentState = 'jump';
        else if (movementState === 'falling') this.currentState = 'fall';
        break;

      case 'walk':
        if (movementState === 'idle') this.currentState = 'idle';
        else if (movementState === 'running') this.currentState = 'run';
        else if (movementState === 'jumping') this.currentState = 'jump';
        else if (movementState === 'falling') this.currentState = 'fall';
        break;

      case 'run':
        if (movementState === 'idle') this.currentState = 'idle';
        else if (movementState === 'walking') this.currentState = 'walk';
        else if (movementState === 'jumping') this.currentState = 'jump';
        else if (movementState === 'falling') this.currentState = 'fall';
        break;

      case 'jump':
        if (movementState === 'falling') this.currentState = 'fall';
        break;

      case 'fall':
        if (movementState === 'idle' || movementState === 'walking' || movementState === 'running') {
          this.currentState = 'land';
          this.landTimer = 0;
        }
        break;

      case 'land':
        this.landTimer += dt;
        if (this.landTimer >= this.LAND_DURATION) {
          if (movementState === 'walking') this.currentState = 'walk';
          else if (movementState === 'running') this.currentState = 'run';
          else this.currentState = 'idle';
        }
        break;
    }

    if (this.currentState !== prev) {
      console.log(`[Glitch] Animation: ${prev} → ${this.currentState}`);
    }
  }

  getCurrentState(): AnimationState {
    return this.currentState;
  }

  dispose(): void {
    // No resources to clean up in Phase 1
  }
}
