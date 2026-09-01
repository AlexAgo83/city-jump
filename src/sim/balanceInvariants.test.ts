import { describe, expect, it } from "vitest";

import { parcelDemandLimits } from "./slots";
import { allocateWorkforce, workforceDemand } from "./workforce";

/**
 * Properties `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea` asserts about the
 * game, held as tests rather than as prose.
 *
 * These exist because a balance pass tuned to a target number once inverted the brief's premise
 * without anything noticing: military went to one worker a cell -- cheaper than a shop -- and to a
 * demand limit six times looser than housing, purely to make a battery count come out at three.
 * A target says where to land; an invariant says what may not be traded away to get there.
 */
describe("balance invariants", () => {
  const size = { frontageCells: 2, depthCells: 3 } as const;

  it("prices a barracks above a farm: the military is never the cheap choice", () => {
    expect(workforceDemand({ kind: "military", ...size })).toBeGreaterThan(workforceDemand({ kind: "agricultural", ...size }));
  });

  it("never permits more military lots than housing", () => {
    for (const population of [12, 40, 96, 128, 400]) {
      const limits = parcelDemandLimits(population);
      expect(limits.military).toBeLessThanOrEqual(limits.residential);
    }
  });

  it("makes the defence cost the city something it wanted", () => {
    // Stated over the allocation rule rather than over one run's population, because how scarce
    // the workforce happens to be at a given wave is a balance number, while "the barracks are
    // manned before the farms, and something goes short" is the premise itself.
    const city = [
      { kind: "military", ...size, position: { x: 0, y: 0, z: 0 } },
      { kind: "agricultural", ...size, position: { x: 40, y: 0, z: 0 } },
      { kind: "commercial", ...size, position: { x: 80, y: 0, z: 0 } },
    ] as const;
    const scarce = allocateWorkforce(city, workforceDemand(city[0]) + 1);

    expect(scarce.byKind.military.staffed).toBe(1);
    expect(scarce.byKind.agricultural.idle + scarce.byKind.commercial.idle).toBeGreaterThan(0);
    expect(scarce.byKind.military.staffedDemand / scarce.workforce).toBeGreaterThan(0.15);
  });
});
