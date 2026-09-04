import { describe, expect, it } from "vitest";

import { brushMovedFarEnough } from "./drawTool";

describe("draw tool geometry", () => {
  it("throttles repeat brush work until the pointer moves half the brush radius", () => {
    expect(brushMovedFarEnough(null, { x: 0, z: 0 }, 40)).toBe(true);
    expect(brushMovedFarEnough({ x: 0, z: 0 }, { x: 10, z: 0 }, 40)).toBe(false);
    expect(brushMovedFarEnough({ x: 0, z: 0 }, { x: 20, z: 0 }, 40)).toBe(true);
  });
});
