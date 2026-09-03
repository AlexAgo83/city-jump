import { describe, expect, it } from "vitest";
import { RoadGraph } from "./graph";
import { missingUtility, suppliedDiffusers, Utilities, UTILITY_BITS, withUtility, type UtilityDiffuser, type UtilityProducer } from "./utilities";
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

  it("marks the road path from a producer to a diffuser", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(50, 0);
    const c = graph.addNode(100, 0);
    graph.addSegment(a, b, v3(25, 0, 0));
    graph.addSegment(b, c, v3(75, 0, 0));
    const utilities = new Utilities();

    expect(utilities.place(graph, "producer", "water", 0, 0)).not.toBeNull();
    expect(utilities.place(graph, "diffuser", "water", 100, 0)).not.toBeNull();

    expect(graph.allSegments().map((segment) => segment.utilities)).toEqual([UTILITY_BITS.water, UTILITY_BITS.water]);
    expect([...suppliedDiffusers(graph, utilities.producers(), utilities.diffusers())]).toHaveLength(1);
  });

  it("removing a producer clears the masks it supplied", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(50, 0);
    const c = graph.addNode(100, 0);
    graph.addSegment(a, b, v3(25, 0, 0));
    graph.addSegment(b, c, v3(75, 0, 0));
    const utilities = new Utilities();
    utilities.place(graph, "producer", "power", 0, 0);
    utilities.place(graph, "diffuser", "power", 100, 0);

    expect(utilities.removeNear(graph, 0, 0, 10)).not.toBeNull();

    expect(graph.allSegments().map((segment) => segment.utilities)).toEqual([0, 0]);
    expect([...suppliedDiffusers(graph, utilities.producers(), utilities.diffusers())]).toHaveLength(0);
  });

  it("removing one diffuser leaves another shared path supplied", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(50, 0);
    const c = graph.addNode(100, 0);
    graph.addSegment(a, b, v3(25, 0, 0));
    graph.addSegment(b, c, v3(75, 0, 0));
    const utilities = new Utilities();
    utilities.place(graph, "producer", "water", 0, 0);
    utilities.place(graph, "diffuser", "water", 85, 0);
    utilities.place(graph, "diffuser", "water", 100, 0);

    expect(utilities.removeNear(graph, 100, 0, 10)).not.toBeNull();

    expect(graph.allSegments().map((segment) => segment.utilities)).toEqual([UTILITY_BITS.water, UTILITY_BITS.water]);
    expect([...suppliedDiffusers(graph, utilities.producers(), utilities.diffusers())]).toHaveLength(1);
  });

  it("restakes from the item list and ignores utilities whose road was demolished", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(50, 0);
    const id = graph.addSegment(a, b, v3(25, 0, 0), "street", undefined, UTILITY_BITS.power);
    const utilities = new Utilities();

    utilities.replaceWith([], graph);
    expect(graph.segment(id).utilities).toBe(0);

    utilities.place(graph, "producer", "power", 0, 0);
    graph.removeSegment(id);
    expect(() => utilities.replaceWith(utilities.toJSON(), graph)).not.toThrow();
  });

  it("reports the first missing utility for a district", () => {
    const diffuser = { id: "d", kind: "power" as const, segmentId: 1, position: v3(0, 0, 0), radius: 50 };

    expect(missingUtility("commercial", v3(10, 0, 0), new Set(["d"]), [diffuser])).toBe("water");
    expect(missingUtility("industrial", v3(10, 0, 0), new Set(["d"]), [diffuser])).toBeNull();
    expect(missingUtility("residential", v3(10, 0, 0), new Set(["d"]), [diffuser])).toBe("water");
  });
});
