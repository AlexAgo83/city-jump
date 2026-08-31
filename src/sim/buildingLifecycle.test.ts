import { describe, expect, it } from "vitest";

import { BuildingLifecycle, BUILDING_STAGE_SECONDS, type SavedBuildingState } from "./buildingLifecycle";
import type { BuildingKind } from "./buildingKinds";
import type { BuildingParcel } from "./slots";
import { v3 } from "./vec";

const parcel = (kind: BuildingKind, x: number, frontageCells = 1, depthCells = 1): BuildingParcel => ({
  kind,
  position: v3(x, 0, 0),
  rotationY: 0,
  frontageCells,
  depthCells,
  cells: [],
});

describe("building lifecycle", () => {
  it("starts new parcels under construction, then moves them to working or idle", () => {
    const lifecycle = new BuildingLifecycle();
    const parcels = [parcel("residential", 0, 2, 2), parcel("military", 20), parcel("commercial", 40, 4, 4)];

    expect(lifecycle.sync(parcels, 48, 10).map((status) => status.state)).toEqual(["rising", "rising", "rising"]);
    expect(lifecycle.sync(parcels, 48, 10 + BUILDING_STAGE_SECONDS).map((status) => status.state)).toEqual(["working", "working", "idle"]);
  });

  it("leaves unfunded parcels waiting until money is available", () => {
    const lifecycle = new BuildingLifecycle();
    const p = [parcel("commercial", 0, 2, 2)];
    let funded = false;

    expect(lifecycle.sync(p, 0, 10, { spend: () => funded }).map((status) => [status.state, status.reason])).toEqual([["waiting", "funds"]]);
    funded = true;
    expect(lifecycle.sync(p, 0, 20, { spend: () => funded }).map((status) => [status.state, status.reason])).toEqual([["rising", "construction"]]);
  });

  it("round-trips active state through saved data", () => {
    const saved: SavedBuildingState[] = [[1, 2, "rising", 12]];
    const lifecycle = new BuildingLifecycle(saved);

    expect(lifecycle.toJSON()).toEqual(saved);
    lifecycle.replaceWith([[3, 4, "idle", 30]]);
    expect(lifecycle.toJSON()).toEqual([[3, 4, "idle", 30]]);
  });
});
