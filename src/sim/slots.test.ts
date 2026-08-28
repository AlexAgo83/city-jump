import { describe, it, expect } from "vitest";
import { RoadGraph } from "./graph";
import { slotsForSegment, allSlots, buildableCells, cellsOverlap, GRID, SLOT } from "./slots";
import { junctionRadius } from "./junction";
import { v3, distXZ } from "./vec";
import { roadType } from "./roadTypes";

function straight(g: RoadGraph, x0: number, z0: number, x1: number, z1: number, type = "street") {
  const a = g.addNode(x0, z0);
  const b = g.addNode(x1, z1);
  return g.addSegment(a, b, v3((x0 + x1) / 2, 0, (z0 + z1) / 2), type);
}

describe("slots", () => {
  it("spaces slots evenly by arc length on a curve", () => {
    const g = new RoadGraph();
    const a = g.addNode(0, 0);
    const b = g.addNode(200, 200);
    const id = g.addSegment(a, b, v3(200, 0, 0));

    const left = slotsForSegment(g, id).filter((s) => s.side === 1);
    expect(left.length).toBeGreaterThan(3);
    for (let i = 1; i < left.length; i++) {
      // Offset to the side of a bend, spacing stretches on the outside; the frontage
      // it was measured on is the road centre line, and that is what stays even.
      const gap = distXZ(left[i - 1]!.position, left[i]!.position);
      expect(gap).toBeGreaterThan(SLOT.spacing * 0.6);
      expect(gap).toBeLessThan(SLOT.spacing * 1.6);
    }
  });

  it("puts a slot on each side, offset by half the road plus the setback", () => {
    const g = new RoadGraph();
    const id = straight(g, 0, 0, 200, 0);
    const expected = roadType("street").width / 2 + SLOT.setback;

    const slots = slotsForSegment(g, id);
    expect(slots.filter((s) => s.side === 1)).toHaveLength(slots.length / 2);
    for (const slot of slots) {
      // The road runs along x, so the whole offset is in z.
      expect(Math.abs(slot.position.z)).toBeCloseTo(expected, 3);
    }
  });

  it("faces each slot back at the road", () => {
    const g = new RoadGraph();
    const id = straight(g, 0, 0, 200, 0);
    for (const slot of slotsForSegment(g, id)) {
      // Model front is +Z; rotated by rotationY it must point at the road centre line.
      const fx = Math.sin(slot.rotationY);
      const fz = Math.cos(slot.rotationY);
      const toRoad = { x: 0 - slot.position.x, z: 0 - slot.position.z };
      // Only the across-road component matters, and it must have the same sign.
      expect(Math.sign(fz)).toBe(Math.sign(toRoad.z));
      expect(Math.abs(fx)).toBeLessThan(1e-6);
    }
  });

  it("suppresses slots inside a junction radius", () => {
    const g = new RoadGraph();
    const hub = g.addNode(0, 0);
    for (const [x, z] of [
      [200, 0],
      [-200, 0],
      [0, 200],
    ] as const) {
      const end = g.addNode(x, z);
      g.addSegment(hub, end, v3(x / 2, 0, z / 2));
    }
    expect(g.isJunction(hub)).toBe(true);

    const radius = junctionRadius(g, hub);
    for (const slot of allSlots(g)) {
      expect(distXZ(slot.position, g.node(hub).pos)).toBeGreaterThan(radius);
    }
  });

  it("gives a segment too short to hold one building no slots", () => {
    const g = new RoadGraph();
    const id = straight(g, 0, 0, 10, 0);
    expect(slotsForSegment(g, id)).toHaveLength(0);
  });

  it("regenerates slots when the segment changes", () => {
    const g = new RoadGraph();
    const id = straight(g, 0, 0, 200, 0);
    const before = allSlots(g).length;
    g.splitSegment(id, 100);
    const after = allSlots(g).length;
    // Two halves with a shared node in the middle hold fewer than the whole did.
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  it("sets slots back further on a wider road", () => {
    const g = new RoadGraph();
    const street = straight(g, 0, 0, 200, 0, "street");
    const avenue = straight(g, 0, 400, 200, 400, "avenue");
    const streetOffset = Math.abs(slotsForSegment(g, street)[0]!.position.z);
    const avenueOffset = Math.abs(slotsForSegment(g, avenue)[0]!.position.z - 400);
    expect(avenueOffset).toBeGreaterThan(streetOffset);
  });

  it("does not place buildings along tunnels", () => {
    const g = new RoadGraph();
    const tunnel = straight(g, 0, 0, 200, 0, "tunnel");
    expect(slotsForSegment(g, tunnel)).toHaveLength(0);
  });

  it("rejects overlapping grid cells around crossing roads", () => {
    const g = new RoadGraph();
    straight(g, -60, 0, 60, 0);
    straight(g, 0, -60, 0, 60);

    const cells = buildableCells(g);
    const rawCount = allSlots(g).length * GRID.depth * (SLOT.spacing / GRID.cellSize);
    expect(cells.length).toBeLessThan(rawCount);
    expect(cells.some((cell, i) => cells.slice(i + 1).some((other) => cellsOverlap(cell, other)))).toBe(false);
  });

  it("rejects grid cells that cross a nearby road", () => {
    const g = new RoadGraph();
    straight(g, -100, 0, 100, 0);
    straight(g, -100, 24, 100, 24);

    for (const cell of buildableCells(g)) {
      const zs = cell.corners.map((p) => p.z);
      expect(!(Math.min(...zs) < 24 && Math.max(...zs) > 24)).toBe(true);
    }
  });

  it("keeps deep zoning rows on both sides of a curve", () => {
    const g = new RoadGraph();
    const a = g.addNode(0, 0);
    const b = g.addNode(200, 0);
    const id = g.addSegment(a, b, v3(100, 0, 100));
    const cells = buildableCells(g).filter((cell) => cell.segment === id);

    for (const side of [1, -1] as const) {
      const front = cells.filter((cell) => cell.side === side && cell.row === 0).length;
      const back = cells.filter((cell) => cell.side === side && cell.row === GRID.depth - 1).length;
      expect(back).toBeGreaterThan(front / 2);
    }
  });
});
