import { describe, expect, it } from "vitest";

import { v3 } from "../sim/vec";
import { brushMovedFarEnough, sampleQuadratic } from "./drawTool";

describe("draw tool geometry", () => {
  it("samples the preview curve through both endpoints", () => {
    const points = sampleQuadratic(v3(0, 0, 0), v3(10, 0, 20), v3(20, 0, 0), 4);

    expect(points).toHaveLength(5);
    expect(points[0]).toEqual(v3(0, 0, 0));
    expect(points[2]).toEqual(v3(10, 0, 10));
    expect(points[4]).toEqual(v3(20, 0, 0));
  });

  it("throttles repeat brush work until the pointer moves half the brush radius", () => {
    expect(brushMovedFarEnough(null, { x: 0, z: 0 }, 40)).toBe(true);
    expect(brushMovedFarEnough({ x: 0, z: 0 }, { x: 10, z: 0 }, 40)).toBe(false);
    expect(brushMovedFarEnough({ x: 0, z: 0 }, { x: 20, z: 0 }, 40)).toBe(true);
  });
});
