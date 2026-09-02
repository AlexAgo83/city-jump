import { describe, expect, it } from "vitest";

import { RoadGraph } from "./graph";
import { Plantings } from "./plantings";
import { restoreCity, serializeCity, parseCity } from "./save";
import { buildableCells, buildingParcels, lotsWithin, LOW_RISE_SIZES } from "./slots";
import { v3 } from "./vec";
import { Zones } from "./zones";

function road(graph: RoadGraph, z = 0): number {
  const a = graph.addNode(-160, z);
  const b = graph.addNode(160, z);
  return graph.addSegment(a, b, v3(0, 0, z));
}

describe("zones", () => {
  it("keeps a lot's zone when the road under it is split", () => {
    const graph = new RoadGraph();
    const id = road(graph);
    const zones = new Zones();
    zones.paintLots(lotsWithin(buildableCells(graph), 0, 20, 32), "residential");

    expect(buildableCells(graph, zones).some((cell) => cell.zone === "residential")).toBe(true);
    // A split changes the segments, not where the lots stand, so their zoning is untouched.
    graph.splitSegment(id, graph.segment(id).length / 2);
    expect(buildableCells(graph, zones).some((cell) => cell.zone === "residential")).toBe(true);
    for (const segment of graph.allSegments()) graph.removeSegment(segment.id);
    expect(zones.count()).toBeGreaterThan(0);
  });

  it("round-trips through a save and old saves load unzoned", () => {
    const graph = new RoadGraph();
    road(graph);
    const zones = new Zones();
    zones.paintLots(lotsWithin(buildableCells(graph), 0, 20, 16), "commercial");

    const save = parseCity(JSON.stringify(serializeCity(graph, new Plantings(), zones, "rolling", 14)))!;
    const restoredZones = new Zones();
    restoreCity(new RoadGraph(), new Plantings(), restoredZones, save);
    expect(restoredZones.toJSON()).toEqual(zones.toJSON());

    const old = parseCity(JSON.stringify({ v: 4, terrain: "rolling", hour: 14, nodes: [], segments: [] }))!;
    expect(old.zones).toEqual([]);
  });

  it("reads older density names as what they always meant", () => {
    const zones = new Zones([
      [0, 0, "low"],
      [16, 0, "dense"],
      [32, 0, "military"],
    ]);

    expect(zones.at(0, 0)).toBe("residential");
    expect(zones.at(16, 0)).toBe("commercial");
    expect(zones.at(32, 0)).toBe("military");
  });

  it("clearing a zone returns parcels to the unzoned choices", () => {
    const graph = new RoadGraph();
    road(graph);
    const zones = new Zones();
    const unzoned = buildingParcels(buildableCells(graph));
    zones.paintLots(lotsWithin(buildableCells(graph), 0, 20, 220), "residential");
    expect(
      buildingParcels(buildableCells(graph, zones), zones).every((parcel) =>
        LOW_RISE_SIZES.has(`${parcel.frontageCells}x${parcel.depthCells}`),
      ),
    ).toBe(true);
    zones.paintLots(lotsWithin(buildableCells(graph), 0, 20, 220), null);
    expect(buildingParcels(buildableCells(graph, zones), zones)).toEqual(unzoned);
  });
});
