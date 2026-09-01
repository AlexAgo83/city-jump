import { describe, expect, it } from "vitest";

import { STARTING_MONEY, Treasury, buildingBuildCost, demolitionRefund, incomePerSecond, roadBuildCost } from "./economy";
import type { BuildingStatus } from "./buildingLifecycle";

const status = (kind: BuildingStatus["parcel"]["kind"], state: BuildingStatus["state"], frontageCells = 1, depthCells = 1): BuildingStatus => ({
  state,
  parcel: { kind, frontageCells, depthCells, position: { x: 0, y: 0, z: 0 }, rotationY: 0, cells: [] },
});

describe("economy", () => {
  it("prices roads by metre and buildings by parcel", () => {
    expect(roadBuildCost("street", 12.1)).toBe(97);
    expect(roadBuildCost("tunnel", 10)).toBe(450);
    expect(buildingBuildCost(status("commercial", "working", 2, 3).parcel)).toBe(660);
  });

  it("earns from population tax and staffed commerce", () => {
    expect(incomePerSecond(100, [status("commercial", "working", 2, 2), status("commercial", "idle", 4, 4)])).toBeCloseTo(5.2);
  });

  it("spends only what it can unless debt is allowed", () => {
    const treasury = new Treasury(100);
    expect(treasury.spend(120)).toBe(false);
    expect(treasury.money).toBe(100);
    expect(treasury.spend(120, true)).toBe(true);
    expect(treasury.money).toBe(-20);
    treasury.replaceWith();
    expect(treasury.money).toBe(STARTING_MONEY);
  });

  it("returns half the original cost on demolition", () => {
    expect(demolitionRefund(660)).toBe(330);
  });
});
