import type { AbstractMesh } from '@babylonjs/core';

/**
 * Maps objectId → Babylon.js Mesh for script-created prims.
 *
 * Every mesh registered here has `mesh.metadata.objectId` set.
 * Used by GlitchScriptBridge to look up meshes when processing commands.
 */
export class ObjectRegistry {
  private meshes = new Map<string, AbstractMesh>();

  register(objectId: string, mesh: AbstractMesh): void {
    // Clean up existing mesh with same ID
    const existing = this.meshes.get(objectId);
    if (existing && !existing.isDisposed()) {
      existing.dispose();
    }

    mesh.metadata = { ...mesh.metadata, objectId };
    this.meshes.set(objectId, mesh);
  }

  get(objectId: string): AbstractMesh | undefined {
    const mesh = this.meshes.get(objectId);
    if (mesh && mesh.isDisposed()) {
      this.meshes.delete(objectId);
      return undefined;
    }
    return mesh;
  }

  remove(objectId: string): boolean {
    const mesh = this.meshes.get(objectId);
    if (!mesh) return false;

    if (!mesh.isDisposed()) {
      mesh.dispose();
    }
    this.meshes.delete(objectId);
    return true;
  }

  has(objectId: string): boolean {
    return this.get(objectId) !== undefined;
  }

  get size(): number {
    return this.meshes.size;
  }

  clear(): void {
    for (const [id, mesh] of this.meshes) {
      if (!mesh.isDisposed()) {
        mesh.dispose();
      }
      this.meshes.delete(id);
    }
  }

  /** All registered objectIds (for iteration) */
  keys(): IterableIterator<string> {
    return this.meshes.keys();
  }

  dispose(): void {
    this.clear();
  }
}
