import { describe, expect, it } from "vitest";

import { writeTerrainColor } from "./ground";

describe("ground terrain color", () => {
  it("adds deterministic terrain variation and dusty road edges", () => {
    const naturalA = new Float32Array(4);
    const naturalB = new Float32Array(4);
    const roadCut = new Float32Array(4);

    writeTerrainColor(naturalA, 0, 12, 12, 0.03, 100, 100);
    writeTerrainColor(naturalB, 0, 12, 12, 0.03, 760, -340);
    writeTerrainColor(roadCut, 0, 11.2, 12, 0.03, 100, 100);

    expect([...naturalA]).not.toEqual([...naturalB]);
    expect(roadCut[0]).toBeGreaterThan(naturalA[0]!);
    expect(roadCut[1]).toBeLessThan(naturalA[1]!);
    expect(roadCut[3]).toBe(1);
  });

  it("darkens low pockets and exposes rocky slopes", () => {
    const flatLow = new Float32Array(4);
    const steepLow = new Float32Array(4);

    writeTerrainColor(flatLow, 0, 14, 14, 0.02, -240, 320);
    writeTerrainColor(steepLow, 0, 14, 14, 0.8, -240, 320);

    expect(flatLow[1]).toBeGreaterThan(flatLow[0]!);
    expect(steepLow[0]).toBeGreaterThan(flatLow[0]!);
    expect(steepLow[2]).toBeGreaterThan(flatLow[2]!);
  });

  it("keeps steep mountains rocky while snow settles on flatter peaks", () => {
    const flatPeak = new Float32Array(4);
    const steepPeak = new Float32Array(4);

    writeTerrainColor(flatPeak, 0, 150, 150, 0.04, 420, -560);
    writeTerrainColor(steepPeak, 0, 150, 150, 0.9, 420, -560);

    expect(flatPeak[0]! - steepPeak[0]!).toBeGreaterThan(0.08);
    expect(flatPeak[1]! - steepPeak[1]!).toBeGreaterThan(0.08);
    expect(flatPeak[2]! - steepPeak[2]!).toBeGreaterThan(0.08);
  });
});
