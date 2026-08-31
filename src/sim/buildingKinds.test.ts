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

  it("asks for a farm per few homes, and no longer counts farms as industry", () => {
    const needs = buildingNeeds([
      parcel("residential"),
      parcel("residential"),
      parcel("residential"),
      parcel("residential"),
      parcel("agricultural"),
      parcel("military"),
    ]);

    // Four homes want two farms, and the one farm standing is not filling industry's place.
    expect(needs.find((need) => need.kind === "agricultural")).toMatchObject({ supply: 1, need: 2, ratio: 0.5 });
    expect(needs.find((need) => need.kind === "industrial")).toMatchObject({ supply: 0, need: 1, ratio: 0 });
    expect(needs.map((need) => need.kind)).toContain("agricultural");
  });
});
