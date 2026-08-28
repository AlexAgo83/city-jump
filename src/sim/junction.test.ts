import { describe, it, expect } from "vitest";
import { RoadGraph, type NodeId } from "./graph";
import { junctionGeometry, allJunctions, segmentTrims, junctionRadius, roundaboutRadius } from "./junction";
import { v3, type Vec3 } from "./vec";
import { roadType } from "./roadTypes";

/** Spokes leaving a hub at the given bearings, in degrees. */
function hub(bearings: number[], type = "street", length = 200): { g: RoadGraph; node: NodeId } {
  const g = new RoadGraph();
  const node = g.addNode(0, 0);
  for (const deg of bearings) {
    const r = (deg * Math.PI) / 180;
    const x = Math.cos(r) * length;
    const z = Math.sin(r) * length;
    const end = g.addNode(x, z);
    g.addSegment(node, end, v3(x / 2, 0, z / 2), type);
  }
  return { g, node };
}

function area(ring: readonly Vec3[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    sum += a.x * b.z - b.x * a.z;
  }
  return Math.abs(sum) / 2;
}

/** True when no two non-adjacent edges of the ring cross: the polygon closes cleanly. */
function isSimple(ring: readonly Vec3[]): boolean {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i || (j + 1) % n === i || (i + 1) % n === j) continue;
      if (crosses(ring[i]!, ring[(i + 1) % n]!, ring[j]!, ring[(j + 1) % n]!)) return false;
    }
  }
  return true;
}

function crosses(a: Vec3, b: Vec3, c: Vec3, d: Vec3): boolean {
  const side = (p: Vec3, q: Vec3, r: Vec3) => Math.sign((q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x));
  return side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b);
}

describe("junction geometry", () => {
  it("has nothing to build at a dead end", () => {
    const { g, node } = hub([0]);
    const geometry = junctionGeometry(g, node);
    expect(geometry.ring).toHaveLength(0);
    expect(allJunctions(g).size).toBe(0);
  });

  it("closes a crossroads with a simple polygon", () => {
    const { g, node } = hub([0, 90, 180, 270]);
    const geometry = junctionGeometry(g, node);
    expect(geometry.arms).toHaveLength(4);
    // At right angles each pair of neighbouring arms meets at the same corner, so the hull is the
    // central square rather than eight distinct points.
    expect(geometry.ring.length).toBeGreaterThanOrEqual(4);
    expect(area(geometry.ring)).toBeGreaterThan(0);
    expect(isSimple(geometry.ring)).toBe(true);
  });

  it("keeps a crossroads about as wide as the roads crossing it", () => {
    const { g, node } = hub([0, 90, 180, 270]);
    const half = roadType("street").width / 2;
    const geometry = junctionGeometry(g, node);
    const reach = Math.max(...geometry.ring.map((p) => Math.hypot(p.x, p.z)));
    // The square corner sits at half*sqrt(2); anything much past that is the junction spilling
    // out over the pavements either side of it.
    expect(reach).toBeLessThan(half * 1.8);
    for (const arm of geometry.arms) expect(arm.trim).toBeLessThanOrEqual(half * 1.2);
  });

  it("closes a two-arm bend", () => {
    const { g, node } = hub([0, 120]);
    const geometry = junctionGeometry(g, node);
    expect(geometry.arms).toHaveLength(2);
    expect(area(geometry.ring)).toBeGreaterThan(0);
    expect(isSimple(geometry.ring)).toBe(true);
  });

  it("closes a five-arm junction", () => {
    const { g, node } = hub([0, 70, 140, 210, 280]);
    const geometry = junctionGeometry(g, node);
    expect(geometry.arms).toHaveLength(5);
    expect(area(geometry.ring)).toBeGreaterThan(0);
    expect(isSimple(geometry.ring)).toBe(true);
  });

  it("stays closed when two roads arrive at a narrow angle", () => {
    for (const narrow of [30, 18, 10, 6]) {
      const { g, node } = hub([0, narrow, 180]);
      const geometry = junctionGeometry(g, node);
      expect(area(geometry.ring), `${narrow} degrees`).toBeGreaterThan(0);
      expect(isSimple(geometry.ring), `${narrow} degrees`).toBe(true);
    }
  });

  it("pulls an arm back further the narrower its angle to a neighbour", () => {
    const wide = junctionGeometry(...([hub([0, 90, 180]).g, 1] as [RoadGraph, NodeId]));
    const tight = junctionGeometry(...([hub([0, 20, 180]).g, 1] as [RoadGraph, NodeId]));
    const trimOf = (geometry: ReturnType<typeof junctionGeometry>) =>
      Math.max(...geometry.arms.map((a) => a.trim));
    expect(trimOf(tight)).toBeGreaterThan(trimOf(wide));
  });

  it("never eats more than its share of a short segment", () => {
    const { g, node } = hub([0, 5, 180], "avenue", 20);
    const geometry = junctionGeometry(g, node);
    for (const arm of geometry.arms) {
      expect(arm.trim).toBeLessThanOrEqual(g.segment(arm.segment).length * 0.4 + 1e-6);
      expect(arm.trim).toBeGreaterThan(0);
    }
    expect(isSimple(geometry.ring)).toBe(true);
  });

  it("reports the trim each segment gives up at each end", () => {
    const g = new RoadGraph();
    const a = g.addNode(-200, 0);
    const b = g.addNode(0, 0);
    const c = g.addNode(200, 0);
    const d = g.addNode(0, 200);
    const left = g.addSegment(a, b, v3(-100, 0, 0));
    g.addSegment(b, c, v3(100, 0, 0));
    g.addSegment(b, d, v3(0, 0, 100));

    const junctions = allJunctions(g);
    const trims = segmentTrims(junctions, g, left);
    // `a` is a dead end and gives up nothing; `b` is the junction.
    expect(trims.start).toBe(0);
    expect(trims.end).toBeGreaterThan(0);
  });

  it("recomputes when an incident segment changes", () => {
    const { g, node } = hub([0, 90, 180]);
    const before = junctionGeometry(g, node).arms.length;
    const extra = g.addNode(0, -200);
    g.addSegment(node, extra, v3(0, 0, -100));
    expect(junctionGeometry(g, node).arms).toHaveLength(before + 1);
  });
});

