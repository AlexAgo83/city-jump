import { describe, expect, it } from "vitest";

import { RoadGraph } from "./graph";
import { Rubble } from "./rubble";
import { buildingParcels, buildableCells } from "./slots";
import { v3 } from "./vec";

describe("rubble", () => {
  it("records the cells a destroyed parcel consumed", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(-120, 0);
    const b = graph.addNode(120, 0);
    graph.addSegment(a, b, v3(0, 0, 0));
    const parcel = buildingParcels(buildableCells(graph))[0]!;
    const rubble = new Rubble();

    rubble.destroy(parcel);

    expect(rubble.count()).toBe(parcel.cells.length);
    expect(rubble.blocks(parcel)).toBe(true);
    rubble.clear(parcel);
    expect(rubble.blocks(parcel)).toBe(false);
    expect(new Rubble(rubble.toJSON()).toJSON()).toEqual(rubble.toJSON());
  });

  it("answers an empty map without touching a parcel's cells", () => {
    const graph = new RoadGraph();
    graph.addSegment(graph.addNode(-120, 0), graph.addNode(120, 0), v3(0, 0, 0));
    const parcel = buildingParcels(buildableCells(graph))[0]!;
    const rubble = new Rubble();
    // Every parcel of the city asks this every gameplay frame; an empty map is the common case and
    // has no reason to build a coordinate key per cell to look it up in nothing.
    const cells = { get cells() { throw new Error("walked the cells of an empty rubble map"); } };

    expect(rubble.blocks(cells as unknown as typeof parcel)).toBe(false);

    // Non-empty, and the same parcel is still blocked: the short circuit is the only difference.
    rubble.destroy(parcel);
    expect(rubble.blocks(parcel)).toBe(true);
    expect(() => rubble.blocks(cells as unknown as typeof parcel)).toThrow();
  });

  it("expires rubble by creation time and still loads old saves", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(-120, 0);
    const b = graph.addNode(120, 0);
    graph.addSegment(a, b, v3(0, 0, 0));
    const parcel = buildingParcels(buildableCells(graph))[0]!;
    const rubble = new Rubble();

    rubble.destroy(parcel, 10);

    expect(rubble.expireBefore(9)).toBe(false);
    expect(rubble.blocks(parcel)).toBe(true);
    expect(rubble.expireBefore(10)).toBe(true);
    expect(rubble.blocks(parcel)).toBe(false);
    expect(new Rubble([[1, 2]]).toJSON()).toEqual([[1, 2, 0]]);
  });
});
