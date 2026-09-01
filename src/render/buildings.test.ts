import { describe, expect, it } from "vitest";

import type { BuildableCell, BuildingParcel } from "../sim/slots";
import { buildingBlockedDecorFaces, buildingFootDecorMatrices, buildingGroundPadMatrix, buildingStateColor, roofObjectLimit, roofPropY } from "./buildings";

describe("roof props", () => {
  it("allows up to three objects as the roof gets bigger", () => {
    expect([0, 1, 2, 3, 4, 16].map(roofObjectLimit)).toEqual([0, 1, 2, 3, 3, 3]);
  });

  it("keeps roof objects on the roof deck, not on parapets or roof huts", () => {
    const flat = { kind: "flat" as const, deckY: 10 };
    const setback = { kind: "setback" as const, lowerDeckY: 10.08, upperDeckY: 14, width: 30.5, minX: 3.66, maxX: 26.84, minZ: -26.84, maxZ: -3.66 };
    const pitched = { kind: "pitched" as const, deckY: 7, ridgeY: 9.5, ridgeZ: -3.25 };
    expect(roofPropY(flat, 7.25, -7.25, 11.5)).toBe(10);
    expect(roofPropY(setback, 15.25, -15.25, 15.5)).toBe(14);
    expect(roofPropY(setback, -15.25, -15.25, 15.5)).toBe(14);
    expect(roofPropY(setback, 1, -1, 15.5)).toBeCloseTo(10.08, 2);
    expect(roofPropY(setback, -30.5, -1, 15.5)).toBeCloseTo(10.08, 2);
    expect(roofPropY(pitched, 3.25, -3.25, 9.5)).toBe(9.5);
    expect(roofPropY(pitched, 3.25, -0.75, 9.5)).toBeCloseTo(7.58, 2);
    expect(roofPropY(undefined, 3.25, -3.25, 9.5)).toBe(9.5);
  });

  it("puts a paving pad just larger than the building footprint", () => {
    const matrix = buildingGroundPadMatrix({
      position: { x: 10, y: 2, z: 20 },
      rotationY: 0,
      frontageCells: 2,
      depthCells: 3,
      kind: "residential",
      cells: [],
    });
    expect(matrix.m[0]).toBe(24);
    expect(matrix.m[10]).toBe(32);
    expect(matrix.m[12]).toBeCloseTo(10);
    expect(matrix.m[13]).toBeCloseTo(2.035);
    expect(matrix.m[14]).toBeCloseTo(8);
  });

  it("scales foot decorations by building slots on each face", () => {
    const parcel: BuildingParcel = {
      position: { x: 10, y: 2, z: 20 },
      rotationY: 0,
      frontageCells: 2,
      depthCells: 3,
      kind: "residential",
      cells: [],
    };
    const placements = buildingFootDecorMatrices(parcel, () => parcel.position.y);
    const repeat = buildingFootDecorMatrices(parcel, () => parcel.position.y);
    expect(placements.map((placement) => [placement.kind, [...placement.matrix.m]])).toEqual(
      repeat.map((placement) => [placement.kind, [...placement.matrix.m]]),
    );
    expect(placements.length).toBeGreaterThan(0);
    expect(placements.length).toBeLessThanOrEqual(4);
    expect(placements[0]!.matrix.m[12]).toBeCloseTo(6);
    expect(placements[0]!.matrix.m[13]).toBeCloseTo(2.08);
    expect(placements[0]!.matrix.m[14]).toBeCloseTo(20.8);
  });

  it("varies foot decoration kinds across buildings", () => {
    const kinds = new Set(
      Array.from({ length: 200 }, (_, i) => parcel(i % 20, Math.floor(i / 20), 2 + (i % 3), 1 + (i % 4))).flatMap((p) =>
        buildingFootDecorMatrices(p, () => 0).map((placement) => placement.kind),
      ),
    );
    // Not every kind on every run -- a parcel only gets a couple of pieces -- but the mix has to
    // stay varied, and nothing may show up that is not in the catalogue.
    const catalogue = ["barrier", "bench", "bikeRack", "bollard", "crate", "mail", "planter", "shrub", "sign", "trash", "utility", "vending", "wallLight"];
    expect([...kinds].filter((kind) => !catalogue.includes(kind))).toEqual([]);
    expect(kinds.size).toBeGreaterThanOrEqual(10);
  });

  it("puts foot decorations on the terrain height at their own position", () => {
    const placements = buildingFootDecorMatrices(
      {
        position: { x: 10, y: 2, z: 20 },
        rotationY: 0,
        frontageCells: 2,
        depthCells: 1,
        kind: "residential",
        cells: [],
      },
      (x, z) => x * 0.1 + z * 0.01,
    );
    const first = placements[0]!.matrix.m;
    expect(first[13]).toBeCloseTo(first[12]! * 0.1 + first[14]! * 0.01 + 0.08);
  });

  it("leaves the street-facing side clear on one-slot-wide buildings", () => {
    const placements = buildingFootDecorMatrices(
      {
        position: { x: 10, y: 2, z: 20 },
        rotationY: 0,
        frontageCells: 1,
        depthCells: 3,
        kind: "residential",
        cells: [],
      },
      () => 2,
    );
    expect(placements.length).toBeGreaterThan(0);
    expect(placements.length).toBeLessThanOrEqual(4);
    expect(placements.some((placement) => placement.matrix.m[14]! > 20)).toBe(false);
  });

  it("uses distinct map colours for lifecycle states", () => {
    const p = parcel(0, 0, 2, 2);
    expect(buildingStateColor(p, { state: "waiting" })).not.toEqual(buildingStateColor(p, { state: "working" }));
    expect(buildingStateColor(p, { state: "rising" })).not.toEqual(buildingStateColor(p, { state: "working" }));
    expect(buildingStateColor(p, { state: "idle" })).not.toEqual(buildingStateColor(p, { state: "working" }));
    expect(buildingStateColor(p, { state: "rebuilding" })).not.toEqual(buildingStateColor(p, { state: "working" }));
  });

  it("uses distinct idle colours for missing utilities", () => {
    const p = parcel(0, 0, 2, 2);
    expect(buildingStateColor(p, { state: "idle", reason: "power" })).not.toEqual(buildingStateColor(p, { state: "idle", reason: "water" }));
    expect(buildingStateColor(p, { state: "idle", reason: "power" })).not.toEqual(buildingStateColor(p, { state: "idle", reason: "workers" }));
  });

  it("skips foot decorations on faces touching another building cell", () => {
    const first = parcel(0, 0, 2, 2);
    const second = parcel(2, 0, 1, 2);
    const occupied = new Set([...first.cells, ...second.cells].map((cell) => `${cell.segment}:${cell.side}:${cell.block}:${cell.column}:${cell.row}`));
    const blocked = buildingBlockedDecorFaces(first, occupied);
    const placements = buildingFootDecorMatrices(first, () => 0, blocked);
    expect(blocked.has("right")).toBe(true);
    expect(placements.length).toBeLessThanOrEqual(4);
    expect(placements.some((placement) => placement.matrix.m[12]! > 26)).toBe(false);
  });
});

function parcel(column: number, row: number, frontageCells: number, depthCells: number): BuildingParcel {
  return {
    position: { x: 10 + column * 8 + frontageCells * 4, y: 2, z: 20 - row * 8 },
    rotationY: 0,
    frontageCells,
    depthCells,
    kind: "residential",
    cells: Array.from({ length: frontageCells * depthCells }, (_, i) => cell(column + (i % frontageCells), row + Math.floor(i / frontageCells))),
  };
}

function cell(column: number, row: number): BuildableCell {
  return {
    lowRise: false,
    industrial: false,
    buildingKind: "residential",
    segment: 1,
    side: 1,
    block: 0,
    column,
    row,
    rotationY: 0,
    corners: [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    ],
  };
}
