import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
} from '@babylonjs/core';

/**
 * LSL prim type constants (matching LSL PRIM_TYPE_* values).
 */
export const PrimType = {
  BOX: 0,
  CYLINDER: 1,
  PRISM: 2,
  SPHERE: 3,
  TORUS: 4,
  TUBE: 5,
  RING: 6,
  SCULPT: 7,
} as const;

export type PrimTypeValue = (typeof PrimType)[keyof typeof PrimType];

export interface PrimOptions {
  objectId: string;
  primType?: PrimTypeValue;
  name?: string;
  position?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
}

const DEFAULT_COLOR = new Color3(0.5, 0.5, 0.5); // #808080

/**
 * Creates Babylon.js meshes from LSL prim type definitions.
 *
 * Maps the 8 LSL prim types to appropriate MeshBuilder calls.
 * Each prim gets a StandardMaterial, metadata.objectId, and isPickable=true.
 */
export class PrimFactory {
  private scene: Scene;
  private primCount = 0;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  create(options: PrimOptions): Mesh {
    const type = options.primType ?? PrimType.BOX;
    const name = options.name ?? `prim_${this.primCount++}`;

    const mesh = this.buildMesh(type, name);

    // Position
    if (options.position) {
      mesh.position.set(options.position.x, options.position.y, options.position.z);
    }

    // Scale
    if (options.scale) {
      mesh.scaling.set(options.scale.x, options.scale.y, options.scale.z);
    }

    // Material
    const material = new StandardMaterial(`${name}_mat`, this.scene);
    material.diffuseColor = DEFAULT_COLOR.clone();
    material.specularPower = 64;
    mesh.material = material;

    // Metadata + picking
    mesh.metadata = { objectId: options.objectId };
    mesh.isPickable = true;

    return mesh;
  }

  private buildMesh(type: PrimTypeValue, name: string): Mesh {
    switch (type) {
      case PrimType.BOX:
        return MeshBuilder.CreateBox(name, { size: 0.5 }, this.scene);

      case PrimType.SPHERE:
        return MeshBuilder.CreateSphere(name, { diameter: 1.0, segments: 16 }, this.scene);

      case PrimType.CYLINDER:
        return MeshBuilder.CreateCylinder(name, {
          diameter: 0.5,
          height: 1.0,
          tessellation: 24,
        }, this.scene);

      case PrimType.TORUS:
        return MeshBuilder.CreateTorus(name, {
          diameter: 1.0,
          thickness: 0.3,
          tessellation: 24,
        }, this.scene);

      case PrimType.TUBE:
        return MeshBuilder.CreateCylinder(name, {
          diameter: 0.5,
          height: 1.0,
          tessellation: 24,
        }, this.scene);

      case PrimType.RING:
        return MeshBuilder.CreateTorus(name, {
          diameter: 1.0,
          thickness: 0.05,
          tessellation: 32,
        }, this.scene);

      case PrimType.PRISM:
        return MeshBuilder.CreateCylinder(name, {
          diameter: 0.5,
          height: 1.0,
          tessellation: 3, // triangular cross-section
        }, this.scene);

      case PrimType.SCULPT:
        // Placeholder — sculpt maps not supported in preview
        return MeshBuilder.CreateSphere(name, { diameter: 1.0, segments: 16 }, this.scene);

      default:
        return MeshBuilder.CreateBox(name, { size: 0.5 }, this.scene);
    }
  }

  dispose(): void {
    // PrimFactory doesn't own meshes — ObjectRegistry handles disposal
  }
}
