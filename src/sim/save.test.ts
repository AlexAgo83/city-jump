import { describe, it, expect, beforeEach } from "vitest";
import { RoadGraph } from "./graph";
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
    const save = parseCity(JSON.stringify(serializeCity(city(), "rugged", 18.5)));
    expect(save).not.toBeNull();

    const restored = new RoadGraph();
    restoreCity(restored, save!);
    expect(restored.allNodes().map((node) => node.pos.y)).toEqual([4, 9, 12]);
    expect(restored.allSegments().map((segment) => segment.type)).toEqual(["street", "avenue"]);
    expect(save!.terrain).toBe("rugged");
    expect(save!.hour).toBe(18.5);
  });

  it("is a fixed point: save, load, save gives the same data", () => {
    const once = serializeCity(city(), "rolling", 14);
    const restored = new RoadGraph();
    restoreCity(restored, once);
    expect(serializeCity(restored, "rolling", 14)).toEqual(once);
  });

  it("replays onto a graph whose ids no longer start at 1", () => {
    const graph = city();
    graph.removeSegment(graph.allSegments()[0]!.id);
    const save = serializeCity(graph, "rolling", 14);

    const target = new RoadGraph();
    target.addNodeAt(v3(-500, 0, -500)); // burns id 1
    restoreCity(target, save);
    expect(target.allSegments()).toHaveLength(save.segments.length);
    for (const segment of target.allSegments()) expect(() => target.node(segment.a)).not.toThrow();
  });

  it("clears whatever the graph held first", () => {
    const target = city();
    restoreCity(target, serializeCity(new RoadGraph(), "rolling", 14));
    expect(target.allSegments()).toEqual([]);
  });

  it("refuses malformed or foreign saves rather than replaying them", () => {
    expect(parseCity("not json")).toBeNull();
    expect(parseCity("null")).toBeNull();
    expect(parseCity(JSON.stringify({ v: SAVE_VERSION + 1, terrain: "rolling", hour: 1, nodes: [], segments: [] }))).toBeNull();
    expect(parseCity(JSON.stringify({ v: SAVE_VERSION, terrain: "rolling", hour: 1, nodes: [], segments: [] }))).not.toBeNull();
    // A node short of a coordinate, and a segment with a non-string road type.
    expect(parseCity(JSON.stringify({ v: SAVE_VERSION, terrain: "rolling", hour: 1, nodes: [[1, 0, 0]], segments: [] }))).toBeNull();
    expect(
      parseCity(JSON.stringify({ v: SAVE_VERSION, terrain: "rolling", hour: 1, nodes: [], segments: [[1, 2, 0, 0, 0, 7]] })),
    ).toBeNull();
  });

  it("refuses a segment pointing at a node the save does not contain", () => {
    const save: CitySave = { v: SAVE_VERSION, terrain: "rolling", hour: 14, nodes: [], segments: [[1, 2, 0, 0, 0, "street"]] };
    expect(() => restoreCity(new RoadGraph(), save)).toThrow(/missing node/);
  });
});
