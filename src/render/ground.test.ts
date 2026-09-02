import { describe, expect, it } from "vitest";

import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";

import { Heightmap, rollingHills } from "../sim/heightmap";
import { writeHeightfieldNormals, writeTerrainColor } from "./ground";

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

describe("heightfield normals", () => {
  it("matches what ComputeNormals derives from the triangles", () => {
    const heightmap = new Heightmap({ size: 480, cell: 8, generator: rollingHills(18, 450, 18) });
    const n = heightmap.count;
    const positions = new Float32Array(n * n * 3);
    const indices: number[] = [];
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const i = iz * n + ix;
        positions[i * 3] = heightmap.worldX(ix);
        positions[i * 3 + 1] = heightmap.at(ix, iz);
        positions[i * 3 + 2] = heightmap.worldZ(iz);
        if (ix < n - 1 && iz < n - 1) indices.push(i, i + 1, i + n, i + 1, i + n + 1, i + n);
      }
    }
    const fromTriangles = new Float32Array(n * n * 3);
    VertexData.ComputeNormals(positions as unknown as number[], indices, fromTriangles as unknown as number[]);
    const fromHeights = new Float32Array(n * n * 3);
    writeHeightfieldNormals(heightmap, fromHeights, n, { minIx: 0, maxIx: n - 1, minIz: 0, maxIz: n - 1 });

    // The border vertices are the ones ComputeNormals has fewer triangles for; the interior is
    // where the two have to agree. They are not the same estimator -- one averages the triangles
    // that meet the vertex, the other takes the slope through it -- so they are compared by the
    // angle between them.
    let worst = 1;
    for (let iz = 1; iz < n - 1; iz++) {
      for (let ix = 1; ix < n - 1; ix++) {
        const i = (iz * n + ix) * 3;
        worst = Math.min(worst, [0, 1, 2].reduce((dot, axis) => dot + fromHeights[i + axis]! * fromTriangles[i + axis]!, 0));
      }
    }
    expect(worst).toBeGreaterThan(Math.cos(Math.PI / 180)); // within a degree, on the steep preset
  });
});
