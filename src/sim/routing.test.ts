import { describe, it, expect } from "vitest";
import { RoadGraph } from "./graph";
import { approach, exits, laneRank, pickExit, ringArc, ringEntryRadius, ringTargetRadius } from "./routing";
import { ringLaneRadii } from "./junction";
import { perpXZ, v3, type Vec3 } from "./vec";
import { laneCentres, roadType } from "./roadTypes";

describe("routing", () => {
  it("never leaves a node against a one-way", () => {
    const g = new RoadGraph();
    const hub = g.addNode(0, 0);
    const west = g.addNode(-100, 0);
    const east = g.addNode(100, 0);
    const arrive = g.addSegment(west, hub, v3(-50, 0, 0), "street");
    // One-way pointing at the hub: leaving on it would be driving the wrong way.
    g.addSegment(east, hub, v3(50, 0, 0), "street_oneway");
    // The wrong-way arm is not an option, so the only move left is back down the street.
    expect(exits(g, hub, arrive)).toEqual([arrive]);
    expect(pickExit(g, hub, arrive, 0.99)).toBe(arrive);

    // Arrive on a one-way and there is nothing legal at all.
    const stub = g.addNode(0, 100);
    const oneWayIn = g.addSegment(hub, stub, v3(0, 0, 50), "street_oneway");
    expect(pickExit(g, stub, oneWayIn, 0.5)).toBe(null);
  });

  it("prefers going on to doubling back, and doubles back at a dead end", () => {
    const g = new RoadGraph();
    const hub = g.addNode(0, 0);
    const west = g.addNode(-100, 0);
    const east = g.addNode(100, 0);
    const arrive = g.addSegment(west, hub, v3(-50, 0, 0), "street");
    const onward = g.addSegment(hub, east, v3(50, 0, 0), "street");
    expect(exits(g, hub, arrive)).toEqual([onward]);
    expect(pickExit(g, west, arrive, 0.5)).toBe(arrive);
  });

  it("skips footpaths and tunnels", () => {
    const g = new RoadGraph();
    const hub = g.addNode(0, 0);
    const a = g.addNode(-100, 0);
    const b = g.addNode(100, 0);
    const arrive = g.addSegment(a, hub, v3(-50, 0, 0), "street");
    g.addSegment(hub, b, v3(50, 0, 0), "pedestrian");
    expect(exits(g, hub, arrive)).toEqual([arrive]);
  });

  it("takes the ring the one way round, and a full lap to come back out the same arm", () => {
    expect(ringArc(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(ringArc(Math.PI / 2, 0)).toBeCloseTo(Math.PI * 1.5);
    expect(ringArc(1, 1)).toBeCloseTo(Math.PI * 2);
  });

  it("feeds each arm lane into its own ring lane, and comes back out to exit", () => {
    const g = new RoadGraph();
    const hub = g.addNode(0, 0);
    for (const [x, z] of [[-100, 0], [100, 0], [0, 100], [0, -100]]) {
      const end = g.addNode(x!, z!);
      g.addSegment(hub, end, v3(x! / 2, 0, z! / 2), "avenue_2lane");
    }
    g.setRoundabout(hub, true, 2);
    const radii = ringLaneRadii(g, hub);
    const [inner, outer] = [radii[0]!, radii[1]!];
    expect(inner).toBeLessThan(outer);

    // The kerb-side lane is rank 0 whichever way the road runs, and it joins the outer ring lane.
    const lanes = laneCentres(roadType("avenue_2lane"));
    const outbound = lanes.filter((l) => l.direction === 1);
    const inbound = lanes.filter((l) => l.direction === -1);
    for (const side of [outbound, inbound]) {
      const kerb = side.find((l) => laneRank(lanes, l) === 0)!;
      const centreSide = side.find((l) => laneRank(lanes, l) === 1)!;
      expect(Math.abs(kerb.offset)).toBeGreaterThan(Math.abs(centreSide.offset));
      expect(ringEntryRadius(radii, laneRank(lanes, kerb))).toBe(outer);
      expect(ringEntryRadius(radii, laneRank(lanes, centreSide))).toBe(inner);
    }

    // Joined on the inner lane, a car holds it until the exit is close, then aims for the outer.
    expect(ringTargetRadius(radii, inner, Math.PI)).toBe(inner);
    expect(ringTargetRadius(radii, inner, Math.PI / 4)).toBe(outer);
    // A one-lane ring has nothing to choose.
    expect(ringEntryRadius([12], 1)).toBe(12);
    expect(ringTargetRadius([12], 12, Math.PI)).toBe(12);
  });

  it("circulates the ring on the same side of the road cars already drive on", () => {
    // Which way "right of travel" points in this world, read off the lane a car actually uses:
    // a direction-1 lane sits to the right, and `perpXZ` is how that offset gets applied.
    const rightOf = (t: Vec3): Vec3 => v3(t.z, 0, -t.x);
    const heading = v3(0, 0, 1);
    const lane = laneCentres(roadType("street")).find((l) => l.direction === 1)!;
    const onRoad = perpXZ(heading).x * lane.offset;
    expect(Math.sign(onRoad)).toBe(Math.sign(rightOf(heading).x));

    // `ringArc` sends cars round in the direction of a growing bearing. That has to leave the
    // island on the driver's left, or every roundabout runs backwards.
    const angle = 0.7;
    const tangent = v3(-Math.sin(angle), 0, Math.cos(angle));
    const inward = v3(-Math.cos(angle), 0, -Math.sin(angle));
    const right = rightOf(tangent);
    expect(right.x * inward.x + right.z * inward.z).toBeLessThan(0);
  });

  it("slides across to the next lane instead of jumping", () => {
    let offset = -6;
    const steps: number[] = [];
    for (let i = 0; i < 10; i++) steps.push((offset = approach(offset, -2.5, 1)));
    // Every step is a real move of at most the cap, and it settles exactly on the lane.
    expect(Math.max(...steps.map((s, i) => Math.abs(s - (steps[i - 1] ?? -6))))).toBeLessThanOrEqual(1);
    expect(offset).toBe(-2.5);
    expect(approach(-2.5, -2.5, 1)).toBe(-2.5);
  });
});
