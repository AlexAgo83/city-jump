import { describe, expect, it } from "vitest";

import { buildingNeeds, population, type BuildingKind } from "./buildingKinds";

const parcel = (kind: BuildingKind, frontageCells = 1, depthCells = 1) => ({ kind, frontageCells, depthCells });

describe("building kinds", () => {
  it("counts residential population from residential parcel area", () => {
    expect(population([parcel("residential", 2, 3), parcel("commercial", 4, 4)])).toBe(72);
  });

  it("tracks workforce demand between building kinds", () => {
    const needs = buildingNeeds([
      parcel("residential"),
      parcel("commercial"),
      parcel("industrial"),
      parcel("military"),
    ]);

    // A barracks costs three workers a cell, so four one-cell lots already outrun a single house.
    expect(needs.find((need) => need.kind === "residential")).toMatchObject({ supply: 12, need: 13, ratio: 12 / 13 });
    expect(needs.find((need) => need.kind === "industrial")).toMatchObject({ supply: 1, need: 1, ratio: 1 });
    expect(needs.find((need) => need.kind === "military")).toMatchObject({ supply: 1, need: 1, ratio: 1 });
  });

  it("reads staffed output by business kind", () => {
    const needs = buildingNeeds([
      parcel("residential", 2, 2),
      parcel("agricultural"),
      parcel("industrial"),
      parcel("military"),
    ]);

    expect(needs.find((need) => need.kind === "agricultural")).toMatchObject({ supply: 1, need: 2, ratio: 0.5 });
    expect(needs.find((need) => need.kind === "industrial")).toMatchObject({ supply: 1, need: 1, ratio: 1 });
    expect(needs.find((need) => need.kind === "military")).toMatchObject({ supply: 1, need: 1, ratio: 1 });
    expect(needs.map((need) => need.kind)).toContain("agricultural");
  });
});
