import { describe, expect, it } from "vitest";

import { RoadGraph } from "./graph";
import { buildableCells, buildingParcels } from "./slots";
import { addressForParcel, streetName, streets } from "./streets";
import { v3 } from "./vec";

function segment(graph: RoadGraph, x0: number, z0: number, x1: number, z1: number, type = "street") {
  const a = graph.addNode(x0, z0);
  const b = graph.addNode(x1, z1);
  return graph.addSegment(a, b, v3((x0 + x1) / 2, 0, (z0 + z1) / 2), type);
}

describe("streets", () => {
  it("keeps a straight continuation on one street and a branch on another", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(-100, 0);
    const b = graph.addNode(0, 0);
    const c = graph.addNode(100, 0);
    graph.addSegment(a, b, v3(-50, 0, 0));
    graph.addSegment(b, c, v3(50, 0, 0));
    graph.addSegment(b, graph.addNode(0, 100), v3(0, 0, 50));

    expect(streets(graph).map((street) => street.segments.length).sort()).toEqual([1, 2]);
  });

  it("keeps both halves of a split on the same street", () => {
    const graph = new RoadGraph();
    const id = segment(graph, -100, 0, 100, 0);
    const street = graph.segment(id).streetId;
    graph.splitSegment(id, graph.segment(id).length / 2);

    expect(graph.allSegments().map((seg) => seg.streetId)).toEqual([street, street]);
  });

  it("breaks a street at a roundabout", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(-100, 0);
    const b = graph.addNode(0, 0);
    graph.addSegment(a, b, v3(-50, 0, 0));
    graph.addSegment(b, graph.addNode(0, 100), v3(0, 0, 50));
    graph.setRoundabout(b, true);
    graph.addSegment(b, graph.addNode(100, 0), v3(50, 0, 0));

    expect(streets(graph).map((street) => street.segments.length).sort()).toEqual([1, 1, 1]);
  });

  it("names streets without running out", () => {
    expect(streetName(1, "street")).toBe("Ash Street");
    expect(streetName(1, "avenue")).toBe("Ash Avenue");
    expect(streetName(13, "street")).toBe("North Ash Street");
    expect(streetName(61, "street")).toBe("1st Street");
  });

  it("gives parcels distinct odd and even addresses", () => {
    const graph = new RoadGraph();
    segment(graph, -220, 0, 220, 0);
    const addresses = buildingParcels(buildableCells(graph)).map((parcel) => addressForParcel(graph, parcel));
    const numbers = addresses.map((address) => address.number);

    expect(addresses.every((address) => address.street.name.endsWith("Street"))).toBe(true);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers.some((number) => number % 2 === 0)).toBe(true);
    expect(numbers.some((number) => number % 2 === 1)).toBe(true);
  });
});
