import { describe, expect, it } from "vitest";

import { roofObjectLimit, roofPropY } from "./buildings";

describe("roof props", () => {
  it("allows up to three objects as the roof gets bigger", () => {
    expect([0, 1, 2, 3, 4, 16].map(roofObjectLimit)).toEqual([0, 1, 2, 3, 3, 3]);
  });

  it("keeps roof objects on the roof deck, not on parapets or roof huts", () => {
    expect(roofPropY("lot_2x2", 7.25, -7.25, 11.5)).toBe(10);
    expect(roofPropY("lot_4x4", 15.25, -15.25, 15.5)).toBe(14);
    expect(roofPropY("lot_4x4", 1, -1, 15.5)).toBeCloseTo(10.08, 2);
    expect(roofPropY("lot_1x1", 3.25, -3.25, 9.5)).toBe(9.5);
    expect(roofPropY("lot_1x1", 3.25, -0.75, 9.5)).toBeCloseTo(7.58, 2);
  });
});
