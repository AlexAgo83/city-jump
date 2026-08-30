import { describe, expect, it } from "vitest";

import { writeTerrainColor } from "./ground";

describe("ground terrain color", () => {
  it("adds deterministic terrain variation and dusty road edges", () => {
    const naturalA = new Float32Array(4);
    const naturalB = new Float32Array(4);
    const roadCut = new Float32Array(4);

    writeTerrainColor(naturalA, 0, 12, 12, 100, 100);
    writeTerrainColor(naturalB, 0, 12, 12, 760, -340);
    writeTerrainColor(roadCut, 0, 11.2, 12, 100, 100);

    expect([...naturalA]).not.toEqual([...naturalB]);
    expect(roadCut[0]).toBeGreaterThan(naturalA[0]!);
    expect(roadCut[1]).toBeLessThan(naturalA[1]!);
    expect(roadCut[3]).toBe(1);
  });
});
