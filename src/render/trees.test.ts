import { describe, expect, it } from "vitest";

import { treeTouchesBounds } from "./trees";

describe("tree dirty rebuild bounds", () => {
  it("uses the same point predicate for preserving and recomputing trees", () => {
    const bounds = { minX: -10, maxX: 10, minZ: -5, maxZ: 5 };

    expect(treeTouchesBounds({ x: 0, z: 0 }, bounds)).toBe(true);
    expect(treeTouchesBounds({ x: -10, z: 5 }, bounds)).toBe(true);
    expect(treeTouchesBounds({ x: -11, z: 0 }, bounds)).toBe(false);
    expect(treeTouchesBounds({ x: 0, z: 6 }, bounds)).toBe(false);
  });
});
