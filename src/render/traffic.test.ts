import { describe, expect, it } from "vitest";

import { circularQueueRooms } from "./traffic";

describe("traffic queues", () => {
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
});
