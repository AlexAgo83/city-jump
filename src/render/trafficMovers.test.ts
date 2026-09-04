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
