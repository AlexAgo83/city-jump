import { describe, it, expect, beforeEach } from "vitest";
import { RoadGraph } from "./graph";
import { Plantings } from "./plantings";
import { Rubble } from "./rubble";
import { BuildingLifecycle } from "./buildingLifecycle";
import { CityEconomy, STARTING_MONEY, Treasury } from "./economy";
import { serializeCity, restoreCity, parseCity, SAVE_VERSION, type CitySave } from "./save";
import { createWaveClock, scheduleNextWave } from "./wave";
import { buildingParcels, buildableCells } from "./slots";
import { v3 } from "./vec";
import { setTerrain, flatTerrain } from "./terrain";
import { Zones } from "./zones";
import { Utilities } from "./utilities";
import { createRun, DEFAULT_RUN_RULES } from "./run";

function city(): RoadGraph {
  const graph = new RoadGraph();
  const a = graph.addNodeAt(v3(0, 4, 0));
  const b = graph.addNodeAt(v3(100, 9, 0));
  const c = graph.addNodeAt(v3(100, 12, 120));
  graph.addSegment(a, b, v3(50, 0, 0));
  graph.addSegment(b, c, v3(140, 0, 60), "avenue");
  return graph;
}

describe("city saves", () => {
  beforeEach(() => setTerrain(flatTerrain));

  it("leaves out the nodes no road stands on", () => {
    const graph = city();
    // What the offshore bridge leaves behind: its segment is scenery and is dropped, and its two
    // ends were written anyway -- then replayed on load, where the bridge is built again with two
    // more. One exported city arrived with 3236 nodes for 24 segments.
    graph.addNodeAt(v3(-360, 4, 1500));
    graph.addNodeAt(v3(620, 4, 4400));
    const before = graph.allNodes().length;

    const save = serializeCity(graph, new Plantings(), new Zones(), "rolling", 14);
    expect(before).toBe(save.nodes.length + 2);
    expect(save.nodes.every((node) => save.segments.some((segment) => segment[0] === node[0] || segment[1] === node[0]))).toBe(true);
  });

  it("round-trips the simulation clock, which lot demand and build stages are timed against", () => {
    const save = parseCity(JSON.stringify(serializeCity(new RoadGraph(), new Plantings(), new Zones(), "rolling", 14, undefined, new Rubble(), new BuildingLifecycle(), new Treasury(), new CityEconomy(), new Utilities(), createRun(), createWaveClock(), 512)))!;
    expect(save.elapsed).toBe(512);
  });

  it("round-trips a city through JSON", () => {
    const save = parseCity(JSON.stringify(serializeCity(city(), new Plantings(), new Zones(), "rugged", 18.5)));
    expect(save).not.toBeNull();

    const restored = new RoadGraph();
    restoreCity(restored, new Plantings(), new Zones(), save!);
    expect(restored.allNodes().map((node) => node.pos.y)).toEqual([4, 9, 12]);
    expect(restored.allSegments().map((segment) => segment.type)).toEqual(["street", "avenue"]);
    expect(restored.allSegments().map((segment) => segment.streetId)).toEqual(save!.segments.map((segment) => segment[6]));
    expect(save!.terrain).toBe("rugged");
    expect(save!.hour).toBe(18.5);
  });

  it("is a fixed point: save, load, save gives the same data", () => {
    const planted = new Plantings();
    planted.plant(10, 20, "oak");
    planted.clear(-40, 5);
    const once = serializeCity(city(), planted, new Zones(), "rolling", 14);

    const restoredGraph = new RoadGraph();
    const restoredPlantings = new Plantings();
    restoreCity(restoredGraph, restoredPlantings, new Zones(), once);
    expect(serializeCity(restoredGraph, restoredPlantings, new Zones(), "rolling", 14)).toEqual(once);
  });

  it("does not persist generated elevated scenery roads", () => {
    const graph = city();
    const a = graph.addNodeAt(v3(-200, 20, 5000));
    const b = graph.addNodeAt(v3(200, 20, 5000));
    graph.addElevatedSegment(a, b, v3(0, 60, 5000), "highway_2lane");

    expect(serializeCity(graph, new Plantings(), new Zones(), "rolling", 14).segments).toHaveLength(2);
  });

  it("persists elevated player highways", () => {
    const graph = city();
    const a = graph.addNodeAt(v3(-200, 20, 0));
    const b = graph.addNodeAt(v3(200, 20, 0));
    graph.addElevatedSegment(a, b, v3(0, 60, 0), "highway_2lane");

    const save = parseCity(JSON.stringify(serializeCity(graph, new Plantings(), new Zones(), "rolling", 14)))!;
    const restored = new RoadGraph();
    restoreCity(restored, new Plantings(), new Zones(), save);

    const highway = restored.allSegments().find((segment) => segment.type === "highway_2lane");
    expect(highway?.elevated).toBe(true);
  });

  it("carries road utility flags through a save", () => {
    const graph = city();
    graph.setSegmentUtilities(graph.allSegments()[0]!.id, 3);

    const save = parseCity(JSON.stringify(serializeCity(graph, new Plantings(), new Zones(), "rolling", 14)))!;
    const restored = new RoadGraph();
    restoreCity(restored, new Plantings(), new Zones(), save);

    expect(restored.allSegments()[0]!.utilities).toBe(3);
  });

  it("carries utility placements through a save", () => {
    const graph = city();
    const utilities = new Utilities();
    utilities.place(graph, "producer", "power", 0, 0);
    utilities.place(graph, "diffuser", "power", 100, 0);

    const save = parseCity(JSON.stringify(serializeCity(graph, new Plantings(), new Zones(), "rolling", 14, undefined, new Rubble(), new BuildingLifecycle(), new Treasury(), undefined, utilities)))!;
    const restored = new Utilities();
    restoreCity(new RoadGraph(), new Plantings(), new Zones(), save, new Rubble(), new BuildingLifecycle(), new Treasury(), undefined, restored);

    expect(restored.toJSON().map((item) => item.slice(0, 2))).toEqual([["producer", "power"], ["diffuser", "power"]]);
  });

  it("carries hand-planted and cleared trees through a save", () => {
    const plantings = new Plantings();
    plantings.plant(10, 20, "oak");
    plantings.plant(-5, 60, "palm");
    plantings.clear(300, 300); // a generated tree, so it is recorded as a clearing
    plantings.clear(10, 20); // one we planted, so it is simply dropped again

    const save = parseCity(JSON.stringify(serializeCity(new RoadGraph(), plantings, new Zones(), "rolling", 14)));
    const restored = new Plantings();
    restoreCity(new RoadGraph(), restored, new Zones(), save!);
    expect(restored.plantedTrees).toEqual([{ x: -5, z: 60, species: "palm" }]);
    expect(restored.clearedPoints).toEqual([{ x: 300, z: 300, species: "fir" }]);
    expect(restored.isCleared(300, 301)).toBe(true);
    expect(restored.isCleared(400, 400)).toBe(false);
  });

  it("carries rubble through a save", () => {
    const graph = city();
    const rubble = new Rubble();
    rubble.destroy(buildingParcels(buildableCells(graph))[0]!);

    const save = parseCity(JSON.stringify(serializeCity(graph, new Plantings(), new Zones(), "rolling", 14, undefined, rubble)))!;
    const restored = new Rubble();
    restoreCity(new RoadGraph(), new Plantings(), new Zones(), save, restored);

    expect(restored.toJSON()).toEqual(rubble.toJSON());
  });

  it("carries building lifecycle state through a save", () => {
    const lifecycle = new BuildingLifecycle([[1, 2, "waiting", 12]]);
    const save = parseCity(JSON.stringify(serializeCity(new RoadGraph(), new Plantings(), new Zones(), "rolling", 14, undefined, new Rubble(), lifecycle)))!;
    const restored = new BuildingLifecycle();
    restoreCity(new RoadGraph(), new Plantings(), new Zones(), save, new Rubble(), restored);

    expect(restored.toJSON()).toEqual([[1, 2, "rising", 12]]);
  });

  it("carries treasury money through a save", () => {
    const treasury = new Treasury(1234);
    const save = parseCity(JSON.stringify(serializeCity(new RoadGraph(), new Plantings(), new Zones(), "rolling", 14, undefined, new Rubble(), new BuildingLifecycle(), treasury)))!;
    const restored = new Treasury();
    restoreCity(new RoadGraph(), new Plantings(), new Zones(), save, new Rubble(), new BuildingLifecycle(), restored);

    expect(save.money).toBe(1234);
    expect(restored.money).toBe(1234);
  });

  it("carries the wave state through a save and defaults older saves", () => {
    const waveClock = scheduleNextWave({ elapsedSeconds: 100, active: { startedAtSeconds: 80, threat: 900, hitPoints: 0 } });
    const save = parseCity(JSON.stringify(serializeCity(new RoadGraph(), new Plantings(), new Zones(), "rolling", 14, undefined, new Rubble(), new BuildingLifecycle(), new Treasury(), undefined, undefined, createRun(), waveClock)))!;
    const older = parseCity(JSON.stringify({ v: SAVE_VERSION, terrain: "rolling", hour: 1, nodes: [], segments: [] }))!;

    expect(save.waveClock).toEqual(waveClock);
    expect(older.waveClock?.elapsedSeconds).toBe(0);
    expect(older.waveClock?.active).toBeNull();
  });

  it("carries run rules through a save and defaults older saves", () => {
    const run = createRun({ kaijuSpawns: false, instantConstruction: true, freeBuilding: true });
    const save = parseCity(JSON.stringify(serializeCity(new RoadGraph(), new Plantings(), new Zones(), "rolling", 14, undefined, new Rubble(), new BuildingLifecycle(), new Treasury(), undefined, undefined, run)))!;
    const older = parseCity(JSON.stringify({ v: SAVE_VERSION, terrain: "rolling", hour: 1, nodes: [], segments: [], run: { wave: 1, science: 0, ended: null } }))!;

    expect(save.run?.rules).toEqual(run.rules);
    expect(older.run?.rules).toEqual(DEFAULT_RUN_RULES);
  });

  it("loads older resource saves that still carried services", () => {
    const save = parseCity(JSON.stringify({ v: SAVE_VERSION, terrain: "rolling", hour: 1, nodes: [], segments: [], resources: { population: 20, food: 5, services: 12 } }));

    expect(save?.resources).toEqual({ population: 20, food: 5, materials: 0 });
  });

  it("reads plantings saved before species existed as firs", () => {
    const v2 = JSON.stringify({
      v: 2,
      terrain: "rolling",
      hour: 14,
      nodes: [],
      segments: [],
      planted: [[10, 20], [30, 40]],
      cleared: [[50, 60]],
    });
    const save = parseCity(v2);
    expect(save).not.toBeNull();
    expect(save!.money).toBe(STARTING_MONEY);
    const restored = new Plantings();
    restoreCity(new RoadGraph(), restored, new Zones(), save!);
    expect(restored.plantedTrees.map((tree) => tree.species)).toEqual(["fir", "fir"]);
    expect(restored.plantedTrees[0]).toEqual({ x: 10, z: 20, species: "fir" });
  });

  it("still reads a city saved before plantings existed", () => {
    const v1 = JSON.stringify({
      v: 1,
      terrain: "rugged",
      hour: 9,
      nodes: [[1, 0, 4, 0], [2, 100, 6, 0]],
      segments: [[1, 2, 50, 0, 0, "street"]],
    });
    const save = parseCity(v1);
    expect(save).not.toBeNull();
    expect(save!.terrain).toBe("rugged");
    expect(save!.segments).toHaveLength(1);
    expect(save!.planted).toEqual([]);

    const graph = new RoadGraph();
    restoreCity(graph, new Plantings(), new Zones(), save!);
    expect(graph.allSegments()).toHaveLength(1);
  });

  it("refuses a save from a newer build rather than dropping what it does not understand", () => {
    const future = JSON.stringify({ v: SAVE_VERSION + 1, terrain: "rolling", hour: 1, nodes: [], segments: [] });
    expect(parseCity(future)).toBeNull();
  });

  it("treats a save with no plantings as a save with none", () => {
    const bare = JSON.stringify({ v: SAVE_VERSION, terrain: "rolling", hour: 14, nodes: [], segments: [] });
    const save = parseCity(bare);
    expect(save?.planted).toEqual([]);
    expect(parseCity(JSON.stringify({ ...JSON.parse(bare), planted: "nope" }))).toBeNull();
  });

  it("carries the camera when a save includes it", () => {
    const camera = { targetX: 1, targetY: 2, targetZ: 3, alpha: -1, beta: 0.8, radius: 320 };
    const save = parseCity(JSON.stringify(serializeCity(new RoadGraph(), new Plantings(), new Zones(), "rolling", 14, camera)));
    expect(save?.camera).toEqual(camera);
    expect(parseCity(JSON.stringify({ v: SAVE_VERSION, terrain: "rolling", hour: 1, camera: { targetX: 1 }, nodes: [], segments: [] }))).toBeNull();
  });

  it("replays onto a graph whose ids no longer start at 1", () => {
    const graph = city();
    graph.removeSegment(graph.allSegments()[0]!.id);
    const save = serializeCity(graph, new Plantings(), new Zones(), "rolling", 14);

    const target = new RoadGraph();
    target.addNodeAt(v3(-500, 0, -500)); // burns id 1
    restoreCity(target, new Plantings(), new Zones(), save);
    expect(target.allSegments()).toHaveLength(save.segments.length);
    for (const segment of target.allSegments()) expect(() => target.node(segment.a)).not.toThrow();
  });

  it("clears whatever the graph held first", () => {
    const target = city();
    restoreCity(target, new Plantings(), new Zones(), serializeCity(new RoadGraph(), new Plantings(), new Zones(), "rolling", 14));
    expect(target.allSegments()).toEqual([]);
  });

  it("refuses malformed or foreign saves rather than replaying them", () => {
    expect(parseCity("not json")).toBeNull();
    expect(parseCity("null")).toBeNull();
    expect(parseCity(JSON.stringify({ v: SAVE_VERSION, terrain: "rolling", hour: 1, nodes: [], segments: [] }))).not.toBeNull();
    // A node short of a coordinate, and a segment with a non-string road type.
    expect(parseCity(JSON.stringify({ v: SAVE_VERSION, terrain: "rolling", hour: 1, nodes: [[1, 0, 0]], segments: [] }))).toBeNull();
    expect(
      parseCity(JSON.stringify({ v: SAVE_VERSION, terrain: "rolling", hour: 1, nodes: [], segments: [[1, 2, 0, 0, 0, 7]] })),
    ).toBeNull();
  });

  it("carries a roundabout's lane count through a save", () => {
    const graph = new RoadGraph();
    const a = graph.addNodeAt(v3(0, 0, 0));
    const b = graph.addNodeAt(v3(50, 0, 0));
    const c = graph.addNodeAt(v3(0, 0, 50));
    graph.addSegment(a, b, v3(25, 0, 0));
    graph.addSegment(a, c, v3(0, 0, 25));
    graph.setRoundabout(a, true, 2);

    const save = parseCity(JSON.stringify(serializeCity(graph, new Plantings(), new Zones(), "rolling", 14)));
    const restored = new RoadGraph();
    restoreCity(restored, new Plantings(), new Zones(), save!);
    expect(restored.node(a).roundabout).toBe(true);
    expect(restored.node(a).roundaboutLanes).toBe(2);
  });

  it("reads a roundabout saved before lanes existed as one lane", () => {
    const v4 = JSON.stringify({
      v: 4,
      terrain: "rolling",
      hour: 14,
      nodes: [[1, 0, 0, 0, 1], [2, 50, 0, 0], [3, 0, 0, 50]],
      segments: [[1, 2, 25, 0, 0, "street"], [1, 3, 0, 0, 25, "street"]],
    });
    const save = parseCity(v4);
    expect(save).not.toBeNull();
    const graph = new RoadGraph();
    restoreCity(graph, new Plantings(), new Zones(), save!);
    const roundabout = graph.allNodes().find((node) => node.roundabout)!;
    expect(roundabout.roundaboutLanes).toBe(1);
  });

  it("refuses a segment pointing at a node the save does not contain", () => {
    const save: CitySave = { v: SAVE_VERSION, terrain: "rolling", hour: 14, money: STARTING_MONEY, nodes: [], segments: [[1, 2, 0, 0, 0, "street"]], planted: [], cleared: [], zones: [], rubble: [], buildingStates: [] };
    expect(() => restoreCity(new RoadGraph(), new Plantings(), new Zones(), save)).toThrow(/missing node/);
  });

  it("leaves the current city untouched when replaying a bad save fails", () => {
    const graph = city();
    const plantings = new Plantings();
    plantings.plant(10, 20, "oak");
    const before = serializeCity(graph, plantings, new Zones(), "rolling", 14);
    const bad: CitySave = {
      v: SAVE_VERSION,
      terrain: "rolling",
      hour: 14,
      money: STARTING_MONEY,
      nodes: [[1, 0, 0, 0]],
      segments: [[1, 2, 0, 0, 0, "street"]],
      planted: [],
      cleared: [],
      zones: [],
      rubble: [],
      buildingStates: [],
    };

    expect(() => restoreCity(graph, plantings, new Zones(), bad)).toThrow(/missing node/);
    expect(serializeCity(graph, plantings, new Zones(), "rolling", 14)).toEqual(before);
  });
});
