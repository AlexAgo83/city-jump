import { describe, expect, it } from "vitest";

import { portalOutline, segmentMeshTouchesBounds, tunnelSection, tunnelStripIndices } from "./roadMesh";

describe("road mesh geometry", () => {
  it("builds a symmetrical arched tunnel section", () => {
    const section = tunnelSection(12);

    expect(section[0]).toEqual({ x: -10, y: 0 });
    expect(section.at(-1)).toEqual({ x: 10, y: 0 });
    expect(section[4]!.y).toBeGreaterThan(section[1]!.y);
    const xs = section.map((p) => p.x);
    for (let i = 0; i < xs.length; i++) expect(xs[i]).toBeCloseTo(-xs[xs.length - 1 - i]!);
  });

  it("winds tunnel strip faces consistently", () => {
    expect(tunnelStripIndices(3, 1, false)).toEqual([0, 3, 1, 1, 3, 4, 1, 4, 2, 2, 4, 5]);
    expect(tunnelStripIndices(3, 1, true)).toEqual([0, 1, 3, 1, 4, 3, 1, 2, 4, 2, 5, 4]);
  });

  it("places a portal outline perpendicular to the road tangent", () => {
    const outline = portalOutline({ x: 100, z: 50 }, { x: 0, z: 1 }, 12, 7);

    expect(outline[0]!.x).toBeCloseTo(110);
    expect(outline[0]!.z).toBeCloseTo(50);
    expect(outline.at(-1)!.x).toBeCloseTo(90);
    expect(outline.at(-1)!.z).toBeCloseTo(50);
    expect(outline[0]!.y).toBe(7);
  });

  it("rebuilds road meshes whose swept width touches the dirty region", () => {
    expect(
      segmentMeshTouchesBounds(
        [
          { x: -100, y: 0, z: 0 },
          { x: 100, y: 0, z: 0 },
        ],
        { width: 10, highway: false, pedestrian: false },
        { minX: -2, maxX: 2, minZ: 6, maxZ: 8 },
      ),
    ).toBe(true);
  });

  it("does not rebuild a diagonal road only because its broad AABB touches the dirty region", () => {
    expect(
      segmentMeshTouchesBounds(
      [
        { x: -100, y: 0, z: -100 },
        { x: 100, y: 0, z: 100 },
      ],
      { width: 10, highway: false, pedestrian: false },
      { minX: -2, maxX: 2, minZ: 90, maxZ: 94 },
      ),
    ).toBe(false);
  });
});
