import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import "@babylonjs/core/Meshes/instancedMesh";
import { Scene } from "@babylonjs/core/scene";
import { afterEach, describe, expect, it } from "vitest";

import { RoadGraph } from "../sim/graph";
import { CAR_TURN_RATE, MAX_STEP_S } from "../sim/traffic";
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

  /**
   * The step clamp lives in this system's own frame callback, so a rendered frame is the only way
   * to reach it. Two systems built the same way and notified once each -- one with a frame of
   * exactly the clamp, one with a frame a thousand times longer -- have to land on the same
   * positions. Nothing here reads Math.random, so this is exact: where the movers are is a
   * function of the graph and the accumulated step, and of nothing else.
   *
   * Without the clamp a tab returning from the background drove a whole minute of traffic into one
   * frame, and every car left the road it was on.
   */
  it("does not drive through a frame longer than the step clamp", () => {
    const stepped = (frameMs: number): number => {
      const localEngine = new NullEngine();
      const localScene = new Scene(localEngine);
      const graph = new RoadGraph();
      const a = graph.addNode(0, 0);
      const b = graph.addNode(400, 0);
      graph.addSegment(a, b, v3(200, 0, 0), "street");
      const models = createVehicleModels(localScene);
      const headlights = { lights: [], setLamps: () => undefined, sync: () => undefined, aim: () => undefined, dispose: () => undefined };
      const traffic = createTrafficMoverSystem(localScene, graph, () => frameMs, () => 0, models, headlights, {
        lightsOn: () => false,
        enabled: true,
        paused: false,
        density: 1,
        timeScale: 1,
      });

      traffic.rebuild();
      const before = traffic.positionsKey();
      localScene.onBeforeRenderObservable.notifyObservers(localScene);
      const after = traffic.positionsKey();

      traffic.dispose();
      models.dispose();
      localScene.dispose();
      localEngine.dispose();
      // A road with no traffic on it would satisfy every equality below while proving nothing.
      expect(after).not.toBe(before);
      return after;
    };

    const clamped = stepped(MAX_STEP_S * 1000);

    expect(stepped(MAX_STEP_S * 1000 * 10)).toBe(clamped);
    expect(stepped(MAX_STEP_S * 1000 * 1000)).toBe(clamped);
  });

  /**
   * A car has a steering wheel: it turns towards a heading rather than snapping onto it. The rate
   * is applied here, against the clamped step, so a rendered frame is again the only way to reach
   * it. Driven round a right-angled corner the cap is saturated rather than merely respected -- the
   * largest step observed over 400 frames is exactly CAR_TURN_RATE * MAX_STEP_S -- so this holds
   * the constant rather than passing on a straight road where nothing turns at all.
   */
  it("turns a car no faster than its steering rate", () => {
    engine = new NullEngine();
    scene = new Scene(engine);
    const s = scene;
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(200, 0);
    const c = graph.addNode(200, 200);
    graph.addSegment(a, b, v3(100, 0, 0), "street");
    graph.addSegment(b, c, v3(200, 0, 100), "street");
    const models = createVehicleModels(scene);
    const headlights = { lights: [], setLamps: () => undefined, sync: () => undefined, aim: () => undefined, dispose: () => undefined };
    const traffic = createTrafficMoverSystem(scene, graph, () => MAX_STEP_S * 1000, () => 0, models, headlights, {
      lightsOn: () => false,
      enabled: true,
      paused: false,
      density: 1,
      timeScale: 1,
    });

    traffic.rebuild();
    const cap = CAR_TURN_RATE * MAX_STEP_S;
    let previous = traffic.firstVehicle()?.target()?.heading;
    let largest = 0;
    for (let frame = 0; frame < 400; frame++) {
      s.onBeforeRenderObservable.notifyObservers(s);
      const heading = traffic.firstVehicle()?.target()?.heading;
      if (previous !== undefined && heading !== undefined) {
        const raw = Math.abs(heading - previous);
        largest = Math.max(largest, raw > Math.PI ? Math.PI * 2 - raw : raw);
      }
      previous = heading;
    }

    expect(largest).toBeLessThanOrEqual(cap + 1e-9);
    // The corner works the cap rather than leaving it slack, so the assertion above has something
    // to hold: a straight road would pass it with every heading identical.
    expect(largest).toBeCloseTo(cap);

    traffic.dispose();
    models.dispose();
  });
});
