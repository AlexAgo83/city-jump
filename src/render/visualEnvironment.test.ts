import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { expect, it } from "vitest";
import { Heightmap } from "../sim/heightmap";
import type { BuildingParcel } from "../sim/slots";
import { districtIndex, buildingModelId } from "./buildings";
import { coastalRockMatrices } from "./coast";
import { createGroundShadow } from "./groundShadow";
import { createRubbleRenderer, rubblePieces } from "./rubble";
import { createChimneySmoke } from "./ambientMotion";

it("groups architecture locally, keeps rocks on the shore, and removes internal ruin walls", () => {
  const parcel: BuildingParcel = { kind: "residential", frontageCells: 2, depthCells: 2, rotationY: 0, position: { x: 0, y: 0, z: 0 }, cells: [] };
  expect(districtIndex(parcel)).toBe(districtIndex({ position: { x: 120, y: 0, z: 120 } }));
  expect(districtIndex(parcel)).not.toBe(districtIndex({ position: { x: 160, y: 0, z: 0 } }));
  const variants = new Set(Array.from({ length: 64 }, (_, i) => buildingModelId({ ...parcel, position: { x: i * 32, y: 0, z: 0 } })));
  expect(variants.size).toBeGreaterThanOrEqual(3);
  const ground = new Heightmap({ size: 240, cell: 8, generator: (x) => x * 0.1 });
  const rocks = coastalRockMatrices(ground);
  expect(rocks.length).toBeGreaterThan(0);
  expect(coastalRockMatrices(ground).map((matrix) => [...matrix.m])).toEqual(rocks.map((matrix) => [...matrix.m]));
  for (const matrix of rocks) {
    const { x, z } = matrix.getTranslation();
    expect(ground.heightAt(x, z)).toBeGreaterThanOrEqual(0.5);
    expect(ground.heightAt(x, z)).toBeLessThanOrEqual(5);
  }
  const isolated = rubblePieces([[0, 0]], [], () => 3);
  const paired = rubblePieces([[0, 0], [8, 0]], [], () => 3);
  expect(paired.matrices.length).toBe(isolated.matrices.length * 2 - 2);
  expect(paired.matrices.every((matrix) => matrix.getTranslation().y >= 3)).toBe(true);
  expect(rubblePieces([[0, 0], [8, 0]], [], () => 3).matrices.map((matrix) => [...matrix.m])).toEqual(paired.matrices.map((matrix) => [...matrix.m]));
});

it("fits contact shadows to rotated footprints and disposes ambient and rubble resources", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const before = scene.onBeforeRenderObservable.observers.length;
  const shadow = createGroundShadow(scene, "test_contact");
  shadow.setInstances([{ x: 12, y: 3, z: 7, radius: 2, radiusZ: 5, rotationY: Math.PI / 2 }]);
  const matrix = shadow.mesh.thinInstanceGetWorldMatrices()[0]!;
  expect(matrix.getTranslation().x).toBe(12);
  expect(matrix.getTranslation().y).toBeCloseTo(3.03);
  expect(Math.abs(matrix.m[2]!)).toBeCloseTo(4);
  expect(Math.abs(matrix.m[8]!)).toBeCloseTo(10);
  const smoke = createChimneySmoke(scene);
  smoke.rebuild(Array.from({ length: 40 }, (_, i) => new Vector3(i * 5, 10, 0)));
  const chimney = scene.getMeshByName("roofprop_chimney_smoke")!;
  expect(chimney.isEnabled()).toBe(true);
  smoke.setVisible(false);
  expect(chimney.isEnabled()).toBe(false);
  smoke.rebuild([]);
  smoke.setVisible(true);
  expect(chimney.isEnabled()).toBe(false);
  const ruins = createRubbleRenderer(scene, () => 0);
  ruins.rebuild([[0, 0]]);
  expect(scene.getMeshByName("rubble_scorch")!.isEnabled()).toBe(true);
  ruins.rebuild([]);
  expect(scene.getMeshByName("rubble_scorch")!.isEnabled()).toBe(false);
  ruins.dispose();
  smoke.dispose();
  shadow.dispose();
  expect(scene.meshes).toHaveLength(0);
  expect(scene.textures).toHaveLength(0);
  expect(scene.onBeforeRenderObservable.observers.filter((o) => !o._willBeUnregistered)).toHaveLength(before);
  scene.dispose();
  engine.dispose();
});
