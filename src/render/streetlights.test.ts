import { describe, expect, it } from "vitest";

import { streetlightSegmentTouchesBounds } from "./streetlights";

describe("streetlight dirty rebuild bounds", () => {
  it("includes the roadside lamp offset in the segment predicate", () => {
    const samples = [
      { x: -100, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 },
    ];

    expect(streetlightSegmentTouchesBounds(samples, { width: 8 }, { minX: -2, maxX: 2, minZ: 6, maxZ: 8 })).toBe(true);
    expect(streetlightSegmentTouchesBounds(samples, { width: 8 }, { minX: -2, maxX: 2, minZ: 14, maxZ: 16 })).toBe(false);
  });
});
