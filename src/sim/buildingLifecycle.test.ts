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
    expect(BUILDING_STAGE_SECONDS).toBeGreaterThanOrEqual(15);
    expect(BUILDING_STAGE_SECONDS).toBeLessThanOrEqual(30);
    expect(lifecycle.sync(parcels, 48, 10 + BUILDING_STAGE_SECONDS).map((status) => status.state)).toEqual(["working", "working", "idle"]);
  });

  it("keeps a lot's state through a tick the demand cap left it out of", () => {
    const lifecycle = new BuildingLifecycle();
    const parcels = [parcel("residential", 0, 2, 2)];
    lifecycle.sync(parcels, 48, 10);
    expect(lifecycle.sync(parcels, 48, 10 + BUILDING_STAGE_SECONDS).map((status) => status.state)).toEqual(["working"]);

    lifecycle.sync([], 48, 50); // the population wobbled and the lot fell outside the cap
    expect(lifecycle.sync(parcels, 48, 60).map((status) => status.state)).toEqual(["working"]);
  });

  it("forgets a lot that has been gone long enough to have been bulldozed", () => {
    const lifecycle = new BuildingLifecycle();
    const parcels = [parcel("residential", 0, 2, 2)];
    lifecycle.sync(parcels, 48, 10);
    lifecycle.sync(parcels, 48, 10 + BUILDING_STAGE_SECONDS);

    lifecycle.sync([], 48, 200);
    expect(lifecycle.sync(parcels, 48, 400).map((status) => status.state)).toEqual(["rising"]);
  });

  it("reports live construction progress", () => {
    const lifecycle = new BuildingLifecycle();
    const [started] = lifecycle.sync([parcel("residential", 0)], 12, 10);
    const [half] = lifecycle.sync([parcel("residential", 0)], 12, 10 + BUILDING_STAGE_SECONDS / 2);

    expect(started!.started).toBe(true);
    expect(half!.progress).toBe(0.5);
    expect(half!.remainingSeconds).toBe(BUILDING_STAGE_SECONDS / 2);
    expect(half!.started).toBeUndefined();
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

  it("holds a rebuild until the attack is over", () => {
    const lifecycle = new BuildingLifecycle();
    const parcel = { position: { x: 0, y: 0, z: 0 }, kind: "residential", frontageCells: 1, depthCells: 1, cells: [], rotationY: 0 } as never;
    lifecycle.sync([parcel], 100, 0);
    lifecycle.rebuild(parcel, 10);

    // Thirty seconds of a wave: well past the stage, and still a building site.
    const during = lifecycle.sync([parcel], 100, 40, BUILDING_STAGE_SECONDS, true);
    expect(during[0]!.state).toBe("rebuilding");

    // The wave lifts, and only now does the stage run.
    expect(lifecycle.sync([parcel], 100, 50)[0]!.state).toBe("rebuilding");
    expect(lifecycle.sync([parcel], 100, 40 + BUILDING_STAGE_SECONDS + 1)[0]!.state).not.toBe("rebuilding");
  });

  it("does not re-deal the shifts every time the population twitches", () => {
    const lifecycle = new BuildingLifecycle();
    // Two barracks and a farm the workforce cannot all carry, so somebody is always short.
    // Forty-eight workers a barracks, sixteen a farm, against a hundred residents: somebody is
    // always the one left out.
    const parcels = [parcel("military", 0, 4, 4), parcel("military", 20, 4, 4), parcel("agricultural", 40, 4, 4)];
    const staffed = (population: number, now: number) =>
      lifecycle.sync(parcels, population, now, 0).map((status) => status.staffed).join(",");

    const opening = staffed(100, 10);
    expect(opening).toBe("true,true,false");
    // A city short of food loses and regains a resident every tick. That is not a reason to send
    // anyone home.
    expect(staffed(99, 11)).toBe(opening);
    expect(staffed(101, 12)).toBe(opening);
    expect(staffed(98, 13)).toBe(opening);

    // A real collapse is: the shifts are dealt again on what the city actually has.
    expect(staffed(40, 14)).toBe("false,false,true");
  });
});
