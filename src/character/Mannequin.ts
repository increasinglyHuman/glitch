import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
} from '@babylonjs/core';
import type { Vec3 } from '../types/index.js';

const GREY = new Color3(0.6, 0.6, 0.6);
const JOINT_GREY = new Color3(0.5, 0.5, 0.5);

/**
 * Phase 1 mannequin: primitive capsule + sphere joints.
 * Replaced by CC0 MakeHuman GLB in a future phase.
 */
export class Mannequin {
  private root: TransformNode;
  private scene: Scene;
  private parts: Mesh[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    this.root = new TransformNode('mannequin', scene);
  }

  async load(spawnPoint: Vec3, _spawnRotation: number): Promise<void> {
    const bodyMat = new StandardMaterial('mannequinBody', this.scene);
    bodyMat.diffuseColor = GREY;
    bodyMat.specularPower = 8;

    const jointMat = new StandardMaterial('mannequinJoint', this.scene);
    jointMat.diffuseColor = JOINT_GREY;
    jointMat.specularPower = 4;

    // Torso capsule (center at y=0.85 from ground, total height ~0.7m)
    const torso = MeshBuilder.CreateCapsule('torso', {
      height: 0.7,
      radius: 0.2,
    }, this.scene);
    torso.position.y = 0.85;
    torso.material = bodyMat;
    torso.parent = this.root;
    this.parts.push(torso);

    // Head sphere (y=1.55)
    const head = MeshBuilder.CreateSphere('head', { diameter: 0.28 }, this.scene);
    head.position.y = 1.55;
    head.material = bodyMat;
    head.parent = this.root;
    this.parts.push(head);

    // Neck joint
    this.addJoint('neck', 0, 1.35, 0, jointMat);

    // Shoulder joints
    this.addJoint('shoulderL', -0.28, 1.2, 0, jointMat);
    this.addJoint('shoulderR', 0.28, 1.2, 0, jointMat);

    // Elbow joints
    this.addJoint('elbowL', -0.28, 0.9, 0, jointMat);
    this.addJoint('elbowR', 0.28, 0.9, 0, jointMat);

    // Upper arms
    this.addLimb('upperArmL', -0.28, 1.05, 0, 0.06, 0.3, bodyMat);
    this.addLimb('upperArmR', 0.28, 1.05, 0, 0.06, 0.3, bodyMat);

    // Lower arms
    this.addLimb('lowerArmL', -0.28, 0.7, 0, 0.055, 0.35, bodyMat);
    this.addLimb('lowerArmR', 0.28, 0.7, 0, 0.055, 0.35, bodyMat);

    // Hip joints
    this.addJoint('hipL', -0.12, 0.5, 0, jointMat);
    this.addJoint('hipR', 0.12, 0.5, 0, jointMat);

    // Upper legs
    this.addLimb('upperLegL', -0.12, 0.32, 0, 0.08, 0.35, bodyMat);
    this.addLimb('upperLegR', 0.12, 0.32, 0, 0.08, 0.35, bodyMat);

    // Knee joints
    this.addJoint('kneeL', -0.12, 0.15, 0, jointMat);
    this.addJoint('kneeR', 0.12, 0.15, 0, jointMat);

    // Lower legs (relative to ground, standing on y=0)
    this.addLimb('lowerLegL', -0.12, -0.08, 0, 0.07, 0.4, bodyMat);
    this.addLimb('lowerLegR', 0.12, -0.08, 0, 0.07, 0.4, bodyMat);

    // Position at spawn point (root y=0 means feet on ground)
    this.root.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
    this.root.rotation.y = _spawnRotation;
  }

  private addJoint(name: string, x: number, y: number, z: number, mat: StandardMaterial): void {
    const joint = MeshBuilder.CreateSphere(name, { diameter: 0.1 }, this.scene);
    joint.position = new Vector3(x, y, z);
    joint.material = mat;
    joint.parent = this.root;
    this.parts.push(joint);
  }

  private addLimb(
    name: string,
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
    mat: StandardMaterial,
  ): void {
    const limb = MeshBuilder.CreateCapsule(name, { height, radius }, this.scene);
    limb.position = new Vector3(x, y, z);
    limb.material = mat;
    limb.parent = this.root;
    this.parts.push(limb);
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
    for (const part of this.parts) {
      part.material?.dispose();
      part.dispose();
    }
    this.parts.length = 0;
    this.root.dispose();
  }
}
