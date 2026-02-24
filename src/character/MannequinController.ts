import { Scene, Vector3, Ray } from '@babylonjs/core';
import type { Mannequin } from './Mannequin.js';
import type { MovementState } from '../types/index.js';

const WALK_SPEED = 3.0;
const RUN_SPEED = 7.0;
const FLY_SPEED = 3.0;
const BACKWARD_MULTIPLIER = 0.7;
const STRAFE_MULTIPLIER = 0.8;
const GRAVITY = -9.81;
const ROTATION_SPEED = 3.0; // radians/sec — smooth but responsive
const JUMP_ANIM_DURATION = 1.0; // seconds — animation handles the visual jump

/**
 * WASD character controller.
 * Movement is player-relative (matching World's pattern):
 *   W/S = forward/backward in facing direction
 *   A/D + W/S = turn while moving
 *   A/D alone = strafe sideways
 */
export class MannequinController {
  private mannequin: Mannequin;
  private scene: Scene;

  private velocity = Vector3.Zero();
  private isGrounded = true;
  private isFlying = false;
  private jumpRequested = false;
  private isPlayingJump = false;
  private jumpAnimTimer = 0;

  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false,
    jump: false,
  };

  private keydownHandler: (e: KeyboardEvent) => void;
  private keyupHandler: (e: KeyboardEvent) => void;

  // Reusable vectors (GC prevention)
  private _rayOrigin = Vector3.Zero();
  private _debugJumpFrame = 0;

  constructor(mannequin: Mannequin, scene: Scene) {
    this.mannequin = mannequin;
    this.scene = scene;

    this.keydownHandler = (e: KeyboardEvent): void => this.onKeyDown(e);
    this.keyupHandler = (e: KeyboardEvent): void => this.onKeyUp(e);
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);

    // Register update on before-render
    this.scene.registerBeforeRender(() => {
      const dt = this.scene.getEngine().getDeltaTime() / 1000;
      this.update(dt);
    });
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
      case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
      case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
      case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.shift = true; break;
      case 'Space':
        this.keys.jump = true;
        if (this.isGrounded && !this.isFlying) {
          this.jumpRequested = true;
        }
        e.preventDefault();
        break;
      case 'KeyE':
        if (this.isFlying) {
          // Exit flight — gravity will take over
          this.isFlying = false;
          console.log('[Glitch][Fly] EXIT');
        } else {
          // Enter flight — initial upward boost to clear ground
          this.isFlying = true;
          this.isGrounded = false;
          this.velocity.y = FLY_SPEED;
          this.isPlayingJump = false; // cancel jump if mid-jump
          console.log('[Glitch][Fly] ENTER');
        }
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
      case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
      case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
      case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.shift = false; break;
      case 'Space': this.keys.jump = false; break;
    }
  }

  private update(dt: number): void {
    const pos = this.mannequin.getPosition();
    const root = this.mannequin.getRootNode();
    const speed = this.isFlying ? WALK_SPEED : (this.keys.shift ? RUN_SPEED : WALK_SPEED);
    const movingForwardOrBack = this.keys.forward || this.keys.backward;

    // Rotation: A/D turn when W/S is held
    if (movingForwardOrBack) {
      let rotateY = 0;
      if (this.keys.left) rotateY = -ROTATION_SPEED * dt;
      if (this.keys.right) rotateY = ROTATION_SPEED * dt;
      if (rotateY !== 0) {
        root.rotation.y += rotateY;
      }
    }

    // Compute forward direction from player facing
    const facing = root.rotation.y;
    const forwardX = Math.sin(facing);
    const forwardZ = Math.cos(facing);
    // Right vector (perpendicular to forward on XZ plane)
    const rightX = Math.cos(facing);
    const rightZ = -Math.sin(facing);

    // Accumulate movement in player-relative directions
    let moveX = 0;
    let moveZ = 0;

    if (this.keys.forward) {
      moveX += forwardX * speed;
      moveZ += forwardZ * speed;
    }
    if (this.keys.backward) {
      moveX -= forwardX * speed * BACKWARD_MULTIPLIER;
      moveZ -= forwardZ * speed * BACKWARD_MULTIPLIER;
    }

    // Strafe: A/D alone (no forward/back held)
    if (!movingForwardOrBack) {
      if (this.keys.left) {
        moveX -= rightX * speed * STRAFE_MULTIPLIER;
        moveZ -= rightZ * speed * STRAFE_MULTIPLIER;
      }
      if (this.keys.right) {
        moveX += rightX * speed * STRAFE_MULTIPLIER;
        moveZ += rightZ * speed * STRAFE_MULTIPLIER;
      }
    }

    const hasInput = moveX !== 0 || moveZ !== 0;

    if (hasInput) {
      this.velocity.x = moveX;
      this.velocity.z = moveZ;
    } else {
      // Decelerate horizontal
      this.velocity.x *= Math.max(0, 1 - 10 * dt);
      this.velocity.z *= Math.max(0, 1 - 10 * dt);
      if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
    }

    // Flight vertical movement: Space=ascend, Shift=descend
    if (this.isFlying) {
      if (this.keys.jump) {
        this.velocity.y = FLY_SPEED;
      } else if (this.keys.shift) {
        this.velocity.y = -FLY_SPEED;
      } else {
        // Decelerate vertical when no input
        this.velocity.y *= Math.max(0, 1 - 10 * dt);
        if (Math.abs(this.velocity.y) < 0.01) this.velocity.y = 0;
      }
    }

    // Jump — animation-only (the Jump animation handles vertical motion visually)
    if (this.jumpRequested && this.isGrounded && !this.isPlayingJump && !this.isFlying) {
      this.isPlayingJump = true;
      this.jumpAnimTimer = 0;
      this.jumpRequested = false;
      console.log(`[Glitch][Jump] PLAY: pos.y=${pos.y.toFixed(3)}`);
    }
    if (this.isPlayingJump) {
      this.jumpAnimTimer += dt;
      if (this.jumpAnimTimer >= JUMP_ANIM_DURATION) {
        this.isPlayingJump = false;
        console.log(`[Glitch][Jump] DONE: timer=${this.jumpAnimTimer.toFixed(2)}s`);
      }
    }

    // Gravity (only for actual falling — not jumps, not flight)
    if (!this.isGrounded && !this.isFlying) {
      this.velocity.y += GRAVITY * dt;
    }

    // Apply velocity
    pos.x += this.velocity.x * dt;
    if (!this.isPlayingJump || this.isFlying) {
      pos.y += this.velocity.y * dt;
    }
    pos.z += this.velocity.z * dt;

    // Ground raycast — only check the grid floor (not mannequin's own meshes)
    this._rayOrigin.set(pos.x, pos.y + 1.0, pos.z);
    const ray = new Ray(this._rayOrigin, Vector3.Down(), 2.0);
    const pick = this.scene.pickWithRay(ray, (mesh) => mesh.name === 'grid');

    if (pick?.hit && pick.pickedPoint) {
      const groundY = pick.pickedPoint.y;
      if (pos.y <= groundY) {
        if (this.isFlying) {
          // Only auto-exit flight when descending toward ground
          if (this.velocity.y <= 0) {
            this.isFlying = false;
            console.log(`[Glitch][Fly] GROUND EXIT: pos.y=${pos.y.toFixed(3)} groundY=${groundY.toFixed(3)}`);
          }
          // Don't snap to ground while taking off
        }
        if (!this.isFlying) {
          if (!this.isGrounded) {
            console.log(`[Glitch][Jump] LAND: vel.y=${this.velocity.y.toFixed(2)} pos.y=${pos.y.toFixed(3)} groundY=${groundY.toFixed(3)}`);
          }
          pos.y = groundY;
          this.velocity.y = 0;
          this.isGrounded = true;
        }
      }
    } else {
      if (!this.isGrounded && !this.isFlying && this._debugJumpFrame++ % 30 === 0) {
        console.log(`[Glitch][Jump] AIRBORNE: vel.y=${this.velocity.y.toFixed(2)} pos.y=${pos.y.toFixed(3)} rayHit=false`);
      }
      if (pos.y < -50) {
        // Safety net: respawn at origin if fallen through
        pos.set(0, 5, 0);
        this.velocity.set(0, 0, 0);
        this.isFlying = false;
      }
    }

    this.mannequin.setPosition(pos);
  }

  getMovementState(): MovementState {
    if (this.isFlying) return 'flying';
    if (this.isPlayingJump) return 'jumping';
    if (!this.isGrounded && this.velocity.y <= 0) return 'falling';
    const hSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    if (hSpeed < 0.1) return 'idle';
    if (this.keys.shift && hSpeed > 0.1) return 'running';
    return 'walking';
  }

  getIsGrounded(): boolean {
    return this.isGrounded;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
  }
}
