import { describe, expect, it } from "vitest";

import { buildingParcels, type BuildableCell, type BuildingParcel } from "../sim/slots";
import type { BuildingDetail } from "./buildings";
import { BUILDING_MODELS, districtTint, buildingModelId, buildingBlockedDecorFaces, buildingFootDecorMatrices, buildingGroundPadMatrix, buildingModelColor, buildingStateColor, buildingStateSignature, nextDistantDetail, roofObjectLimit, roofPropY } from "./buildings";

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
    const catalogue = ["path", "garden", "terrace", "barrier", "bench", "bikeRack", "bollard", "crate", "mail", "planter", "shrub", "sign", "trash", "utility", "vending", "wallLight"];
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
    expect(buildingStateColor(p, { state: "rising" })).not.toEqual(buildingStateColor(p, { state: "working" }));
    expect(buildingStateColor(p, { state: "idle" })).not.toEqual(buildingStateColor(p, { state: "working" }));
    expect(buildingStateColor(p, { state: "rebuilding" })).not.toEqual(buildingStateColor(p, { state: "working" }));
  });

  it("keeps working models subtly tinted, and still colours their stand-in boxes", () => {
    const p = parcel(0, 0, 2, 2);
    const tint = buildingModelColor(p, { state: "working" });
    expect(tint.every((channel) => channel >= 0.8 && channel <= 1)).toBe(true);
    expect(tint).not.toEqual([1, 1, 1]);
    expect(districtTint(p)).toEqual(districtTint({ ...p }));
    expect(districtTint({ ...p, position: { ...p.position, x: p.position.x + 160 } })).not.toEqual(tint);
    expect(buildingStateColor(p, { state: "working" })).not.toEqual([1, 1, 1]);
    // An idle model takes the same colour, at half strength: see the next case.
    expect(buildingModelColor(p, { state: "idle" })).not.toEqual([1, 1, 1]);
  });

  it("dims a stopped building rather than painting it out", () => {
    const p = parcel(0, 0, 2, 2);
    const [r] = buildingModelColor(p, { state: "idle", reason: "workers" });
    const [boxR] = buildingStateColor(p, { state: "idle", reason: "workers" });

    expect(boxR).toBeLessThan(0.35); // the stand-in box is flat grey, and reads as one
    expect(r).toBeGreaterThan(0.6); // the model keeps its own texture under the grey
    expect(r).toBeLessThan(1); // but is still visibly not working
    // A site is a site: it keeps its colour in full.
    expect(buildingModelColor(p, { state: "rising" })).toEqual(buildingStateColor(p, { state: "rising" }));
  });

  it("uses distinct idle colours for missing utilities", () => {
    const p = parcel(0, 0, 2, 2);
    expect(buildingStateColor(p, { state: "idle", reason: "power" })).not.toEqual(buildingStateColor(p, { state: "idle", reason: "water" }));
    expect(buildingStateColor(p, { state: "idle", reason: "power" })).not.toEqual(buildingStateColor(p, { state: "idle", reason: "workers" }));
  });

  it("changes the upload signature only when visible building state changes", () => {
    const p = parcel(0, 0, 2, 2);
    const base = { parcel: p, state: "rising" as const, progress: 0.5, staffed: true };

    expect(buildingStateSignature([base])).toBe(buildingStateSignature([{ ...base }]));
    expect(buildingStateSignature([base])).not.toBe(buildingStateSignature([{ ...base, progress: 0.6 }]));
    expect(buildingStateSignature([base])).not.toBe(buildingStateSignature([{ ...base, state: "working" }]));
    expect(buildingStateSignature([base])).not.toBe(buildingStateSignature([{ ...base, staffed: false }]));
    expect(buildingStateSignature([{ ...base, state: "idle", reason: "power" }])).not.toBe(buildingStateSignature([{ ...base, state: "idle", reason: "water" }]));
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


it("selects stable zone-specific variants, sparse eligible towers and low pedestrian models", () => {
  const selected = new Set<string>();
  for (const kind of ["residential", "commercial"] as const) {
    for (let f = 1; f <= 4; f++) for (let d = 1; d <= 4; d++) {
      let towers = 0;
      for (let i = 0; i < 160; i++) {
        const p = { ...parcel((i % 20) * 8, Math.floor(i / 20) * 8, f, d), kind };
        const id = buildingModelId(p);
        selected.add(id);
        expect(BUILDING_MODELS).toContain(id);
        expect(id.startsWith(`${kind}_${f}x${d}_`)).toBe(true);
        expect(buildingModelId(JSON.parse(JSON.stringify(p)))).toBe(id);
        expect(buildingModelId({ ...p, position: { ...p.position, y: 100 } })).toBe(id);
        expect([`${kind}_${f}x${d}_a`, `${kind}_${f}x${d}_court`]).toContain(buildingModelId({ ...p, cells: [{ ...p.cells[0]!, lowRise: true }] }));
        if (id.includes("_tower")) towers++;
      }
      const eligible = kind === "residential" ? f === d && f >= 3 : (f === 3 && d === 4) || (f === 4 && d === 3);
      expect(towers).toBeLessThan(45);
      expect(towers > 0).toBe(eligible);
      expect(selected.has(`${kind}_${f}x${d}_a`)).toBe(true);
      for (const variant of ["b", "court", "terraces"]) expect(selected.has(`${kind}_${f}x${d}_${variant}`)).toBe(true);
    }
  }
  expect(selected.size).toBe(148);
  for (const kind of ["industrial", "agricultural", "military"] as const) {
    expect(buildingModelId({ ...parcel(0, 0, 4, 4), kind })).toMatch(new RegExp(`^${kind === "agricultural" ? "farm" : kind}_4x4(?:_[bc])?$`));
  }
});

it("places roof props on the highest containing terrace, including between twin towers", () => {
  const roof = { kind: "terraced" as const, width: 30, decks: [
    { minX: 0, maxX: 30, minZ: -30, maxZ: 0, deckY: 9 },
    { minX: 2, maxX: 12, minZ: -25, maxZ: -5, deckY: 72 },
    { minX: 18, maxX: 28, minZ: -25, maxZ: -5, deckY: 84 },
  ] };
  expect(roofPropY(roof, 7, -15, 85.5)).toBe(72);
  expect(roofPropY(roof, -7, -15, 85.5)).toBe(84);
  expect(roofPropY(roof, 15, -15, 85.5)).toBe(9);
  expect(roofPropY(roof, 7, -2, 85.5)).toBe(9);
});


it("gives residual industrial 1x1 parcels three stable industrial models", () => {
  const selected = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const [p] = buildingParcels([{ ...cell(i, 0), buildingKind: "industrial", zone: "industrial", corners: [
      { x: i*8, y: 0, z: 0 }, { x: i*8+8, y: 0, z: 0 },
      { x: i*8+8, y: 0, z: -8 }, { x: i*8, y: 0, z: -8 },
    ] }]);
    expect([p!.frontageCells, p!.depthCells]).toEqual([1, 1]);
    const id = buildingModelId(p!);
    expect(BUILDING_MODELS).toContain(id);
    expect(buildingModelId(JSON.parse(JSON.stringify(p)))).toBe(id);
    selected.add(id);
  }
  expect([...selected].sort()).toEqual(["industrial_1x1_a", "industrial_1x1_b", "industrial_1x1_c"]);
  expect(buildingModelId({ ...parcel(0, 0, 1, 4), kind: "industrial" })).toMatch(/^industrial_1x4(?:_[bc])?$/);
});


describe("automatic building detail", () => {
  // The camera walks up past the switch and back down again; `auto` is fed back in each step,
  // which is what makes the gap between the two thresholds a hysteresis rather than one number.
  const walk = (radii: readonly number[], detail: BuildingDetail = "auto") => {
    let auto = false;
    return radii.map((radius) => {
      const next = nextDistantDetail(radius, auto, detail);
      auto = next.auto;
      return next.far;
    });
  };

  it("switches to boxes above the upper threshold and back only below the lower one", () => {
    expect(walk([900, 1050, 1101, 1050, 1001, 999, 900])).toEqual([false, false, true, true, true, false, false]);
  });

  it("does not flicker while the camera sits between the thresholds", () => {
    expect(walk([1000, 1099, 1000, 1099])).toEqual([false, false, false, false]);
    expect(walk([1200, 1050, 1099, 1005, 1050])).toEqual([true, true, true, true, true]);
  });

  it("holds boxes at any height when the player asks for boxes", () => {
    expect(walk([100, 500, 900, 1200, 100], "boxes")).toEqual([true, true, true, true, true]);
  });

  it("holds models at any height when the player asks for models", () => {
    // The case 6d390f3 protected: studying the city from above without it turning into boxes.
    expect(walk([100, 900, 1200, 1600, 1200], "models")).toEqual([false, false, false, false, false]);
  });

  it("keeps the camera's answer current while the player holds a detail", () => {
    // Held on "models" high up, the automatic half must already say boxes, so handing the
    // decision back does not need another frame to catch up.
    expect(nextDistantDetail(1600, false, "models")).toEqual({ auto: true, far: false });
    expect(nextDistantDetail(1600, true, "auto")).toEqual({ auto: true, far: true });
    // And held on "boxes" low down, it must already say models.
    expect(nextDistantDetail(300, false, "boxes")).toEqual({ auto: false, far: true });
    expect(nextDistantDetail(300, false, "auto")).toEqual({ auto: false, far: false });
  });

  it("re-derives from the current radius after a rebuild or a reload, with no stale boxes", () => {
    expect(nextDistantDetail(1400, true, "auto")).toEqual({ auto: true, far: true });
    expect(nextDistantDetail(400, false, "auto")).toEqual({ auto: false, far: false });
  });
});


it("varies compounds, generic leftovers and pedestrian buildings without changing zone or height eligibility", () => {
  for (const kind of ["agricultural", "industrial", "military"] as const) {
    for (let f = 1; f <= 4; f++) {
      const ids = new Set<string>();
      for (let i = 0; i < 120; i++) {
        const p = { ...parcel((i%20)*8, Math.floor(i/20)*8, f, 4), kind };
        const id = buildingModelId(p);
        ids.add(id);
        expect(BUILDING_MODELS).toContain(id);
        expect(buildingModelId(JSON.parse(JSON.stringify(p)))).toBe(id);
      }
      const prefix = `${kind === "agricultural" ? "farm" : kind}_${f}x4`;
      expect([...ids].sort()).toEqual([prefix, `${prefix}_b`, `${prefix}_c`]);
    }
  }
  for (let f = 1; f <= 4; f++) for (let d = 1; d <= 3; d++) {
    const ids = new Set(Array.from({length: 120}, (_, i) => buildingModelId({ ...parcel(i*8,0,f,d), kind: "military" })));
    expect([...ids].sort()).toEqual([`lot_${f}x${d}`, `lot_${f}x${d}_gable`, `lot_${f}x${d}_slab`]);
  }
  for (const kind of ["residential", "commercial"] as const) {
    for (let f = 1; f <= 4; f++) for (let d = 1; d <= 4; d++) {
      const ids = new Set(Array.from({length: 120}, (_, i) => {
        const p = { ...parcel(i*8,0,f,d), kind };
        return buildingModelId({ ...p, cells: [...p.cells, { ...p.cells[0]!, lowRise: true }] });
      }));
      expect([...ids].sort()).toEqual([`${kind}_${f}x${d}_a`, `${kind}_${f}x${d}_court`]);
    }
  }
});
