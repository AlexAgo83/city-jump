import { describe, expect, it } from "vitest";

import { buildingNeeds, population, type BuildingKind } from "./buildingKinds";
import { v3 } from "./vec";

const parcel = (kind: BuildingKind, frontageCells = 1, depthCells = 1, x = 0) => ({ kind, frontageCells, depthCells, position: v3(x, 0, 0) });

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

  it("asks for defence by pricing firepower against the coming wave", () => {
    const city = [parcel("residential", 4, 4), parcel("military", 2, 3)];

    // Without a threat there is nothing to price the defence against, so the row falls back to
    // staffing -- which is what it always did, and why the panel never once asked for defence.
    const blind = buildingNeeds(city, 200)!.find((need) => need.kind === "military")!;
    expect(blind.supply).toBe(blind.need);

    // A 2x3 battery lands 6 * 14 damage a salvo, so eight salvos is 672.
    const easy = buildingNeeds(city, 200, 500)!.find((need) => need.kind === "military")!;
    expect(easy).toMatchObject({ supply: 672, need: 500 });
    expect(easy.supply).toBeGreaterThan(easy.need);

    const hard = buildingNeeds(city, 200, 2000)!.find((need) => need.kind === "military")!;
    expect(hard.supply).toBeLessThan(hard.need);
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
