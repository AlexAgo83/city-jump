import { describe, it, expect } from "vitest";
import { RoadGraph } from "./graph";
import { RULES, resolveSnap, validateSegment, commitSegment, quantise } from "./rules";
import { v3 } from "./vec";
import { setTerrain, flatTerrain } from "./terrain";

function road(g: RoadGraph, x0: number, z0: number, x1: number, z1: number) {
  const from = resolveSnap(g, x0, z0);
  const to = resolveSnap(g, x1, z1);
  const control = v3((from.position.x + to.position.x) / 2, 0, (from.position.z + to.position.z) / 2);
  return commitSegment(g, from, to, control, "street");
}

describe("quantisation", () => {
  it("puts two positions inside one grid step on the same point", () => {
    expect(quantise(10.4)).toBe(quantise(10.9));
    expect(quantise(10.4) % RULES.gridStep).toBe(0);
  });

  it("makes two roads drawn at the same place share one node", () => {
    const g = new RoadGraph();
    // Two starts 0.6 m apart, well inside the grid step and the snap radius.
    expect(road(g, 0, 0, 60, 0).ok).toBe(true);
    expect(road(g, 0.6, 0.4, 0, 60).ok).toBe(true);
    const junctions = g.allNodes().filter((n) => n.segments.size > 1);
    expect(junctions).toHaveLength(1);
  });
});

describe("snapping", () => {
  it("attaches to an existing node inside the radius rather than making a second one", () => {
    const g = new RoadGraph();
    road(g, 0, 0, 60, 0);
    const snap = resolveSnap(g, 60 + RULES.nodeSnapRadius - 1, 0);
    expect(snap.kind).toBe("node");
  });

  it("stays free outside the radius", () => {
    const g = new RoadGraph();
    road(g, 0, 0, 60, 0);
    expect(resolveSnap(g, 200, 200).kind).toBe("free");
  });

  it("keeps a free point exact when grid snapping is disabled", () => {
    const snap = resolveSnap(new RoadGraph(), 10.7, 13.3, false);
    expect(snap.position.x).toBe(10.7);
    expect(snap.position.z).toBe(13.3);
  });

  it("prefers an existing node over the segment it sits on", () => {
    const g = new RoadGraph();
    road(g, 0, 0, 60, 0);
    expect(resolveSnap(g, 1, 0).kind).toBe("node");
  });

  it("splits a segment drawn onto, producing a junction", () => {
    const g = new RoadGraph();
    road(g, 0, 0, 100, 0);
    const result = road(g, 50, 0, 50, 60);
    expect(result.ok).toBe(true);

    // The original segment became two, plus the new branch.
    expect(g.allSegments()).toHaveLength(3);
    const junction = g.allNodes().find((n) => n.segments.size === 3);
    expect(junction).toBeDefined();
    expect(g.isJunction(junction!.id)).toBe(true);
  });

  it("splits both roads when one crosses another in the middle", () => {
    const g = new RoadGraph();
    road(g, -60, 0, 60, 0);
    const result = road(g, 0, -60, 0, 60);

    expect(result.ok).toBe(true);
    expect(g.allSegments()).toHaveLength(4);
    const junction = g.allNodes().find((n) => n.segments.size === 4);
    expect(junction).toBeDefined();
    expect(junction!.pos.x).toBeCloseTo(0, 1);
    expect(junction!.pos.z).toBeCloseTo(0, 1);
  });
});

describe("validation", () => {
  it("refuses a segment below the minimum length, with a reason", () => {
    const result = validateSegment(v3(0, 0, 0), v3(2, 0, 0), v3(4, 0, 0), "street");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/short/i);
  });

  it("refuses a segment above the maximum gradient, with a reason", () => {
    // 100 m long, 60 m of rise: 60%.
    const result = validateSegment(v3(0, 0, 0), v3(50, 0, 0), v3(100, 60, 0), "street");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/steep/i);
  });

  it("accepts a gradient at the limit", () => {
    setTerrain({ heightAt: (x) => x * RULES.maxGradient });
    try {
      expect(validateSegment(v3(0, 0, 0), v3(50, 0, 0), v3(100, 100 * RULES.maxGradient, 0), "street").ok).toBe(true);
    } finally {
      setTerrain(flatTerrain);
    }
  });

  it("keeps a refused segment out of the graph", () => {
    const g = new RoadGraph();
    const before = g.allSegments().length;
    const result = road(g, 0, 0, 4, 0);
    expect(result.ok).toBe(false);
    expect(g.allSegments()).toHaveLength(before);
    expect(g.allNodes()).toHaveLength(0);
  });

  it("refuses a road that starts and ends at the same node", () => {
    const g = new RoadGraph();
    road(g, 0, 0, 60, 0);
    const snap = resolveSnap(g, 0, 0);
    const result = commitSegment(g, snap, snap, v3(30, 0, 30), "street");
    expect(result.ok).toBe(false);
  });

  it("enforces the gradient rule on real relief", () => {
    setTerrain({ heightAt: (x) => x * 0.6 });
    try {
      const g = new RoadGraph();
      const result = road(g, 0, 0, 100, 0);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.reason).toMatch(/steep/i);
    } finally {
      setTerrain(flatTerrain);
    }
  });

  it("lets tunnels pass through steep relief", () => {
    setTerrain({ heightAt: (x) => x * 0.6 });
    try {
      expect(validateSegment(v3(0, 0, 0), v3(50, 0, 0), v3(100, 60, 0), "tunnel").ok).toBe(true);
    } finally {
      setTerrain(flatTerrain);
    }
  });

  it("does not split surface roads when a tunnel crosses under them", () => {
    const g = new RoadGraph();
    expect(road(g, -60, 0, 60, 0).ok).toBe(true);
    const result = commitSegment(g, resolveSnap(g, 0, -60), resolveSnap(g, 0, 60), v3(0, 0, 0), "tunnel");

    expect(result.ok).toBe(true);
    expect(g.allSegments()).toHaveLength(2);
  });
});

describe("no angle snapping", () => {
  it("keeps an off-axis road off-axis", () => {
    const g = new RoadGraph();
    const from = resolveSnap(g, 0, 0);
    // 100 m out at roughly 7 degrees -- an angle any angle-snap would round away.
    const to = resolveSnap(g, 100, 12);
    expect(to.position.z).toBeCloseTo(12, 6);
    const result = commitSegment(g, from, to, v3(50, 0, 6), "street");
    expect(result.ok).toBe(true);
    const end = g.node(g.segment((result as { segmentId: number }).segmentId).b);
    expect(end.pos.z).toBeCloseTo(12, 6);
  });
});
