import { describe, expect, it } from "vitest";

import { allocateWorkforce, workforceDemand, workforceFromPopulation } from "./workforce";
import type { BuildingKind } from "./buildingKinds";

const parcel = (kind: BuildingKind, frontageCells = 1, depthCells = 1) => ({ kind, frontageCells, depthCells });

describe("workforce", () => {
  it("derives workers and parcel demand from population, kind and size", () => {
    expect(workforceFromPopulation(23)).toBe(11);
    expect(workforceDemand(parcel("residential", 4, 4))).toBe(0);
    expect(workforceDemand(parcel("commercial", 2, 3))).toBe(24);
    expect(workforceDemand(parcel("agricultural", 1, 4))).toBe(4);
    expect(workforceDemand(parcel("military", 2, 3))).toBe(48);
  });

  it("allocates one shared workforce by fixed priority", () => {
    const staffing = allocateWorkforce([
      parcel("residential", 1, 4),
      parcel("commercial", 2, 2),
      parcel("industrial", 1, 1),
      parcel("military", 1, 1),
    ], 60);

    expect(staffing).toMatchObject({
      workforce: 30,
      demand: 30,
      staffedDemand: 30,
      byKind: {
        military: { demand: 8, staffedDemand: 8, staffed: 1, idle: 0 },
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
    ], 24);

    expect(staffing.staffedDemand).toBe(8);
    expect(staffing.byKind.military).toMatchObject({ staffed: 1, idle: 0 });
    expect(staffing.byKind.industrial).toMatchObject({ staffed: 0, idle: 1 });
    expect(staffing.byKind.commercial).toMatchObject({ staffed: 0, idle: 1 });
  });
});
