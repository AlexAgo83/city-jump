import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Meshes/instancedMesh";
import { expect, it } from "vitest";
import { animatePedestrian, createPedestrianModels, pedestrianProfile } from "./pedestrianModels";

it("builds six coloured, grounded profiles with shared geometry and a reversible walking pose", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const models = createPedestrianModels(scene);
  try {
    expect(models.prototypes).toHaveLength(6);
    for (const palette of models.prototypes) {
      expect(palette).toHaveLength(4);
      for (const model of palette) {
        const parts = [model.body, ...model.limbs];
        const triangles = parts.reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0);
        expect(triangles).toBeGreaterThanOrEqual(250);
        expect(triangles).toBeLessThanOrEqual(600);
        for (const part of parts) part.computeWorldMatrix(true);
        const minimum = Math.min(...parts.map((part) => part.getBoundingInfo().boundingBox.minimumWorld.y));
        const maximum = Math.max(...parts.map((part) => part.getBoundingInfo().boundingBox.maximumWorld.y));
        expect(minimum).toBeCloseTo(0, 4);
        expect(maximum).toBeGreaterThan(1.7);
        expect(maximum).toBeLessThan(1.95);
      }
    }
    for (const [frontage, expected] of [["commercial", 2], ["industrial", 3], ["agricultural", 4], ["military", 5]] as const) {
      expect(pedestrianProfile(frontage, 0)).toBe(expected);
      expect(pedestrianProfile(frontage, 3)).toBeLessThan(3);
    }
    const first = models.create("pedestrian_first", "industrial", 4);
    const second = models.create("pedestrian_second", "industrial", 4);
    expect(first.sourceMesh).toBe(second.sourceMesh);
    const limbs = first.getChildMeshes();
    expect(limbs).toHaveLength(4);
    expect(scene.meshes.filter((mesh) => mesh.name.startsWith("pedestrian_"))).toHaveLength(2);
    animatePedestrian(limbs, Math.PI / 2, true);
    expect(limbs.map((limb) => limb.rotation.x)).toEqual([0.48, -0.48, -0.48, 0.48]);
    animatePedestrian(limbs, Math.PI, false);
    expect(limbs.every((limb) => limb.rotation.x === 0)).toBe(true);
    first.dispose();
    second.dispose();
    models.dispose();
    expect(scene.meshes).toHaveLength(0);
    expect(scene.materials).toHaveLength(0);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
