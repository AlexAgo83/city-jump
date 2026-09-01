import { describe, expect, it } from "vitest";
import { ledgerText } from "./ledger";
import type { CityTerms } from "../sim/economy";

describe("ledger", () => {
  it("renders reported simulation terms without recalculating them", () => {
    const terms: CityTerms = {
      population: { value: 42, housing: 90, change: 3.5, foodShortage: 1.25 },
      food: { value: 12, produced: 8, consumed: 6 },
      materials: { value: 7, produced: 3, consumed: 2, shortage: 0 },
      trade: 4,
    };

    expect(ledgerText(terms)).toContain("Population: 42.0 = housing 90 + change 3.50 - shortage 1.25");
    expect(ledgerText(terms)).toContain("Food: 12.0 = +8.00 - 6.00");
    expect(ledgerText(terms)).toContain("Trade: 4.00");
  });
});
