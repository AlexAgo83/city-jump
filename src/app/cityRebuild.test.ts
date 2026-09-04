import { describe, expect, it } from "vitest";
import { RoadGraph } from "../sim/graph";
import { buildingParcels, buildableCells, lotsInRect, parcelsForDemand } from "../sim/slots";
import { v3 } from "../sim/vec";
import { Zones } from "../sim/zones";
import { admittedParcels, parcelBounds, parcelId, samePosition } from "./cityRebuild";

function straight(g: RoadGraph, x0: number, z0: number, x1: number, z1: number, type = "street") {
  const a = g.addNode(x0, z0);
  const b = g.addNode(x1, z1);
  return g.addSegment(a, b, v3((x0 + x1) / 2, 0, (z0 + z1) / 2), type);
}

describe("city rebuild helpers", () => {
  it("admits demanded parcels from buildable cells", () => {
    const g = new RoadGraph();
    straight(g, -200, 0, 200, 0, "military");
    const zones = new Zones();
    zones.paintLots(lotsInRect(buildableCells(g), -200, -40, 200, 40), "military");
    const cells = buildableCells(g, zones);
    const standing = () => true;

    expect(admittedParcels(cells, zones, 24, 200, standing)).toEqual(
      parcelsForDemand(buildingParcels(cells, zones), 24, 200, standing),
    );
  });

  it("identifies and bounds parcels by position", () => {
    const g = new RoadGraph();
    straight(g, 0, 0, 120, 0);
    const zones = new Zones();
    zones.paintLots(lotsInRect(buildableCells(g), 0, -40, 120, 40), "residential");
    const parcel = admittedParcels(buildableCells(g, zones), zones, 12, 20)[0]!;
    const bounds = parcelBounds(parcel);

    expect(parcelId(parcel)).toBe(`${Math.round(parcel.position.x)}:${Math.round(parcel.position.z)}`);
    expect(samePosition(parcel.position, { x: parcel.position.x + 0.005, z: parcel.position.z - 0.005 })).toBe(true);
    expect(bounds.minX).toBeLessThan(Math.min(...parcel.cells.flatMap((cell) => cell.corners.map((point) => point.x))));
    expect(bounds.maxZ).toBeGreaterThan(Math.max(...parcel.cells.flatMap((cell) => cell.corners.map((point) => point.z))));
  });
});
