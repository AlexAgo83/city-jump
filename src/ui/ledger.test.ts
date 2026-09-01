import { describe, expect, it } from "vitest";
import { ledgerRows } from "./ledger";
import type { CityTerms } from "../sim/economy";

describe("ledger", () => {
  it("renders reported simulation terms without recalculating them", () => {
    const terms: CityTerms = {
      population: { value: 42, housing: 90, change: 3.5, foodShortage: 1.25 },
      food: { value: 12, produced: 8, consumed: 6 },
      materials: { value: 7, produced: 3, consumed: 2, shortage: 0 },
      trade: 4,
    };

    const rows = ledgerRows(terms);
    const row = (label: string) => rows.find((candidate) => candidate.label === label)!;

    expect(row("People")).toMatchObject({ value: "42.0", inflow: "+3.5", outflow: "--", short: false });
    expect(row("Food")).toMatchObject({ value: "12.0", inflow: "+8.0", outflow: "-6.0", short: true });
    expect(row("Materials")).toMatchObject({ value: "7.0", inflow: "+3.0", outflow: "-2.0", short: false });
    expect(row("Trade").value).toBe("$4.0/s");
    expect(ledgerRows(undefined)).toEqual([]);
  });

  it("flags a resource going out faster than it comes in", () => {
    const starving: CityTerms = {
      population: { value: 42, housing: 20, change: -6, foodShortage: 4 },
      food: { value: 0, produced: 1, consumed: 9 },
      materials: { value: 0, produced: 0, consumed: 5, shortage: 5 },
      trade: 0,
    };
    const rows = ledgerRows(starving);

    expect(rows.filter((row) => row.short).map((row) => row.label)).toEqual(["People", "Housing", "Food", "Materials"]);
    expect(rows.find((row) => row.label === "People")!.outflow).toBe("-6.0");
  });
});
