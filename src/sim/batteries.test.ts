import { describe, expect, it } from "vitest";

import { batteriesForParcels, batteriesInRange, firepowerPerMinute } from "./batteries";
import { v3 } from "./vec";
import { WAVE_STARTING_VALUES } from "./wave";

describe("batteries", () => {
  it("turns military parcels into fixed-range batteries with area damage", () => {
    const batteries = batteriesForParcels([
      { kind: "military", frontageCells: 1, depthCells: 4, position: v3(0, 0, 0) },
      { kind: "commercial", frontageCells: 4, depthCells: 4, position: v3(0, 0, 0) },
      { kind: "military", frontageCells: 4, depthCells: 4, position: v3(300, 0, 0) },
    ]);

    expect(batteries.map((battery) => battery.damage)).toEqual([48, 192]);
    expect(batteries.every((battery) => battery.range === WAVE_STARTING_VALUES.batteryRangeM)).toBe(true);
    expect(batteriesInRange(batteries, v3(200, 0, 0))).toHaveLength(2);
    expect(firepowerPerMinute(batteries)).toBe((48 + 192) * (60 / WAVE_STARTING_VALUES.reloadSeconds));
  });
});