describe("roundabouts", () => {
  it("pulls every arm back to the ring, whatever angle it arrives on", () => {
    const g = new RoadGraph();
    const centre = g.addNode(0, 0);
    const arms = [
      [200, 0],
      [-200, 30], // deliberately not opposite, so the angle-driven trim would differ per arm
      [0, 200],
    ].map(([x, z]) => {
      const end = g.addNode(x!, z!);
      return g.addSegment(centre, end, v3(x! / 2, 0, z! / 2));
    });

    const before = junctionGeometry(g, centre).arms.map((arm) => arm.trim);
    expect(new Set(before.map((t) => t.toFixed(2))).size).toBeGreaterThan(1);

    g.setRoundabout(centre, true);
    const geometry = junctionGeometry(g, centre);
    const radius = roundaboutRadius(g, centre);
    expect(geometry.arms).toHaveLength(arms.length);
    for (const arm of geometry.arms) expect(arm.trim).toBeCloseTo(radius, 5);
  });

  it("sizes the ring off the widest road meeting it", () => {
    const street = new RoadGraph();
    const a = street.addNode(0, 0);
    street.addSegment(a, street.addNode(200, 0), v3(100, 0, 0), "street");
    street.addSegment(a, street.addNode(0, 200), v3(0, 0, 100), "street");

    const avenue = new RoadGraph();
    const b = avenue.addNode(0, 0);
    avenue.addSegment(b, avenue.addNode(200, 0), v3(100, 0, 0), "avenue");
    avenue.addSegment(b, avenue.addNode(0, 200), v3(0, 0, 100), "street");

    expect(roundaboutRadius(avenue, b)).toBeGreaterThan(roundaboutRadius(street, a));
  });

  it("draws no filler polygon, but still appears so roads get trimmed", () => {
    const g = new RoadGraph();
    const centre = g.addNode(0, 0);
    g.addSegment(centre, g.addNode(200, 0), v3(100, 0, 0));
    g.addSegment(centre, g.addNode(0, 200), v3(0, 0, 100));
    g.setRoundabout(centre, true);

    const geometry = junctionGeometry(g, centre);
    expect(geometry.ring).toEqual([]);
    expect(geometry.roundabout).toBeGreaterThan(0);
    expect(allJunctions(g).has(centre)).toBe(true);
  });

  it("refuses a node with nothing meeting it", () => {
    const g = new RoadGraph();
    const lonely = g.addNode(0, 0);
    expect(g.setRoundabout(lonely, true)).toBe(false);
    expect(g.node(lonely).roundabout).toBe(false);
  });

  it("keeps frontage clear of the whole ring", () => {
    const g = new RoadGraph();
    const centre = g.addNode(0, 0);
    g.addSegment(centre, g.addNode(200, 0), v3(100, 0, 0));
    g.addSegment(centre, g.addNode(0, 200), v3(0, 0, 100));

    const plain = junctionRadius(g, centre);
    g.setRoundabout(centre, true);
    expect(junctionRadius(g, centre)).toBeCloseTo(roundaboutRadius(g, centre), 5);
    expect(junctionRadius(g, centre)).toBeGreaterThan(plain);
  });
});
