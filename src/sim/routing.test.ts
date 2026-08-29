import { describe, it, expect } from "vitest";
import { RoadGraph } from "./graph";
import { exits, laneRank, pickExit, ringArc, ringEntryRadius } from "./routing";
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

    // A one-lane ring has nothing to choose.
    expect(ringEntryRadius([12], 1)).toBe(12);
  });

  it("lets people on foot use what traffic cannot, and keeps them off a highway", () => {
    const g = new RoadGraph();
    const hub = g.addNode(0, 0);
    const west = g.addNode(-100, 0);
    const east = g.addNode(100, 0);
    const north = g.addNode(0, -100);
    const arrive = g.addSegment(west, hub, v3(-50, 0, 0), "street");
    const path = g.addSegment(hub, east, v3(50, 0, 0), "pedestrian");
    const fast = g.addSegment(hub, north, v3(0, 0, -50), "highway");

    // A footpath is the one way on for someone walking, and closed to traffic.
    expect(exits(g, hub, arrive, true)).toContain(path);
    expect(exits(g, hub, arrive, true)).not.toContain(fast);
    expect(exits(g, hub, arrive)).toEqual([fast]);

    // A one-way binds traffic, not a pavement beside it.
    const stub = g.addNode(0, 100);
    const oneWay = g.addSegment(hub, stub, v3(0, 0, 50), "street_oneway");
    expect(exits(g, stub, oneWay, true)).toEqual([oneWay]);
    expect(pickExit(g, stub, oneWay, 0.5)).toBe(null);
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

});
