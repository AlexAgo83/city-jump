import { describe, expect, it } from "vitest";

import { missilePoint } from "./missiles";
import { v3 } from "../sim/vec";

describe("missilePoint", () => {
  it("climbs above both endpoints during flight and lands on target xz", () => {
    const from = v3(0, 0, 0);
    const to = v3(100, 0, 0);

    expect(missilePoint(from, to, 0).x).toBe(0);
    expect(missilePoint(from, to, 0.5).y).toBeGreaterThan(missilePoint(from, to, 0).y);
    expect(missilePoint(from, to, 1).x).toBe(100);
    expect(missilePoint(from, to, 1).z).toBe(0);
  });
});
