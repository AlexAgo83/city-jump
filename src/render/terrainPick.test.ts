import { describe, expect, it } from "vitest";

import { RoadGraph } from "../sim/graph";
import { Heightmap, rollingHills } from "../sim/heightmap";
import { v3 } from "../sim/vec";
import { pickHeightmap, type PickRay } from "./terrainPick";

/**
 * What `scene.pick` does: every triangle of the ground mesh, nearest hit wins. The bounded walk
 * has to agree with it exactly, not approximately -- a zone brush and a road end land where this
 * says they land.
 */
function pickEveryTriangle(heightmap: Heightmap, ray: PickRay): { x: number; y: number; z: number } | null {
  const cells = heightmap.count - 1;
  let best: { x: number; y: number; z: number } | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let iz = 0; iz < cells; iz++) {
    for (let ix = 0; ix < cells; ix++) {
      const cellHit = pickOneCell(heightmap, ray, ix, iz);
      if (!cellHit) continue;
      const distance = Math.hypot(cellHit.x - ray.origin.x, cellHit.y - ray.origin.y, cellHit.z - ray.origin.z);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = cellHit;
      }
    }
  }
  return best;
}

/** One cell, through the public walk, by pointing a ray straight down its own footprint. */
function pickOneCell(heightmap: Heightmap, ray: PickRay, ix: number, iz: number): { x: number; y: number; z: number } | null {
  const single = new Proxy(heightmap, {
    get(target, key) {
      if (key === "count") return 2;
      if (key === "worldX") return (i: number) => target.worldX(ix + i);
      if (key === "worldZ") return (i: number) => target.worldZ(iz + i);
      if (key === "at") return (x: number, z: number) => target.at(ix + x, iz + z);
      return Reflect.get(target, key);
    },
  });
  return pickHeightmap(single, ray);
}

const terrain = new Heightmap({ size: 800, cell: 8, generator: rollingHills(14, 220, 2) });

describe("bounded terrain picking", () => {
  const rays: [string, PickRay][] = [
    ["straight down", { origin: { x: 12, y: 500, z: -37 }, direction: { x: 0, y: -1, z: 0 } }],
    ["a typical camera angle", { origin: { x: -260, y: 400, z: -300 }, direction: { x: 0.4, y: -0.62, z: 0.68 } }],
    ["grazing the slopes", { origin: { x: -399, y: 190, z: -180 }, direction: { x: 0.995, y: -0.09, z: 0.04 } }],
    ["along the diagonal", { origin: { x: -390, y: 420, z: -390 }, direction: { x: 0.6, y: -0.53, z: 0.6 } }],
  ];

  for (const [name, ray] of rays) {
    it(`lands where a full triangle scan lands, ${name}`, () => {
      const bounded = pickHeightmap(terrain, ray);
      const scanned = pickEveryTriangle(terrain, ray);

      expect(bounded).not.toBeNull();
      expect(scanned).not.toBeNull();
      expect(bounded?.x).toBeCloseTo(scanned?.x as number, 6);
      expect(bounded?.y).toBeCloseTo(scanned?.y as number, 6);
      expect(bounded?.z).toBeCloseTo(scanned?.z as number, 6);
    });
  }

  it("keeps a miss a miss", () => {
    // Above the map and pointing up, and beside the map pointing down: neither touches ground.
    expect(pickHeightmap(terrain, { origin: { x: 0, y: 200, z: 0 }, direction: { x: 0, y: 1, z: 0 } })).toBeNull();
    expect(pickHeightmap(terrain, { origin: { x: 5000, y: 200, z: 0 }, direction: { x: 0, y: -1, z: 0 } })).toBeNull();
    expect(pickHeightmap(terrain, { origin: { x: -900, y: 60, z: 0 }, direction: { x: -1, y: -0.2, z: 0 } })).toBeNull();
  });

  it("follows the ground down a road cut", () => {
    const cut = new Heightmap({ size: 800, cell: 8, generator: rollingHills(14, 220, 2) });
    const graph = new RoadGraph((x, z) => cut.heightAt(x, z));
    const above: PickRay = { origin: { x: 0, y: 500, z: 0 }, direction: { x: 0, y: -1, z: 0 } };
    const before = pickHeightmap(cut, above);

    graph.addSegment(graph.addNode(-300, 0), graph.addNode(300, 0), v3(0, 0, 0));
    cut.conformToRoads(graph);
    const after = pickHeightmap(cut, above);

    // The cut moved the ground, and the pick moved with it, onto the levelled road bed.
    expect(after?.y).not.toBeCloseTo(before?.y as number, 3);
    expect(after?.y).toBeCloseTo(pickEveryTriangle(cut, above)?.y as number, 6);
  });

  it("stays bounded on a ray that crosses the whole map", () => {
    const wide = new Heightmap({ size: 5400, cell: 8, generator: () => 0 });
    const diagonal = Math.SQRT1_2;
    const grazing: PickRay = { origin: { x: -2700, y: 0.5, z: -2700 }, direction: { x: diagonal, y: -0.00001, z: diagonal } };

    // 675 cells a side: a diagonal crossing visits about 1,350 of them, never the 455,625 the
    // full mesh holds. The cap is what makes "bounded" a property rather than a hope.
    expect(pickHeightmap(wide, grazing, 200)).toBeNull();
  });
});
