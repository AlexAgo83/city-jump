import { describe, it, expect } from "vitest";
import { RoadGraph, type NodeId } from "./graph";
import { junctionGeometry, ringLaneRadii } from "./junction";
import { laneCentres, roadType } from "./roadTypes";
import {
  armPort,
  exitAngle,
  junctionTurnPath,
  laneChangeOffset,
  laneChangeSpan,
  mergeAngle,
  onRing,
  pathCumulative,
  pointAlong,
  ringCrossPath,
  ringJoinPath,
  ringOf,
  ringSweep,
} from "./transfers";
import { distXZ, v3 } from "./vec";

function crossroads(type = "avenue_2lane", roundabout = false): { g: RoadGraph; hub: NodeId } {
  const g = new RoadGraph();
  const hub = g.addNode(0, 0);
  for (const [x, z] of [[-200, 0], [200, 0], [0, -200], [0, 200]]) {
    const end = g.addNode(x!, z!);
    g.addSegment(hub, end, v3(x! / 2, 0, z! / 2), type);
  }
  if (roundabout) g.setRoundabout(hub, true, 2);
  return { g, hub };
}

const radiusOf = (centre: { x: number; z: number }, p: { x: number; z: number }) =>
  Math.hypot(p.x - centre.x, p.z - centre.z);

describe("transfers", () => {
  it("joins the ring from the arm's own lane and lands on the ring lane it feeds", () => {
    const { g, hub } = crossroads("avenue_2lane", true);
    const geometry = junctionGeometry(g, hub);
    const ring = ringOf(g, geometry, ringLaneRadii(g, hub, geometry.roundabout));
    const arm = ring.arms[0]!;
    const lane = laneCentres(roadType("avenue_2lane"))[0]!;
    const radius = ring.radii[0]!;

    const merge = ringJoinPath(g, ring, arm, lane.offset, radius, true);
    const port = armPort(g, hub, arm, lane.offset);
    expect(distXZ(merge[0]!, port)).toBeLessThan(1e-6);
    expect(distXZ(merge[merge.length - 1]!, onRing(ring, mergeAngle(g, ring, arm), radius))).toBeLessThan(1e-6);
    // It arrives along the circle, not across it: the last step is nearly tangential.
    const last = merge[merge.length - 1]!;
    const before = merge[merge.length - 2]!;
    expect(Math.abs(radiusOf(ring.centre, last) - radiusOf(ring.centre, before))).toBeLessThan(0.5);

    // Leaving is the same curve the other way round, off the outer lane.
    const leave = ringJoinPath(g, ring, arm, lane.offset, ring.radii[1]!, false);
    expect(distXZ(leave[0]!, onRing(ring, exitAngle(g, ring, arm), ring.radii[1]!))).toBeLessThan(1e-6);
    expect(distXZ(leave[leave.length - 1]!, port)).toBeLessThan(1e-6);
  });

  it("crosses to the outer ring lane over the last quarter turn, and not before", () => {
    const { g, hub } = crossroads("avenue_2lane", true);
    const geometry = junctionGeometry(g, hub);
    const ring = ringOf(g, geometry, ringLaneRadii(g, hub, geometry.roundabout));
    const [inner, outer] = [ring.radii[0]!, ring.radii[1]!];

    const sweep = ringSweep(ring, 0, inner, Math.PI * 1.5, outer, 60);
    const radii = sweep.map((p) => radiusOf(ring.centre, p));
    expect(radii[0]!).toBeCloseTo(inner);
    expect(radii[radii.length - 1]!).toBeCloseTo(outer);
    // Still on the inner lane a quarter turn before the end.
    const quarterLeft = Math.round(((Math.PI * 1.5 - Math.PI / 2) / (Math.PI * 1.5)) * 60);
    expect(radii[quarterLeft]!).toBeCloseTo(inner, 1);
    // Never doubles back across the tarmac.
    expect(radii.every((r, i) => i === 0 || r >= radii[i - 1]! - 1e-9)).toBe(true);

    // Which is exactly the spiral the overlay draws before that arm.
    const drawn = ringCrossPath(g, ring, ring.arms[0]!);
    expect(radiusOf(ring.centre, drawn[0]!)).toBeCloseTo(inner);
    expect(radiusOf(ring.centre, drawn[drawn.length - 1]!)).toBeCloseTo(outer);
  });

  it("bows a junction turn towards the node instead of cutting straight across", () => {
    const { g, hub } = crossroads();
    const geometry = junctionGeometry(g, hub);
    const [from, to] = [geometry.arms[0]!, geometry.arms[1]!];
    const a = armPort(g, hub, from, 3);
    const b = armPort(g, hub, to, 3);
    const path = junctionTurnPath(g.node(hub).pos, a, b);

    expect(distXZ(path[0]!, a)).toBeLessThan(1e-6);
    expect(distXZ(path[path.length - 1]!, b)).toBeLessThan(1e-6);
    const middle = path[Math.floor(path.length / 2)]!;
    const chord = v3((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    expect(distXZ(middle, g.node(hub).pos)).toBeLessThan(distXZ(chord, g.node(hub).pos));
  });

  it("changes lane over the middle third of a road, easing in and out", () => {
    const span = laneChangeSpan(10, 110);
    expect(span).toEqual({ start: 45, end: 75 });
    expect(laneChangeOffset(-6, -2, 0)).toBe(-6);
    expect(laneChangeOffset(-6, -2, 1)).toBe(-2);
    expect(laneChangeOffset(-6, -2, 0.5)).toBeCloseTo(-4);
    // Eased, so it leaves and arrives gently rather than at a constant sidestep.
    expect(laneChangeOffset(0, 1, 0.1)).toBeLessThan(0.1);
    expect(laneChangeOffset(0, 1, 0.9)).toBeGreaterThan(0.9);
  });

  it("walks a path by ground distance", () => {
    const points = [v3(0, 0, 0), v3(10, 0, 0), v3(10, 0, 10)];
    const cumulative = pathCumulative(points);
    expect(cumulative).toEqual([0, 10, 20]);
    expect(pointAlong(points, cumulative, 15).position.z).toBeCloseTo(5);
    expect(pointAlong(points, cumulative, 15).tangent.z).toBeCloseTo(1);
    // Off either end it clamps rather than running off the polyline.
    expect(pointAlong(points, cumulative, 999).position.z).toBeCloseTo(10);
  });
});
