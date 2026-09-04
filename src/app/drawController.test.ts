import { describe, expect, it } from "vitest";

import { v3 } from "../sim/vec";
import { sampleQuadratic } from "./drawController";

describe("draw controller geometry", () => {
  it("samples the preview curve through both endpoints", () => {
    const points = sampleQuadratic(v3(0, 0, 0), v3(10, 0, 20), v3(20, 0, 0), 4, () => 0);

    expect(points).toHaveLength(5);
    expect(points[0]).toEqual(v3(0, 0, 0));
    expect(points[2]).toEqual(v3(10, 0, 10));
    expect(points[4]).toEqual(v3(20, 0, 0));
  });
});
