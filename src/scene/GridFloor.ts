import {
  Scene,
  MeshBuilder,
  ShaderMaterial,
  Effect,
  Mesh,
} from '@babylonjs/core';

const GRID_VERTEX = `
  precision highp float;
  attribute vec3 position;
  uniform mat4 worldViewProjection;
  uniform mat4 world;
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = world * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

const GRID_FRAGMENT = `
  precision highp float;
  varying vec3 vWorldPos;

  void main() {
    vec2 coord = vWorldPos.xz;

    // Grid lines at 1m intervals
    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
    float line = min(grid.x, grid.y);
    float smallGrid = 1.0 - min(line, 1.0);

    // Major grid lines every 10m (brighter)
    vec2 grid10 = abs(fract(coord * 0.1 - 0.5) - 0.5) / fwidth(coord * 0.1);
    float line10 = min(grid10.x, grid10.y);
    float majorGrid = 1.0 - min(line10, 1.0);

    // Combine: small grid dimmer, major grid brighter
    float intensity = smallGrid * 0.25 + majorGrid * 0.15;

    // Distance-based alpha falloff
    float dist = length(coord);
    float alpha = intensity * smoothstep(100.0, 30.0, dist);

    gl_FragColor = vec4(vec3(1.0), alpha);
  }
`;

/**
 * Infinite-looking grid floor with alpha falloff.
 * Custom ShaderMaterial avoids @babylonjs/materials dependency.
 */
export class GridFloor {
  private mesh: Mesh;
  private material: ShaderMaterial;

  constructor(scene: Scene) {
    // Register shaders
    Effect.ShadersStore['gridVertexShader'] = GRID_VERTEX;
    Effect.ShadersStore['gridFragmentShader'] = GRID_FRAGMENT;

    this.material = new ShaderMaterial('gridMaterial', scene, 'grid', {
      attributes: ['position'],
      uniforms: ['worldViewProjection', 'world'],
    });
    this.material.backFaceCulling = false;
    this.material.alphaMode = 2; // ALPHA_COMBINE
    this.material.needAlphaBlending = (): boolean => true;

    this.mesh = MeshBuilder.CreateGround('grid', { width: 1000, height: 1000, subdivisions: 1 }, scene);
    this.mesh.material = this.material;
    this.mesh.isPickable = true; // Ground ray-cast target for mannequin
    this.mesh.receiveShadows = true;
  }

  setVisible(visible: boolean): void {
    this.mesh.isVisible = visible;
  }

  getMesh(): Mesh {
    return this.mesh;
  }

  dispose(): void {
    this.material.dispose();
    this.mesh.dispose();
  }
}
