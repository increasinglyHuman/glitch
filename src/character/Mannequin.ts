import {
  Scene,
  TransformNode,
  Vector3,
  SceneLoader,
} from '@babylonjs/core';
import type { AnimationGroup, AbstractMesh } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { Vec3 } from '../types/index.js';

// Combined GLB with mesh + skeleton + all 8 animations.
// TODO: Switch to split jbdModel.glb + jbdAnimations.glb once Animator
// preserves skin joint references in separated exports.
const MODEL_PATH = 'models/animations/';
const MODEL_FILE = 'jbd-bot.glb';

/**
 * Loads the mannequin GLB model with embedded animations.
 * Mixamo skeleton (65 joints, mixamorigHips root).
 */
export class Mannequin {
  private root: TransformNode;
  private scene: Scene;
  private meshes: AbstractMesh[] = [];
  private animationGroups: AnimationGroup[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    this.root = new TransformNode('mannequin', scene);
  }

  async load(spawnPoint: Vec3, spawnRotation: number): Promise<void> {
    const result = await SceneLoader.ImportMeshAsync(
      '',
      MODEL_PATH,
      MODEL_FILE,
      this.scene,
    );

    // Parent all loaded meshes under our root node
    for (const mesh of result.meshes) {
      if (!mesh.parent) {
        mesh.parent = this.root;
      }
    }

    this.meshes = result.meshes;
    this.animationGroups = result.animationGroups;

    // Stop all animations initially (AnimationManager will control them)
    for (const group of this.animationGroups) {
      group.stop();
    }

    if (__DEV__) {
      console.log('[Glitch] Mannequin animations:', this.animationGroups.map((g) => g.name));
    }

    // Position at spawn point
    this.root.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
    this.root.rotation.y = spawnRotation;
  }

  getAnimationGroups(): AnimationGroup[] {
    return this.animationGroups;
  }

  getRootNode(): TransformNode {
    return this.root;
  }

  getPosition(): Vector3 {
    return this.root.position;
  }

  setPosition(pos: Vector3): void {
    this.root.position.copyFrom(pos);
  }

  getEyeHeight(): number {
    return 1.7;
  }

  dispose(): void {
    for (const group of this.animationGroups) {
      group.dispose();
    }
    this.animationGroups.length = 0;

    for (const mesh of this.meshes) {
      mesh.dispose();
    }
    this.meshes.length = 0;

    this.root.dispose();
  }
}
