import { describe, expect, it } from "vitest";

import { signalMastTouchesBounds } from "./signals";

describe("signal dirty rebuild bounds", () => {
  it("preserves masts outside the dirty box and rebuilds those inside it", () => {
    const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };

    expect(signalMastTouchesBounds({ x: 0, z: 0 }, bounds)).toBe(true);
    expect(signalMastTouchesBounds({ x: 6, z: 0 }, bounds)).toBe(false);
  });
});
