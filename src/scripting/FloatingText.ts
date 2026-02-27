import {
  Scene,
  MeshBuilder,
  DynamicTexture,
  StandardMaterial,
  Mesh,
  Color3,
  type AbstractMesh,
} from '@babylonjs/core';

const TEXT_PLANE_HEIGHT = 0.3;
const TEXT_PLANE_WIDTH = 2.0;
const TEXTURE_WIDTH = 512;
const TEXTURE_HEIGHT = 64;
const FONT = 'bold 28px monospace';
const OFFSET_Y = 0.8; // Above the mesh center

/**
 * Renders llSetText() floating text as a textured plane above a mesh.
 *
 * Each mesh can have at most one floating text plane.
 * Text planes are billboard-mode (always face camera).
 */
export class FloatingText {
  private scene: Scene;
  private textPlanes = new Map<string, { mesh: Mesh; texture: DynamicTexture; material: StandardMaterial }>();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Set or update floating text above a mesh.
   * Pass empty string to remove the text.
   */
  setText(
    objectId: string,
    parentMesh: AbstractMesh,
    text: string,
    color: { x: number; y: number; z: number } = { x: 1, y: 1, z: 1 },
    alpha: number = 1.0,
  ): void {
    // Remove existing text if empty
    if (!text) {
      this.removeText(objectId);
      return;
    }

    let entry = this.textPlanes.get(objectId);

    if (!entry) {
      // Create new text plane
      const texture = new DynamicTexture(`${objectId}_textTex`, {
        width: TEXTURE_WIDTH,
        height: TEXTURE_HEIGHT,
      }, this.scene, false);
      texture.hasAlpha = true;

      const material = new StandardMaterial(`${objectId}_textMat`, this.scene);
      material.diffuseTexture = texture;
      material.emissiveColor = new Color3(1, 1, 1);
      material.disableLighting = true;
      material.backFaceCulling = false;

      const plane = MeshBuilder.CreatePlane(`${objectId}_text`, {
        width: TEXT_PLANE_WIDTH,
        height: TEXT_PLANE_HEIGHT,
      }, this.scene);
      plane.material = material;
      plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
      plane.isPickable = false;
      plane.parent = parentMesh;
      plane.position.y = OFFSET_Y;

      entry = { mesh: plane, texture, material };
      this.textPlanes.set(objectId, entry);
    }

    // Update text content — cast to full Canvas2D context
    const ctx = entry.texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    ctx.font = FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const r = Math.floor(color.x * 255);
    const g = Math.floor(color.y * 255);
    const b = Math.floor(color.z * 255);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.fillText(text, TEXTURE_WIDTH / 2, TEXTURE_HEIGHT / 2);
    entry.texture.update();

    // Update alpha
    entry.material.alpha = alpha;
    entry.mesh.visibility = alpha;
  }

  removeText(objectId: string): void {
    const entry = this.textPlanes.get(objectId);
    if (!entry) return;

    entry.texture.dispose();
    entry.material.dispose();
    entry.mesh.dispose();
    this.textPlanes.delete(objectId);
  }

  clear(): void {
    for (const [id] of this.textPlanes) {
      this.removeText(id);
    }
  }

  dispose(): void {
    this.clear();
  }
}
