import { describe, expect, it } from "vitest";

import { buildingFootDecorMatrices, buildingGroundPadMatrix, roofObjectLimit, roofPropY } from "./buildings";

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
      cells: [],
    });
    expect(matrix.m[0]).toBe(24);
    expect(matrix.m[10]).toBe(32);
    expect(matrix.m[12]).toBeCloseTo(10);
    expect(matrix.m[13]).toBeCloseTo(2.035);
    expect(matrix.m[14]).toBeCloseTo(8);
  });

  it("scales foot decorations by building slots on each face", () => {
    const placements = buildingFootDecorMatrices({
      position: { x: 10, y: 2, z: 20 },
      rotationY: 0,
      frontageCells: 2,
      depthCells: 3,
      cells: [],
    });
    expect(placements).toHaveLength(10);
    expect(placements.filter((placement) => placement.kind === "planter").length).toBeGreaterThan(0);
    expect(placements.some((placement) => placement.kind === "bench")).toBe(true);
    expect(placements.some((placement) => placement.kind === "bollard")).toBe(true);
    expect(placements.some((placement) => placement.kind === "utility")).toBe(true);
    expect(placements[0]!.matrix.m[12]).toBeCloseTo(6);
    expect(placements[0]!.matrix.m[13]).toBeCloseTo(2.08);
    expect(placements[0]!.matrix.m[14]).toBeCloseTo(20.8);
  });
});
