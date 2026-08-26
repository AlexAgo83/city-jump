import { describe, it, expect } from "vitest";
import { RoadGraph } from "./graph";
import { v3, distXZ } from "./vec";
import { setTerrain, flatTerrain, terrainHeight } from "./terrain";

function straight(g: RoadGraph, x0: number, z0: number, x1: number, z1: number) {
  const a = g.addNode(x0, z0);
  const b = g.addNode(x1, z1);
  return { a, b, id: g.addSegment(a, b, v3((x0 + x1) / 2, 0, (z0 + z1) / 2)) };
}

/** A quarter-circle-ish arc: control point pulled off the chord. */
function curved(g: RoadGraph) {
  const a = g.addNode(0, 0);
  const b = g.addNode(100, 100);
  return { a, b, id: g.addSegment(a, b, v3(100, 0, 0)) };
}

describe("graph basics", () => {
  it("creates, resolves and removes nodes and segments", () => {
    const g = new RoadGraph();
    const { a, b, id } = straight(g, 0, 0, 50, 0);
    const seg = g.segment(id);
    expect(seg.a).toBe(a);
    expect(seg.b).toBe(b);
    expect(seg.control).toEqual(v3(25, 0, 0));
    expect(g.node(a).segments.has(id)).toBe(true);

    g.removeSegment(id);
    expect(g.allSegments()).toHaveLength(0);
    // Nodes left with no segments go with them.
    expect(g.allNodes()).toHaveLength(0);
  });

  it("reports a segment length that matches the straight-line distance", () => {
    const g = new RoadGraph();
    const { id } = straight(g, 0, 0, 60, 0);
    expect(g.segment(id).length).toBeCloseTo(60, 3);
  });

  it("counts a node with three incident segments as a junction", () => {
    const g = new RoadGraph();
    const hub = g.addNode(0, 0);
    for (const [x, z] of [
      [40, 0],
      [-40, 0],
      [0, 40],
    ] as const) {
      const end = g.addNode(x, z);
      g.addSegment(hub, end, v3(x / 2, 0, z / 2));
    }
    expect(g.isJunction(hub)).toBe(true);
  });
});

describe("arc-length parameterisation", () => {
  it("spaces points evenly on a curve, not just on a straight", () => {
    const g = new RoadGraph();
    const arc = curved(g);
    const pts = g.pointsEvery(arc.id, 10);
    // Every gap is the requested spacing, including through the tightest part of the bend.
    for (let i = 1; i < pts.length; i++) {
      expect(distXZ(pts[i - 1]!.position, pts[i]!.position)).toBeCloseTo(10, 0);
    }
  });

  it("returns the same count on a straight and on a curve of the same length", () => {
    const g = new RoadGraph();
    const arc = curved(g);
    const len = g.segment(arc.id).length;
    const line = straight(g, 0, 500, len, 500);
    expect(g.segment(line.id).length).toBeCloseTo(len, 3);
    expect(g.pointsEvery(arc.id, 8)).toHaveLength(g.pointsEvery(line.id, 8).length);
  });

  it("clamps a distance past the end to the end", () => {
    const g = new RoadGraph();
    const { id } = straight(g, 0, 0, 40, 0);
    expect(g.pointAt(id, 10_000).position.x).toBeCloseTo(40, 3);
    expect(g.pointAt(id, -10).position.x).toBeCloseTo(0, 3);
  });

  it("points its tangent along the road", () => {
    const g = new RoadGraph();
    const { id } = straight(g, 0, 0, 40, 0);
    const t = g.pointAt(id, 20).tangent;
    expect(t.x).toBeCloseTo(1, 3);
    expect(t.z).toBeCloseTo(0, 3);
  });
});

describe("split", () => {
  it("yields two segments sharing a node that together trace the original curve", () => {
    const g = new RoadGraph();
    const arc = curved(g);
    const original = g.segment(arc.id);
    const total = original.length;
    // Sample the original before it is destroyed.
    const before = g.pointsEvery(arc.id, 5).map((p) => p.position);

    const mid = g.splitSegment(arc.id, total * 0.4);
    const [left, right] = g.allSegments();
    expect(g.allSegments()).toHaveLength(2);
    expect(g.node(mid).segments.size).toBe(2);
    expect(left!.length + right!.length).toBeCloseTo(total, 1);

    // Each original sample still lies on one of the two halves.
    for (const p of before) {
      const onLeft = g.nearestOnSegment(p.x, p.z, 0.5);
      expect(onLeft).not.toBeNull();
    }
  });

  it("splits a straight into two halves of the expected length", () => {
    const g = new RoadGraph();
    const { id } = straight(g, 0, 0, 100, 0);
    g.splitSegment(id, 30);
    const lengths = g.allSegments().map((s) => s.length).sort((x, y) => x - y);
    expect(lengths[0]).toBeCloseTo(30, 1);
    expect(lengths[1]).toBeCloseTo(70, 1);
  });
});

describe("elevation", () => {
  it("reads every node elevation from the terrain function", () => {
    setTerrain({ heightAt: (x) => x / 10 });
    try {
      const g = new RoadGraph();
      const n = g.addNode(50, 0);
      expect(g.node(n).pos.y).toBeCloseTo(5, 6);
      expect(terrainHeight(50, 0)).toBeCloseTo(5, 6);
    } finally {
      setTerrain(flatTerrain);
    }
  });

  it("interpolates elevation along the segment and reports a constant gradient", () => {
    setTerrain({ heightAt: (x) => (x >= 100 ? 10 : 0) });
    let id: number;
    let g: RoadGraph;
    try {
      g = new RoadGraph();
      const a = g.addNode(0, 0);
      const b = g.addNode(100, 0);
      id = g.addSegment(a, b, v3(50, 0, 0));
    } finally {
      setTerrain(flatTerrain);
    }
    expect(g!.gradient(id!)).toBeCloseTo(0.1, 6);
    expect(g!.pointAt(id!, 50).position.y).toBeCloseTo(5, 1);
    expect(g!.pointAt(id!, 100).position.y).toBeCloseTo(10, 3);
  });

  it("is flat when the terrain is flat", () => {
    const g = new RoadGraph();
    const { id } = straight(g, 0, 0, 100, 0);
    expect(g.gradient(id)).toBe(0);
  });
});

describe("nearest queries", () => {
  it("finds a node inside the radius and nothing outside it", () => {
    const g = new RoadGraph();
    straight(g, 0, 0, 60, 0);
    expect(g.nearestNode(3, 3, 8)).not.toBeNull();
    expect(g.nearestNode(30, 30, 8)).toBeNull();
  });

  it("finds a point on a segment and the distance along it", () => {
    const g = new RoadGraph();
    straight(g, 0, 0, 100, 0);
    const hit = g.nearestOnSegment(40, 2, 5);
    expect(hit).not.toBeNull();
    expect(hit!.distance).toBeCloseTo(40, 0);
  });
});
