import type { AnimationGroup } from '@babylonjs/core';
import type { AnimationState, MovementState } from '../types/index.js';

/**
 * Maps our animation states to GLB animation group names.
 * The GLB contains: Idle, Walk, Jump, Float-fly, Landing, Happy Idle, FlyUp, Walk Backward
 */
const STATE_TO_ANIM: Record<AnimationState, string> = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Walk', // No run animation — use Walk at 1.5x speed
  jump: 'Jump',
  fall: 'Float-fly',
  land: 'Landing',
};

/** Which states should loop vs play once */
const LOOPING_STATES: Set<AnimationState> = new Set(['idle', 'walk', 'run', 'fall']);

/** Speed ratio overrides per state */
const SPEED_RATIOS: Partial<Record<AnimationState, number>> = {
  run: 1.5,
};

/**
 * Animation state machine for the mannequin.
 * Drives actual AnimationGroup playback from the loaded GLB.
 */
export class AnimationManager {
  private currentState: AnimationState = 'idle';

  private animMap: Map<AnimationState, AnimationGroup> = new Map();
  private currentGroup: AnimationGroup | null = null;
  private hasAnimations = false;

  /**
   * Bind GLB animation groups to the state machine.
   * Call after mannequin is loaded. Safe to skip (state machine still works without playback).
   */
  bindAnimations(groups: AnimationGroup[]): void {
    for (const [state, animName] of Object.entries(STATE_TO_ANIM)) {
      const group = groups.find((g) => g.name === animName);
      if (group) {
        this.animMap.set(state as AnimationState, group);
      } else {
        console.warn(`[Glitch] Missing animation "${animName}" for state "${state}"`);
      }
    }

    this.hasAnimations = this.animMap.size > 0;

    // Start with idle
    if (this.hasAnimations) {
      this.playState('idle');
    }
  }

  update(movementState: MovementState, dt: number): void {
    const prev = this.currentState;
    void dt; // reserved for future timed transitions

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
        // Jump animation is self-contained (full arc: up + down).
        // Stay in jump until grounded, then go directly to idle/walk/run.
        // Never transition to fall or land from jump.
        if (movementState === 'idle' || movementState === 'walking' || movementState === 'running') {
          if (movementState === 'walking') this.currentState = 'walk';
          else if (movementState === 'running') this.currentState = 'run';
          else this.currentState = 'idle';
        }
        break;

      case 'fall':
        // Fall (Float-fly) is for walking off ledges, not post-jump.
        // Go directly to idle/walk/run when grounded.
        if (movementState === 'idle' || movementState === 'walking' || movementState === 'running') {
          if (movementState === 'walking') this.currentState = 'walk';
          else if (movementState === 'running') this.currentState = 'run';
          else this.currentState = 'idle';
        }
        break;

      case 'land':
        // Landing is reserved for flight → ground (future).
        // For now, immediately transition to grounded state.
        if (movementState === 'walking') this.currentState = 'walk';
        else if (movementState === 'running') this.currentState = 'run';
        else this.currentState = 'idle';
        break;
    }

    if (this.currentState !== prev) {
      console.log(`[Glitch] Animation: ${prev} → ${this.currentState}`);
      if (this.hasAnimations) {
        this.playState(this.currentState);
      }
    }
  }

  private playState(state: AnimationState): void {
    const nextGroup = this.animMap.get(state);
    if (!nextGroup) return;

    const shouldLoop = LOOPING_STATES.has(state);
    const speedRatio = SPEED_RATIOS[state] ?? 1.0;

    console.log(`[Glitch][Anim] playState("${state}"): group="${nextGroup.name}" loop=${shouldLoop} speed=${speedRatio} isStarted=${nextGroup.isStarted} loopAnimation=${nextGroup.loopAnimation}`);

    // Crossfade: blend out current, blend in next
    if (this.currentGroup && this.currentGroup !== nextGroup) {
      const outgoing = this.currentGroup;
      console.log(`[Glitch][Anim] crossfade: "${outgoing.name}" → "${nextGroup.name}"`);

      // Stop outgoing immediately, then start next — simpler than weight blending
      outgoing.stop();
      nextGroup.start(shouldLoop, speedRatio);
    } else {
      nextGroup.start(shouldLoop, speedRatio);
    }

    nextGroup.setWeightForAllAnimatables(1.0);
    this.currentGroup = nextGroup;
  }

  getCurrentState(): AnimationState {
    return this.currentState;
  }

  dispose(): void {
    this.currentGroup = null;
    this.animMap.clear();
  }
}
