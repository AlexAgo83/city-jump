import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import "@babylonjs/core/Meshes/instancedMesh";
import { Scene } from "@babylonjs/core/scene";
import { afterEach, describe, expect, it } from "vitest";

import { RoadGraph } from "../sim/graph";
import { v3 } from "../sim/vec";
import { createTrafficMoverSystem } from "./trafficMovers";
import { createVehicleModels } from "./vehicleModels";

describe("traffic mover renderer", () => {
  let engine: NullEngine | null = null;
  let scene: Scene | null = null;

  afterEach(() => {
    scene?.dispose();
    engine?.dispose();
    scene = null;
    engine = null;
  });

  it("builds vehicles from the model catalogue and removes its frame hook", () => {
    engine = new NullEngine();
    scene = new Scene(engine);
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(140, 0);
    graph.addSegment(a, b, v3(70, 0, 0), "street");
    const models = createVehicleModels(scene);
    const baseline = scene.onBeforeRenderObservable.observers.length;
    const headlights = { lights: [], setLamps: () => undefined, sync: () => undefined, aim: () => undefined, dispose: () => undefined };
    const traffic = createTrafficMoverSystem(scene, graph, () => 16, () => 0, models, headlights, {
      lightsOn: () => false,
      enabled: true,
      paused: false,
      density: 1,
      timeScale: 1,
    });

    expect(models.plainShapes.length).toBeGreaterThan(0);
    expect(models.themedShapes.get("military")?.length).toBeGreaterThan(0);
    traffic.rebuild();
    expect(traffic.count()).toBeGreaterThan(0);
    expect(traffic.pedestrians()).toBeGreaterThan(0);
    expect(traffic.firstVehicle()?.vehicle).toBeTruthy();
    expect(scene.onBeforeRenderObservable.observers.length).toBeGreaterThan(baseline);

    traffic.dispose();
    models.dispose();
    expect(scene.onBeforeRenderObservable.observers.filter((observer) => !observer._willBeUnregistered)).toHaveLength(baseline);
  });

  it("picks the vehicle a ray hits, nearest first, and nothing when it misses", () => {
    engine = new NullEngine();
    scene = new Scene(engine);
    const graph = new RoadGraph();
    graph.addSegment(graph.addNode(0, 0), graph.addNode(140, 0), v3(70, 0, 0), "street");
    const models = createVehicleModels(scene);
    const headlights = { lights: [], setLamps: () => undefined, sync: () => undefined, aim: () => undefined, dispose: () => undefined };
    const traffic = createTrafficMoverSystem(scene, graph, () => 16, () => 0, models, headlights, {
      lightsOn: () => false,
      enabled: true,
      paused: false,
      density: 1,
      timeScale: 1,
    });
    traffic.rebuild();

    const first = traffic.firstVehicle();
    const at = first?.target();
    expect(at).toBeTruthy();
    const car = at as { x: number; y: number; z: number };

    // Straight down onto a car: that car.
    const overhead = { origin: { x: car.x, y: car.y + 100, z: car.z }, direction: { x: 0, y: -1, z: 0 } };
    expect(traffic.vehicleAlong(overhead)?.target()).toMatchObject({ x: car.x, z: car.z });

    // Pointing away from every car: nothing, and no nearest-thing consolation prize.
    expect(traffic.vehicleAlong({ origin: { x: car.x, y: car.y + 100, z: car.z }, direction: { x: 0, y: 1, z: 0 } })).toBeNull();
    expect(traffic.vehicleAlong({ origin: { x: car.x, y: car.y + 100, z: car.z + 400 }, direction: { x: 0, y: -1, z: 0 } })).toBeNull();

    // Down the road, through the line of cars on it: the near one wins, not whichever the mover
    // list happens to hold first.
    const lane = [];
    for (let probe = -20; probe < 200; probe += 0.5) {
      const hit = traffic.vehicleAlong({ origin: { x: probe, y: car.y, z: car.z }, direction: { x: 1, y: 0, z: 0 } })?.target();
      if (hit) lane.push({ from: probe, hit: hit.x });
    }
    expect(lane.length).toBeGreaterThan(0);
    // Every answer is ahead of where the ray started, and is the first car it reaches.
    for (const { from, hit } of lane) {
      expect(hit).toBeGreaterThan(from);
      const nearer = lane.filter((other) => other.hit > from && other.hit < hit);
      expect(nearer).toHaveLength(0);
    }

    traffic.dispose();
    models.dispose();
  });

  it("drops movers whose queued exit road was removed mid-turn", () => {
    engine = new NullEngine();
    scene = new Scene(engine);
    const s = scene;
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(90, 0);
    const c = graph.addNode(90, 90);
    graph.addSegment(a, b, v3(45, 0, 0), "street");
    const exit = graph.addSegment(b, c, v3(90, 0, 45), "street");
    const models = createVehicleModels(scene);
    const headlights = { lights: [], setLamps: () => undefined, sync: () => undefined, aim: () => undefined, dispose: () => undefined };
    const traffic = createTrafficMoverSystem(scene, graph, () => 250, () => 0, models, headlights, {
      lightsOn: () => false,
      enabled: true,
      paused: false,
      density: 1,
      timeScale: 4,
    });

    traffic.rebuild();
    for (let i = 0; i < 120; i++) s.onBeforeRenderObservable.notifyObservers(s);
    graph.removeSegment(exit);

    expect(() => {
      for (let i = 0; i < 120; i++) s.onBeforeRenderObservable.notifyObservers(s);
    }).not.toThrow();

    traffic.dispose();
    models.dispose();
  });
});
