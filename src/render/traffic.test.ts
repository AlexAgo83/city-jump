import { describe, expect, it } from "vitest";

import {
  circularQueueRooms,
  joinLaneQueue,
  laneQueueIsOrdered,
  laneStartBlocked,
  leaveLaneQueue,
  pedestrianCanCross,
  pedestrianCanStartCrossing,
  roundaboutEntryBlocked,
  roundaboutExitBlocked,
  scaledTrafficCount,
  trafficLaneOffset,
} from "./traffic";

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
});
