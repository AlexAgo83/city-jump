import { describe, expect, it } from "vitest";

import { allocateWorkforce, workforceDemand, workforceFromPopulation } from "./workforce";
import type { BuildingKind } from "./buildingKinds";

const parcel = (kind: BuildingKind, frontageCells = 1, depthCells = 1) => ({ kind, frontageCells, depthCells });

describe("workforce", () => {
  it("derives workers and parcel demand from population, kind and size", () => {
    expect(workforceFromPopulation(23)).toBe(23);
    expect(workforceDemand(parcel("residential", 4, 4))).toBe(0);
    expect(workforceDemand(parcel("commercial", 2, 3))).toBe(24);
    expect(workforceDemand(parcel("agricultural", 1, 4))).toBe(4);
    expect(workforceDemand(parcel("military", 2, 3))).toBe(18);
  });

  it("allocates one shared workforce by fixed priority", () => {
    const staffing = allocateWorkforce([
      parcel("residential", 1, 4),
      parcel("commercial", 2, 2),
      parcel("industrial", 1, 1),
      parcel("military", 1, 1),
    ], 30);

    expect(staffing).toMatchObject({
      workforce: 30,
      demand: 25,
      staffedDemand: 25,
      byKind: {
        military: { demand: 3, staffedDemand: 3, staffed: 1, idle: 0 },
        industrial: { demand: 6, staffedDemand: 6, staffed: 1, idle: 0 },
        commercial: { demand: 16, staffedDemand: 16, staffed: 1, idle: 0 },
      },
    });
  });

  it("leaves lower-priority parcels idle when workers run out", () => {
    const staffing = allocateWorkforce([
      parcel("residential", 1, 2),
      parcel("commercial", 2, 2),
      parcel("industrial", 1, 1),
      parcel("military", 1, 1),
    ], 12);

    expect(staffing.staffedDemand).toBe(9);
    expect(staffing.byKind.military).toMatchObject({ staffed: 1, idle: 0 });
    expect(staffing.byKind.industrial).toMatchObject({ staffed: 1, idle: 0 });
    expect(staffing.byKind.commercial).toMatchObject({ staffed: 0, idle: 1 });
  });

  it("leaves the shift where it is when the pool moves by a hair", () => {
    // Two barracks the pool cannot both carry: 12 workers each, 20 residents.
    const first = parcel("military", 2, 2);
    const second = parcel("military", 2, 2);
    const parcels = [first, second];

    const cold = allocateWorkforce(parcels, 20);
    expect(cold.parcels.filter((job) => job.staffed)).toHaveLength(1);
    // Ties are broken by order, so it is the first that gets the shift.
    expect(cold.parcels.find((job) => job.staffed)?.index).toBe(0);

    // The second one held it last tick: it keeps it, rather than the two swapping every tick as
    // the population wobbles.
    const warm = allocateWorkforce(parcels, 20, (candidate) => candidate === second);
    expect(warm.parcels.filter((job) => job.staffed)).toHaveLength(1);
    expect(warm.parcels.find((job) => job.staffed)?.index).toBe(1);
  });

  it("still serves military before the rest, incumbent or not", () => {
    const farm = parcel("agricultural", 2, 2);
    const barracks = parcel("military", 2, 2);
    const staffing = allocateWorkforce([farm, barracks], 12, (candidate) => candidate === farm);

    expect(staffing.parcels.find((job) => job.index === 1)?.staffed).toBe(true);
  });
});
