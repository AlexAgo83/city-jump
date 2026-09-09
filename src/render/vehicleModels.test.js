import { readFile } from "node:fs/promises";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/core/Meshes/instancedMesh";
import { afterEach, expect, it, vi } from "vitest";
import { createVehicleModels } from "./vehicleModels.ts";

afterEach(() => vi.restoreAllMocks());

it("loads the complete shipped fleet into existing instances with correct bounds, colours and lamp direction", async () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const models = createVehicleModels(scene);
  const original = SceneLoader.LoadAssetContainerAsync.bind(SceneLoader);
  vi.spyOn(SceneLoader, "LoadAssetContainerAsync").mockImplementation(async (_root, filename) => {
    const bytes = await readFile(new URL(`../../public/vehicles/${String(filename).split("?")[0]}`, import.meta.url));
    return original("", new Uint8Array(bytes), scene, undefined, ".glb");
  });
  const instances = models.carBodies.flat().map((body) => body.createInstance(`already-moving-${body.name}`));
  const instance = instances[0];
  instance.position.set(12, 3, 5);
  const before = { meshes: scene.meshes.length, materials: scene.materials.length };
  try {
    const pending = models.load();
    expect(models.load()).toBe(pending);
    expect(await pending).toEqual(Array(10).fill(true));
    expect(scene.meshes.length).toBe(before.meshes);
    // Babylon may create its one scene default material while importing.
    expect(scene.materials.length).toBeLessThanOrEqual(before.materials + 1);
    expect(instance.position.asArray()).toEqual([12, 3, 5]);
    expect(instance.getTotalVertices()).toBeGreaterThan(100);
    for (const [i, shape] of models.shapes.entries()) {
      const parts = [models.carBodies[i][0], models.carParts[i], models.carLamps[i].head, models.carLamps[i].tail];
      const boxes = parts.map((part) => part.getBoundingInfo().boundingBox);
      const min = (axis) => Math.min(...boxes.map((box) => box.minimum[axis]));
      const max = (axis) => Math.max(...boxes.map((box) => box.maximum[axis]));
      expect(min("y"), shape.name).toBeCloseTo(0, 4);
      expect(max("y"), shape.name).toBeCloseTo(shape.height, 3);
      expect(max("x")-min("x"), shape.name).toBeCloseTo(shape.width, 3);
      expect(max("z")-min("z"), shape.name).toBeCloseTo(shape.length, 3);
      expect(max("z")+min("z"), shape.name).toBeCloseTo(0, 3);
      expect(boxes[2].center.z, `${shape.name} headlights face forward`).toBeGreaterThan(0);
      expect(boxes[3].center.z, `${shape.name} tail lamps face back`).toBeLessThan(0);
      expect(models.carParts[i].getVerticesData("color")?.some((value) => value < 0.5)).toBe(true);
      const triangles = parts.reduce((sum, part) => sum + part.getTotalIndices()/3, 0);
      expect(triangles).toBe(shape.triangles);
      expect(triangles).toBeLessThan(4000);
      for (const body of models.carBodies[i]) {
        for (const mesh of [body, ...body.instances]) {
          expect(mesh.subMeshes.reduce((sum, part) => sum + part.indexCount, 0), mesh.name).toBe(body.getTotalIndices());
        }
        expect(body.sideOrientation).toBe(0); // glTF's clockwise faces in Babylon's left-handed scene
        expect(body.geometry).toBe(parts[0].geometry);
        expect(body.metadata.vehicleAsset).toBe(shape.file);
      }
    }
  } finally {
    for (const moving of instances) moving.dispose();
    models.dispose(); scene.dispose(); engine.dispose();
  }
});

it("keeps usable fallback geometry when assets fail and disposes requests that arrive late", async () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const loader = vi.spyOn(SceneLoader, "LoadAssetContainerAsync").mockRejectedValue(new Error("offline"));
  const models = createVehicleModels(scene);
  const geometry = models.carBodies[0][0].geometry;
  expect(await models.load()).toEqual(Array(10).fill(false));
  expect(models.carBodies[0][0].geometry).toBe(geometry);
  models.dispose();

  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const dispose = vi.fn();
  loader.mockImplementation(async () => {
    await gate;
    return { dispose };
  });
  const late = createVehicleModels(scene);
  const pending = late.load();
  late.dispose();
  release();
  expect(await pending).toEqual(Array(10).fill(false));
  expect(dispose).toHaveBeenCalledTimes(10);
  expect(scene.meshes).toHaveLength(0);
  expect(scene.materials).toHaveLength(0);
  scene.dispose(); engine.dispose();
});
