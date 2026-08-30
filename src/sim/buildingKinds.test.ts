import { describe, expect, it } from "vitest";

import { buildingNeeds, population, type BuildingKind } from "./buildingKinds";

const parcel = (kind: BuildingKind, frontageCells = 1, depthCells = 1) => ({ kind, frontageCells, depthCells });

describe("building kinds", () => {
  it("counts residential population from residential parcel area", () => {
    expect(population([parcel("residential", 2, 3), parcel("commercial", 4, 4)])).toBe(72);
  });

  it("tracks the simple needs between building kinds", () => {
    const needs = buildingNeeds([
      parcel("residential"),
      parcel("commercial"),
      parcel("industrial"),
      parcel("military"),
    ]);

    expect(needs.find((need) => need.kind === "residential")).toMatchObject({ supply: 1, need: 4, ratio: 0.25 });
    expect(needs.find((need) => need.kind === "industrial")).toMatchObject({ supply: 1, need: 1, ratio: 1 });
  });
});
