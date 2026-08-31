import { describe, expect, it } from "vitest";

import { kaijuPositionAt, planKaiju } from "./kaiju";
import { distXZ, v3 } from "./vec";

describe("kaiju", () => {
  it("lands away from the bridge, walks to the nearest coast point, then the nearest building", () => {
    const plan = planKaiju(
      "fixed",
      { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
      [v3(-90, 0, 0), v3(0, 0, -90), v3(90, 0, 0)],
      [v3(-80, 0, 10), v3(90, 0, 10)],
      v3(100, 0, 100),
    );

    expect(Math.hypot(plan.landing.x - 100, plan.landing.z - 100)).toBeGreaterThan(180);
    expect(plan.coast).toEqual(v3(0, 0, -90));
    expect(plan.target).toEqual(v3(-80, 0, 10));
  });

  it("replays the same seed and advances by speed over the path", () => {
    const args = [
      "fixed",
      { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
      [v3(-90, 0, 0), v3(0, 0, -90)],
      [v3(-80, 0, 0)],
      v3(100, 0, 100),
    ] as const;
    const plan = planKaiju(...args);
    expect(planKaiju(...args)).toEqual(plan);
    expect(kaijuPositionAt(plan, 0)).toEqual(plan.landing);
    expect(distXZ(plan.landing, kaijuPositionAt(plan, 1))).toBeCloseTo(8);
  });
});
