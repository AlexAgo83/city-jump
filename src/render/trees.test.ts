import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Color3 } from "@babylonjs/core/Maths/math";

import { TREE_SPECIES, treeTouchesBounds } from "./trees";
import { createTreeModel } from "./treeModels";

it("builds grounded, finite tree geometry within the instanced forest budget", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    for (const species of TREE_SPECIES) {
      const { trunk, canopy } = createTreeModel(scene, species, Color3.White(), Color3.Green());
      expect(scene.meshes).toHaveLength(2);
      expect((trunk.getTotalIndices() + canopy.getTotalIndices()) / 3).toBeLessThan(4000);
      for (const mesh of [trunk, canopy]) {
        const positions = mesh.getVerticesData("position")!;
        expect(positions.every(Number.isFinite)).toBe(true);
        expect(mesh.getVerticesData("color")).toHaveLength(positions.length / 3 * 4);
        expect(mesh.getVerticesData("normal")!.every(Number.isFinite)).toBe(true);
        expect(mesh.getIndices()!.every((index) => index >= 0 && index < positions.length / 3)).toBe(true);
      }
      const bounds = trunk.getBoundingInfo().boundingBox;
      expect(Math.abs(bounds.minimum.y)).toBeLessThan(0.2);
      expect(canopy.getBoundingInfo().boundingBox.maximum.y).toBeGreaterThan(5);
      trunk.dispose();
      canopy.dispose();
    }
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

describe("tree dirty rebuild bounds", () => {
  it("uses the same point predicate for preserving and recomputing trees", () => {
    const bounds = { minX: -10, maxX: 10, minZ: -5, maxZ: 5 };

    expect(treeTouchesBounds({ x: 0, z: 0 }, bounds)).toBe(true);
    expect(treeTouchesBounds({ x: -10, z: 5 }, bounds)).toBe(true);
    expect(treeTouchesBounds({ x: -11, z: 0 }, bounds)).toBe(false);
    expect(treeTouchesBounds({ x: 0, z: 6 }, bounds)).toBe(false);
  });
});
