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
});
