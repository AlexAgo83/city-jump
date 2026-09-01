import { describe, expect, it } from "vitest";
import { RoadGraph } from "./graph";
import { suppliedDiffusers, UTILITY_BITS, withUtility, type UtilityDiffuser, type UtilityProducer } from "./utilities";
import { v3 } from "./vec";

describe("utilities", () => {
  it("supplies a diffuser through connected road segments carrying the same utility", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(50, 0);
    const c = graph.addNode(100, 0);
    const powered = graph.addSegment(a, b, v3(25, 0, 0), "street", undefined, UTILITY_BITS.power);
    const extension = graph.addSegment(b, c, v3(75, 0, 0), "street", undefined, UTILITY_BITS.power);
    const dry = graph.addSegment(c, graph.addNode(150, 0), v3(125, 0, 0), "street", undefined, UTILITY_BITS.water);
    const producers: UtilityProducer[] = [{ id: "plant", kind: "power", segmentId: powered }];
    const diffusers: UtilityDiffuser[] = [
      { id: "lit", kind: "power", segmentId: extension, position: v3(100, 0, 0), radius: 80 },
      { id: "dark", kind: "power", segmentId: dry, position: v3(150, 0, 0), radius: 80 },
    ];

    expect([...suppliedDiffusers(graph, producers, diffusers)].sort()).toEqual(["lit"]);
  });

  it("toggles utility bits without touching the other utility", () => {
    expect(withUtility(UTILITY_BITS.water, "power")).toBe(UTILITY_BITS.power | UTILITY_BITS.water);
    expect(withUtility(UTILITY_BITS.power | UTILITY_BITS.water, "power", false)).toBe(UTILITY_BITS.water);
  });
});
