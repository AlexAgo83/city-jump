import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math";

import { createMissileRenderer, missilePoint } from "./missiles";
import { v3 } from "../sim/vec";

describe("missilePoint", () => {
  it("climbs above both endpoints during flight and lands on target xz", () => {
    const from = v3(0, 0, 0);
    const to = v3(100, 0, 0);

    expect(missilePoint(from, to, 0).x).toBe(0);
    expect(missilePoint(from, to, 0.5).y).toBeGreaterThan(missilePoint(from, to, 0).y);
    expect(missilePoint(from, to, 1).x).toBe(100);
    expect(missilePoint(from, to, 1).z).toBe(0);
  });
});

it("orients the missile along its arc, swaps to impact and releases pooled resources", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const renderer = createMissileRenderer(scene);
  const from = v3(0, 4, 0);
  const to = v3(100, 12, 80);
  try {
    const baseline = { meshes: scene.meshes.length, materials: scene.materials.length };
    for (const progress of [0, 0.5, 1]) {
      renderer.rebuild([{ from, to, progress }]);
      const body = scene.getMeshByName("missile-0")!;
      expect(body.isEnabled()).toBe(true);
      expect(body.getTotalVertices()).toBeGreaterThan(100);
      body.computeWorldMatrix(true);
      const forward = body.getDirection(Vector3.Up());
      const start = missilePoint(from, to, Math.max(0, progress - 0.0001));
      const end = missilePoint(from, to, Math.min(1, progress + 0.0001));
      expect(Vector3.Dot(forward, end.subtract(start).normalize())).toBeGreaterThan(0.999);
      expect(scene.getMeshByName("missile-exhaust-0")!.isEnabled()).toBe(true);
    }
    renderer.rebuild([{ from, to, progress: 1, impact: true }]);
    expect(scene.getMeshByName("missile-0")!.isEnabled()).toBe(false);
    expect(scene.getMeshByName("missile-impact-0")!.isEnabled()).toBe(true);
    expect(scene.getMeshByName("missile-trail")!.isEnabled()).toBe(false);
    renderer.rebuild([]);
    expect({ meshes: scene.meshes.length, materials: scene.materials.length }).toEqual(baseline);
    renderer.dispose();
    expect(scene.meshes).toHaveLength(0);
    expect(scene.materials.filter((material) => material.name.startsWith("missile"))).toHaveLength(0);
    expect(scene.multiMaterials).toHaveLength(0);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
