import { describe, expect, it } from "vitest";

import { advanceKaijuAssault, createKaijuAssault, KAIJU_ATTACK_SECONDS, kaijuPositionAt, planKaiju } from "./kaiju";
import { WAVE_STARTING_VALUES } from "./wave";
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
    // One second of travel at whatever the current speed is -- the number is a starting value and
    // belongs to `wave.ts`, not to this test.
    expect(distXZ(plan.landing, kaijuPositionAt(plan, 1))).toBeCloseTo(WAVE_STARTING_VALUES.kaijuSpeedMps);
  });

  it("walks, spends visible time attacking, then retargets the nearest living building", () => {
    const start = v3(0, 0, 0);
    const first = v3(10, 0, 0);
    const second = v3(25, 0, 0);
    const third = v3(-40, 0, 0);
    const speed = 10;

    const atTarget = advanceKaijuAssault(createKaijuAssault(start), [first, second, third], 1, speed);
    expect(atTarget.position).toEqual(first);
    expect(atTarget.mode).toBe("attacking");
    expect(atTarget.destroyed).toBeNull();

    const stillAttacking = advanceKaijuAssault(atTarget, [first, second, third], KAIJU_ATTACK_SECONDS - 0.1, speed);
    expect(stillAttacking.target).toEqual(first);
    expect(stillAttacking.destroyed).toBeNull();

    const retargeted = advanceKaijuAssault(stillAttacking, [first, second, third], 0.1, speed);
    expect(retargeted.destroyed).toEqual(first);
    expect(retargeted.target).toEqual(second);
  });

  it("can target a building added during the previous attack", () => {
    const first = v3(10, 0, 0);
    const bait = v3(12, 0, 0);
    const ready = advanceKaijuAssault(createKaijuAssault(v3(0, 0, 0)), [first], 1, 10);

    const retargeted = advanceKaijuAssault(ready, [first, bait], KAIJU_ATTACK_SECONDS, 10);

    expect(retargeted.destroyed).toEqual(first);
    expect(retargeted.target).toEqual(bait);
  });
});
