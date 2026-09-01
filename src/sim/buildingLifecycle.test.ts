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

  it("rebuilds damaged parcels while new parcels rise", () => {
    const lifecycle = new BuildingLifecycle();
    const damaged = parcel("residential", 0, 2, 2);
    const fresh = parcel("commercial", 20, 2, 2);

    expect(lifecycle.rebuild(damaged, 10)).toBe(true);
    expect(lifecycle.sync([damaged, fresh], 0, 20).map((status) => status.state)).toEqual(["rebuilding", "rising"]);
    expect(lifecycle.sync([damaged, fresh], 0, 10 + BUILDING_STAGE_SECONDS).map((status) => status.state)).toEqual(["working", "rising"]);
  });

  it("round-trips active state through saved data", () => {
    const saved: SavedBuildingState[] = [[1, 2, "rising", 12]];
    const lifecycle = new BuildingLifecycle(saved);

    expect(lifecycle.toJSON()).toEqual(saved);
    lifecycle.replaceWith([[3, 4, "idle", 30]]);
    expect(lifecycle.toJSON()).toEqual([[3, 4, "idle", 30]]);
  });
});
