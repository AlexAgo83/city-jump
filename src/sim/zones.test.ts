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

describe("zones after a replay", () => {
  const lotAt = (x: number, z: number) => ({
    corners: [
      { x: x - 4, z: z - 4 },
      { x: x + 4, z: z - 4 },
      { x: x + 4, z: z + 4 },
      { x: x - 4, z: z + 4 },
    ],
  });

  it("follows a lot that came back a metre from where it was painted", () => {
    const zones = new Zones();
    zones.paintLots([lotAt(100, 200)], "commercial");
    expect(zones.ofLot(lotAt(100, 200))).toBe("commercial");

    // The same street, replayed: its lots have slid along it, far enough to fall in the next
    // four-metre bucket -- which is the one lot in seven that lost its zoning on a reload.
    const replayed = [lotAt(102.5, 200)];
    expect(zones.ofLot(replayed[0]!)).toBeUndefined();
    expect(zones.snapTo(replayed)).toBe(1);
    expect(zones.ofLot(replayed[0]!)).toBe("commercial");
  });

  it("leaves a zone where it is when the nearest lot is a different lot", () => {
    const zones = new Zones();
    zones.paintLots([lotAt(100, 200)], "industrial");
    // Lots sit eight metres apart: the neighbour is not the lot that was painted.
    expect(zones.snapTo([lotAt(108, 200)])).toBe(0);
    expect(zones.ofLot(lotAt(108, 200))).toBeUndefined();
  });

  it("keeps a zone whose own lot is still there", () => {
    const zones = new Zones();
    zones.paintLots([lotAt(100, 200)], "residential");
    expect(zones.snapTo([lotAt(100, 200), lotAt(108, 200)])).toBe(0);
    expect(zones.ofLot(lotAt(100, 200))).toBe("residential");
  });
});
