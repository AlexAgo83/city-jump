import { describe, it, expect } from "vitest";
import { RoadGraph, type NodeId } from "./graph";
import { junctionGeometry, ringLaneRadii } from "./junction";
import { laneCentres, roadType } from "./roadTypes";
import {
  CROSSING_DEPTH,
  CROSSING_GAP,
  armPort,
  crossesRoad,
  walkLoop,
  walkLoopSlice,
  junctionTurnPath,
  laneChangeOffset,
  laneChangeSpan,
  onRing,
  ringBearing,
  ringLaneAngle,
  pathCumulative,
  pointAlong,
  ringCrossPath,
  ringJoinPath,
  ringArcPath,
  ringOf,
  ringSweep,
  walkRingRadius,
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
    expect(
      distXZ(merge[merge.length - 1]!, onRing(ring, ringLaneAngle(g, ring, arm, lane.offset, true), radius)),
    ).toBeLessThan(1e-6);
    // The join starts from where that lane actually meets the ring, not from the middle of the
    // arm: measured from the lane's own bearing, it only has to lean round by the blend.
    expect(Math.abs(ringLaneAngle(g, ring, arm, lane.offset, true) - ringBearing(ring, port))).toBeLessThan(0.51);
    // It arrives along the circle, not across it: the last step is nearly tangential.
    const last = merge[merge.length - 1]!;
    const before = merge[merge.length - 2]!;
    expect(Math.abs(radiusOf(ring.centre, last) - radiusOf(ring.centre, before))).toBeLessThan(0.5);

    // Leaving is the same curve the other way round, off the outer lane.
    const leave = ringJoinPath(g, ring, arm, lane.offset, ring.radii[1]!, false);
    expect(distXZ(leave[0]!, onRing(ring, ringLaneAngle(g, ring, arm, lane.offset, false), ring.radii[1]!))).toBeLessThan(1e-6);
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
    const drawn = ringCrossPath(g, ring, ring.arms[0]!, laneCentres(roadType("avenue_2lane"))[0]!.offset);
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

  it("takes the short way round the ring on foot, either direction", () => {
    const { g, hub } = crossroads("street", true);
    const geometry = junctionGeometry(g, hub);
    const ring = ringOf(g, geometry, ringLaneRadii(g, hub, geometry.roundabout));
    const radius = walkRingRadius(ring, 2.6);
    expect(radius).toBeGreaterThan(ring.edge); // outside the kerb, on the paving

    // Three quarters of a turn one way is a quarter the other, and that is the way to walk it.
    const back = ringArcPath(ring, 0, Math.PI * 1.5, radius, 12);
    expect(back.length).toBeLessThan(ringArcPath(ring, 0, Math.PI, radius, 12).length + 1);
    for (const point of back) expect(radiusOf(ring.centre, point)).toBeCloseTo(radius);
    // It starts and ends on the bearings asked for, whichever way it went round.
    expect(Math.atan2(back[0]!.z - ring.centre.z, back[0]!.x - ring.centre.x)).toBeCloseTo(0);
    const last = back[back.length - 1]!;
    expect(Math.abs(Math.atan2(last.z - ring.centre.z, last.x - ring.centre.x) + Math.PI / 2)).toBeCloseTo(0);
  });

  it("walks round a junction rather than across it, one road at a time", () => {
    const { g, hub } = crossroads("street");
    const geometry = junctionGeometry(g, hub);
    const room = (arm: { segment: number; trim: number }) => g.segment(arm.segment).length - arm.trim;
    const loop = walkLoop(g, geometry, 2.6, room);
    const centre = g.node(hub).pos;

    // Two walkways per arm, and the loop closes round all of them.
    expect(loop.ports).toHaveLength(8);
    const junctionReach = Math.max(...geometry.arms.map((arm) => arm.trim));
    // Nothing on it cuts through the middle: every point stays out by the junction's own reach,
    // less half a road's width for the crossings that run over an arm.
    const widest = Math.max(...geometry.arms.map((arm) => roadType(g.segment(arm.segment).type).width));
    for (const point of loop.points) {
      expect(distXZ(point, centre)).toBeGreaterThan(junctionReach - widest / 2);
    }

    // From one arm's pavement to the next one round: the short way, and over one road at most.
    const [from, to] = [loop.ports[0]!, loop.ports[1]!];
    const slice = walkLoopSlice(loop, from.index, to.index);
    expect(distXZ(slice[0]!, loop.points[from.index]!)).toBeLessThan(1e-6);
    expect(distXZ(slice[slice.length - 1]!, loop.points[to.index]!)).toBeLessThan(1e-6);
    const crossed = geometry.arms.filter((arm) =>
      crossesRoad(centre, arm.outward, arm.trim + CROSSING_GAP + CROSSING_DEPTH * 2, [slice]),
    );
    expect(crossed.length).toBeLessThanOrEqual(1);

    // The long way round is never taken when the short way exists.
    const far = walkLoopSlice(loop, from.index, loop.ports[4]!.index);
    expect(far.length).toBeLessThan(loop.points.length);
  });

  it("sees a crossing even where a closed path starts on the road it crosses", () => {
    const node = v3(0, 0, 0);
    const outward = v3(1, 0, 0); // a road running east out of the node
    const circle = (steps: number) =>
      Array.from({ length: steps + 1 }, (_, i) => {
        const angle = (i / steps) * Math.PI * 2;
        return v3(Math.cos(angle) * 20, 0, Math.sin(angle) * 20);
      });

    // The footway ring: its first and last point sit exactly on this arm's centreline, so the
    // side it changes over happens across the join rather than at any one step.
    expect(crossesRoad(node, outward, 30, [circle(64)])).toBe(true);
    // Out of reach of the node, the same circle marks nothing.
    expect(crossesRoad(node, outward, 10, [circle(64)])).toBe(false);
    // A path that walks straight over the road, and one that keeps to one side of it.
    expect(crossesRoad(node, outward, 30, [[v3(10, 0, -8), v3(10, 0, 8)]])).toBe(true);
    expect(crossesRoad(node, outward, 30, [[v3(10, 0, 4), v3(40, 0, 8)]])).toBe(false);
    // Crossing the same line behind the node is another arm's business, not this one's.
    expect(crossesRoad(node, outward, 30, [[v3(-10, 0, -8), v3(-10, 0, 8)]])).toBe(false);
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
