import {
  Scene,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
} from '@babylonjs/core';

/**
 * Minimal lighting for Glitch: hemisphere fill + directional sun.
 * No environment map in Phase 1 (PBR not needed for grey mannequin).
 */
export class LightingSetup {
  private hemisphere: HemisphericLight;
  private sun: DirectionalLight;

  constructor(scene: Scene) {
    // Cool blue-grey ambient fill (brighter for visibility)
    this.hemisphere = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    this.hemisphere.intensity = 0.7;
    this.hemisphere.diffuse = new Color3(0.85, 0.88, 0.95);
    this.hemisphere.groundColor = new Color3(0.3, 0.28, 0.25);

    // Warm directional sun (brighter)
    this.sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.3).normalize(), scene);
    this.sun.intensity = 1.2;
    this.sun.diffuse = new Color3(1.0, 0.97, 0.92);
  }

  dispose(): void {
    this.hemisphere.dispose();
    this.sun.dispose();
  }
}
