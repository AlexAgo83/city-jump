import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Meshes/instancedMesh";

import { RoadGraph, type Segment } from "../sim/graph";
import type { JunctionArm } from "../sim/junction";
import { v3 } from "../sim/vec";
import {
  circularQueueRooms,
  accelerateToward,
  atSegmentLimit,
  chooseLaneEntry,
  choosePlanAhead,
  joinLaneQueue,
  laneQueueIsOrdered,
  laneStartBlocked,
  leaveLaneQueue,
  landingDistance,
  pedestrianCanCross,
  pedestrianCanStartCrossing,
  roomAhead,
  roundaboutEntryBlocked,
  roundaboutExitBlocked,
  scaledTrafficCount,
  segmentLimit,
  speedForRoom,
  stopTarget,
  stopLineDistance,
  trafficLaneOffset,
  trimTransferFromMover,
  uTurnPath,
  walkJunctionTransfer,
} from "../sim/traffic";
import { createTrafficRenderer } from "./traffic";

describe("traffic queues", () => {
  it("scales traffic counts without changing the default or making non-empty roads empty", () => {
    expect([0, 1, 4, 8].map((count) => scaledTrafficCount(count, 1))).toEqual([0, 1, 4, 8]);
    expect(scaledTrafficCount(4, 0.25)).toBe(1);
    expect(scaledTrafficCount(4, 2)).toBe(8);
  });

  it("keeps a circular gap on roundabout rides", () => {
    const [a, b, c] = ["a", "b", "c"];
    const rooms = circularQueueRooms([
      { item: a, key: "ring", at: 0, radius: 10 },
      { item: b, key: "ring", at: 1, radius: 10 },
      { item: c, key: "ring", at: 5, radius: 10 },
    ]);

    expect(rooms.get(a)).toBeCloseTo(1 * 10 - 8.5);
    expect(rooms.get(b)).toBeCloseTo(4 * 10 - 8.5);
    expect(rooms.get(c)).toBeCloseTo((Math.PI * 2 - 5) * 10 - 8.5);
  });

  it("makes roundabout entrants yield to cars already on the ring", () => {
    expect(roundaboutEntryBlocked(0, [{ at: Math.PI * 2 - 0.08, radius: 20 }])).toBe(true);
    expect(roundaboutEntryBlocked(0, [{ at: 0.08, radius: 20 }])).toBe(false);
    expect(roundaboutEntryBlocked(0, [{ at: Math.PI, radius: 20 }])).toBe(false);
  });

  it("makes roundabout entrants yield to cars about to exit through their arm", () => {
    expect(roundaboutExitBlocked([{ exit: 4, travelled: 92, total: 100 }], 4)).toBe(true);
    expect(roundaboutExitBlocked([{ exit: 4, travelled: 70, total: 100 }], 4)).toBe(false);
    expect(roundaboutExitBlocked([{ exit: 5, travelled: 92, total: 100 }], 4)).toBe(false);
  });

  it("lets pedestrians cross only while vehicle traffic has red", () => {
    expect(pedestrianCanCross("red")).toBe(true);
    expect(pedestrianCanCross("green")).toBe(false);
    expect(pedestrianCanCross("amber")).toBe(false);
  });

  it("keeps pedestrians waiting when vehicle green is about to return", () => {
    const cycle = { phases: [[1], [2]], arms: [1, 2], offset: 0, length: 27 };

    expect(pedestrianCanStartCrossing(cycle, 2, 0)).toBe(true);
    expect(pedestrianCanStartCrossing(cycle, 2, 13.2)).toBe(false);
    expect(pedestrianCanStartCrossing(cycle, 1, 0)).toBe(false);
  });

  it("uses the same lane-change offset in both travel directions", () => {
    const inner = { offset: -3, direction: 1 as const };
    const outer = { offset: 3, direction: 1 as const };
    const span = { start: 20, end: 80 };

    expect(trafficLaneOffset(outer, inner, span, 20, 1)).toBeCloseTo(-3);
    expect(trafficLaneOffset(outer, inner, span, 50, 1)).toBeCloseTo(0);
    expect(trafficLaneOffset(outer, inner, span, 80, 1)).toBeCloseTo(3);
    expect(trafficLaneOffset(outer, inner, span, 80, -1)).toBeCloseTo(-3);
    expect(trafficLaneOffset(outer, inner, span, 20, -1)).toBeCloseTo(3);
  });

  it("chooses lanes for walkers, planned turns, and kerb entries", () => {
    const lanes = [
      { offset: -2, direction: 1 as const },
      { offset: 2, direction: 1 as const },
    ];

    expect(chooseLaneEntry([], 1, true, null, false, () => 0.9).lane).toEqual({ offset: 0, direction: 1 });

    const planned = chooseLaneEntry(lanes, 1, false, { node: 1, exit: 2, arc: null, rank: 1 }, false, () => 0);
    expect(planned.lane).toBe(lanes[1]);
    expect(planned.changing).toBe(lanes[0]);

    const drifting = chooseLaneEntry(lanes, 1, false, null, false, () => 0);
    expect(drifting.lane).toBe(lanes[1]);
    expect(drifting.changing).toBe(lanes[0]);

    const kerb = chooseLaneEntry(lanes, 1, false, null, true, () => 0.9);
    expect(kerb.lane).toBe(lanes[0]);
    expect(kerb.changing).toBeNull();
  });

  it("plans the next exit and requested lane before the junction", () => {
    const graph = new RoadGraph();
    const west = graph.addNode(-100, 0);
    const centre = graph.addNode(0, 0);
    const south = graph.addNode(0, 100);
    const incoming = graph.addSegment(west, centre, v3(-50, 0, 0), "street");
    const exit = graph.addSegment(centre, south, v3(0, 0, 50), "street");
    const arms = new Map([
      [`${centre}:${incoming}`, { segment: incoming, angle: 0, outward: v3(-1, 0, 0) } as JunctionArm],
      [`${centre}:${exit}`, { segment: exit, angle: Math.PI * 1.5, outward: v3(0, 0, 1) } as JunctionArm],
    ]);
    const armOf = (node: number, segment: number) => arms.get(`${node}:${segment}`);

    expect(choosePlanAhead(graph, graph.segment(incoming), -1, 0, armOf, () => 1)).toBeNull();
    expect(choosePlanAhead(graph, graph.segment(incoming), 1, 0, armOf, () => 1)).toEqual({
      node: centre,
      exit,
      arc: null,
      rank: 1,
    });

    graph.setRoundabout(centre, true, 2);
    expect(choosePlanAhead(graph, graph.segment(incoming), 1, 0, armOf, () => 2)).toEqual({
      node: centre,
      exit,
      arc: Math.PI * 1.5,
      rank: 1,
    });
  });

  it("eases up to target speed but brakes immediately", () => {
    expect(speedForRoom(20, 8)).toBe(10);
    expect(speedForRoom(20, -1)).toBe(0);
    expect(speedForRoom(20, Infinity)).toBe(20);
    expect(accelerateToward(4, 10, 0.5)).toBe(6);
    expect(accelerateToward(9, 10, 0.5)).toBe(10);
    expect(accelerateToward(10, 3, 0.5)).toBe(3);
  });

  it("keeps segment distances direction-aware", () => {
    const segment = { length: 100 } as Segment;
    const arm = { trim: 10 } as JunctionArm;

    expect(landingDistance(segment, 1, 20)).toBe(20);
    expect(landingDistance(segment, -1, 20)).toBe(80);
    expect(landingDistance(segment, 1, 60)).toBe(45);
    expect(segmentLimit(segment, 1, 20)).toBe(80);
    expect(segmentLimit(segment, -1, 20)).toBe(20);
    expect(roomAhead(40, 55, 1)).toBe(15);
    expect(roomAhead(60, 45, -1)).toBe(15);
    expect(stopTarget(90, 80, 1)).toBe(71.5);
    expect(stopTarget(10, 20, -1)).toBe(28.5);
    expect(stopTarget(90, undefined, 1)).toBe(90);
    expect(stopLineDistance(segment, 1, 10, 5, arm)).toBeCloseTo(81.4);
    expect(stopLineDistance(segment, -1, 10, 5, arm)).toBeCloseTo(18.6);
    expect(stopLineDistance(segment, 1, 10, 5, undefined)).toBe(90);
    expect(atSegmentLimit(80, 80, 1)).toBe(true);
    expect(atSegmentLimit(21, 20, -1)).toBe(false);
    expect(atSegmentLimit(20, 20, -1)).toBe(true);
  });

  it("builds transfer paths from the current mover position", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(100, 0);
    const id = graph.addSegment(a, b, v3(50, 0, 0), "street");
    const segment = graph.segment(id);
    const lane = { offset: 2, direction: 1 as const };
    const mover = { segment, direction: 1 as const, distance: 40, lane } as Parameters<typeof uTurnPath>[1];

    const trimmed = trimTransferFromMover(graph, mover, 2, [v3(10, 0, 2), v3(60, 0, 2), v3(80, 0, 2)]);
    expect(trimmed[0]).toEqual(v3(40, 0, 2));
    expect(trimmed.map((point) => point.x)).toEqual([40, 60, 80]);

    const turn = uTurnPath(graph, mover, -2);
    expect(turn.length).toBeGreaterThan(2);
    expect(turn[0]).toEqual(v3(40, 0, 2));
    expect(turn.at(-1)).toEqual(v3(40, 0, -2));
  });

  it("takes the footway loop between matching ports", () => {
    const arm = { segment: 1 } as Parameters<typeof walkJunctionTransfer>[1];
    const loop = {
      points: [v3(0, 0, 0), v3(10, 0, 0), v3(10, 0, 10), v3(0, 0, 10)],
      ports: [
        { segment: 1, offset: 2, index: 0 },
        { segment: 2, offset: -2, index: 2 },
      ],
    };

    expect(walkJunctionTransfer(loop, arm, 2, 2, -2)).toEqual([v3(0, 0, 0), v3(10, 0, 0), v3(10, 0, 10)]);
    expect(walkJunctionTransfer(loop, arm, 3, 2, -2)).toBeNull();
  });

  it("removes emptied lane queues", () => {
    const mover = { distance: 10, direction: 1 as const };
    const queues = new Map<number, typeof mover[]>();
    const queueOf = new Map<typeof mover, number>();

    joinLaneQueue(queues, queueOf, 7, mover);
    leaveLaneQueue(queues, queueOf, mover);

    expect(queues.has(7)).toBe(false);
    expect(queueOf.has(mover)).toBe(false);
  });

  it("keeps lane queues ordered after movers join and leave", () => {
    const near = { distance: 10, direction: 1 as const };
    const middle = { distance: 20, direction: 1 as const };
    const far = { distance: 30, direction: 1 as const };
    const queues = new Map<number, typeof near[]>();
    const queueOf = new Map<typeof near, number>();

    joinLaneQueue(queues, queueOf, 3, far);
    joinLaneQueue(queues, queueOf, 3, near);
    joinLaneQueue(queues, queueOf, 3, middle);
    leaveLaneQueue(queues, queueOf, middle);

    expect(queues.get(3)).toEqual([near, far]);
    expect(laneQueueIsOrdered(queues.get(3)!)).toBe(true);
  });

  it("blocks entering a lane when the next car is still at its mouth", () => {
    expect(laneStartBlocked([{ distance: 14, direction: 1 }], 10, 1)).toBe(true);
    expect(laneStartBlocked([{ distance: 2, direction: 1 }], 10, 1)).toBe(false);
    expect(laneStartBlocked([{ distance: 86, direction: -1 }], 90, -1)).toBe(true);
    expect(laneStartBlocked([{ distance: 98, direction: -1 }], 90, -1)).toBe(false);
  });

  it("rebinds retained movers to the current segment after a dirty rebuild", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(160, 0);
    const id = graph.addSegment(a, b, v3(80, 0, 0), "street");
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const traffic = createTrafficRenderer(scene, graph, () => 16, () => 0);

    traffic.rebuild();
    const before = traffic.firstVehicle()!.segment;
    const after = { ...before, length: before.length + 10 };
    (graph as unknown as { segments: Map<number, typeof after> }).segments.set(id, after);

    traffic.rebuild({ minX: 1000, maxX: 1010, minZ: 1000, maxZ: 1010 });

    expect(traffic.firstVehicle()!.segment).toBe(after);
    scene.dispose();
    engine.dispose();
  });
});
