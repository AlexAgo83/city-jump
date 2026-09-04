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

    expect(batteries.map((battery) => battery.damage)).toEqual([56, 224]);
    expect(batteries.every((battery) => battery.range === WAVE_STARTING_VALUES.batteryRangeM)).toBe(true);
    expect(batteriesInRange(batteries, v3(430, 0, 0))).toHaveLength(2);
    expect(batteriesInRange(batteries, v3(450, 0, 0))).toHaveLength(1);
    expect(firepowerPerMinute(batteries)).toBe((56 + 224) * (60 / WAVE_STARTING_VALUES.reloadSeconds));
  });

  it("does not fire unstaffed military parcels", () => {
    expect(batteriesForParcels([{ kind: "military", frontageCells: 1, depthCells: 4, position: v3(0, 0, 0) }], 11)).toHaveLength(0);
    expect(batteriesForParcels([{ kind: "military", frontageCells: 1, depthCells: 4, position: v3(0, 0, 0) }], 12)).toHaveLength(1);
  });

  it("fires only from standing military lots", () => {
    const statuses = [
      { state: "rebuilding", parcel: { kind: "military", frontageCells: 4, depthCells: 4, position: v3(0, 0, 0) } },
      { state: "working", parcel: { kind: "commercial", frontageCells: 4, depthCells: 4, position: v3(100, 0, 0) } },
    ] as const;
    const standing = statuses.filter((status) => status.state !== "rebuilding").map((status) => status.parcel);

    expect(batteriesForParcels(standing, 100)).toHaveLength(0);
  });
});
