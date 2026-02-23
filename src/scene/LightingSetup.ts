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
    // Cool blue-grey ambient fill
    this.hemisphere = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    this.hemisphere.intensity = 0.4;
    this.hemisphere.diffuse = new Color3(0.8, 0.85, 0.9);
    this.hemisphere.groundColor = new Color3(0.2, 0.18, 0.15);

    // Warm directional sun
    this.sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.3).normalize(), scene);
    this.sun.intensity = 0.8;
    this.sun.diffuse = new Color3(1.0, 0.95, 0.9);
  }

  dispose(): void {
    this.hemisphere.dispose();
    this.sun.dispose();
  }
}
