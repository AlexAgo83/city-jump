import { describe, it, expect, beforeEach } from "vitest";
import { RoadGraph } from "./graph";
import { Plantings } from "./plantings";
import { serializeCity, restoreCity, parseCity, SAVE_VERSION, type CitySave } from "./save";
import { v3 } from "./vec";
import { setTerrain, flatTerrain } from "./terrain";

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

  it("round-trips a city through JSON", () => {
    const save = parseCity(JSON.stringify(serializeCity(city(), new Plantings(), "rugged", 18.5)));
    expect(save).not.toBeNull();

    const restored = new RoadGraph();
    restoreCity(restored, new Plantings(), save!);
    expect(restored.allNodes().map((node) => node.pos.y)).toEqual([4, 9, 12]);
    expect(restored.allSegments().map((segment) => segment.type)).toEqual(["street", "avenue"]);
    expect(save!.terrain).toBe("rugged");
    expect(save!.hour).toBe(18.5);
  });

  it("is a fixed point: save, load, save gives the same data", () => {
    const planted = new Plantings();
    planted.plant(10, 20, "oak");
    planted.clear(-40, 5);
    const once = serializeCity(city(), planted, "rolling", 14);

    const restoredGraph = new RoadGraph();
    const restoredPlantings = new Plantings();
    restoreCity(restoredGraph, restoredPlantings, once);
    expect(serializeCity(restoredGraph, restoredPlantings, "rolling", 14)).toEqual(once);
  });

  it("carries hand-planted and cleared trees through a save", () => {
    const plantings = new Plantings();
    plantings.plant(10, 20, "oak");
    plantings.plant(-5, 60, "palm");
    plantings.clear(300, 300); // a generated tree, so it is recorded as a clearing
    plantings.clear(10, 20); // one we planted, so it is simply dropped again

    const save = parseCity(JSON.stringify(serializeCity(new RoadGraph(), plantings, "rolling", 14)));
    const restored = new Plantings();
    restoreCity(new RoadGraph(), restored, save!);
    expect(restored.plantedTrees).toEqual([{ x: -5, z: 60, species: "palm" }]);
    expect(restored.clearedPoints).toEqual([{ x: 300, z: 300, species: "fir" }]);
    expect(restored.isCleared(300, 301)).toBe(true);
    expect(restored.isCleared(400, 400)).toBe(false);
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
    const restored = new Plantings();
    restoreCity(new RoadGraph(), restored, save!);
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
    restoreCity(graph, new Plantings(), save!);
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

  it("replays onto a graph whose ids no longer start at 1", () => {
    const graph = city();
    graph.removeSegment(graph.allSegments()[0]!.id);
    const save = serializeCity(graph, new Plantings(), "rolling", 14);

    const target = new RoadGraph();
    target.addNodeAt(v3(-500, 0, -500)); // burns id 1
    restoreCity(target, new Plantings(), save);
    expect(target.allSegments()).toHaveLength(save.segments.length);
    for (const segment of target.allSegments()) expect(() => target.node(segment.a)).not.toThrow();
  });

  it("clears whatever the graph held first", () => {
    const target = city();
    restoreCity(target, new Plantings(), serializeCity(new RoadGraph(), new Plantings(), "rolling", 14));
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

    const save = parseCity(JSON.stringify(serializeCity(graph, new Plantings(), "rolling", 14)));
    const restored = new RoadGraph();
    restoreCity(restored, new Plantings(), save!);
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
    restoreCity(graph, new Plantings(), save!);
    const roundabout = graph.allNodes().find((node) => node.roundabout)!;
    expect(roundabout.roundaboutLanes).toBe(1);
  });

  it("refuses a segment pointing at a node the save does not contain", () => {
    const save: CitySave = { v: SAVE_VERSION, terrain: "rolling", hour: 14, nodes: [], segments: [[1, 2, 0, 0, 0, "street"]], planted: [], cleared: [] };
    expect(() => restoreCity(new RoadGraph(), new Plantings(), save)).toThrow(/missing node/);
  });
});
