import { describe, expect, it } from "vitest";

import { circularQueueRooms, joinLaneQueue, laneQueueIsOrdered, leaveLaneQueue, scaledTrafficCount, trafficLaneOffset } from "./traffic";

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
});
