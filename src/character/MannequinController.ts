import { Scene, Vector3, Ray } from '@babylonjs/core';
import type { Mannequin } from './Mannequin.js';
import type { MovementState } from '../types/index.js';

const WALK_SPEED = 3.0;
const RUN_SPEED = 7.0;
const JUMP_IMPULSE = 5.0;
const GRAVITY = -9.81;
const ROTATION_SPEED = 8.0;

/**
 * WASD character controller with gravity and ground raycast.
 */
export class MannequinController {
  private mannequin: Mannequin;
  private scene: Scene;

  private velocity = Vector3.Zero();
  private isGrounded = true;
  private jumpRequested = false;

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
  private _moveDir = Vector3.Zero();
  private _rayOrigin = Vector3.Zero();

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
        if (this.isGrounded) {
          this.jumpRequested = true;
        }
        e.preventDefault();
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
    }
  }

  private update(dt: number): void {
    const pos = this.mannequin.getPosition();
    const root = this.mannequin.getRootNode();
    const speed = this.keys.shift ? RUN_SPEED : WALK_SPEED;

    // Compute movement direction relative to mannequin facing
    let inputX = 0;
    let inputZ = 0;
    if (this.keys.forward) inputZ += 1;
    if (this.keys.backward) inputZ -= 1;
    if (this.keys.left) inputX -= 1;
    if (this.keys.right) inputX += 1;

    const hasInput = inputX !== 0 || inputZ !== 0;

    if (hasInput) {
      // Determine facing angle from camera-relative input
      const camera = this.scene.activeCamera;
      if (camera) {
        // Get camera forward on XZ plane
        const camForward = camera.getForwardRay().direction;
        const camAngle = Math.atan2(camForward.x, camForward.z);
        const inputAngle = Math.atan2(inputX, inputZ);
        const targetAngle = camAngle + inputAngle;

        // Smooth rotation
        let angleDiff = targetAngle - root.rotation.y;
        angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
        root.rotation.y += angleDiff * Math.min(1, ROTATION_SPEED * dt);
      }

      // Move in mannequin's forward direction
      const facing = root.rotation.y;
      this._moveDir.set(Math.sin(facing) * speed, 0, Math.cos(facing) * speed);
      this.velocity.x = this._moveDir.x;
      this.velocity.z = this._moveDir.z;
    } else {
      // Decelerate horizontal
      this.velocity.x *= Math.max(0, 1 - 10 * dt);
      this.velocity.z *= Math.max(0, 1 - 10 * dt);
      if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
    }

    // Jump
    if (this.jumpRequested && this.isGrounded) {
      this.velocity.y = JUMP_IMPULSE;
      this.isGrounded = false;
      this.jumpRequested = false;
    }

    // Gravity
    if (!this.isGrounded) {
      this.velocity.y += GRAVITY * dt;
    }

    // Apply velocity
    pos.x += this.velocity.x * dt;
    pos.y += this.velocity.y * dt;
    pos.z += this.velocity.z * dt;

    // Ground raycast
    this._rayOrigin.set(pos.x, pos.y + 1.0, pos.z);
    const ray = new Ray(this._rayOrigin, Vector3.Down(), 2.0);
    const pick = this.scene.pickWithRay(ray, (mesh) => mesh.name === 'grid' || mesh.isPickable);

    if (pick?.hit && pick.pickedPoint) {
      const groundY = pick.pickedPoint.y;
      if (pos.y <= groundY) {
        pos.y = groundY;
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    } else if (pos.y < -50) {
      // Safety net: respawn at origin if fallen through
      pos.set(0, 5, 0);
      this.velocity.set(0, 0, 0);
    }

    this.mannequin.setPosition(pos);
  }

  getMovementState(): MovementState {
    if (!this.isGrounded && this.velocity.y > 0) return 'jumping';
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
