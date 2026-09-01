import { describe, expect, it } from "vitest";

import { playFirstRun } from "./playthrough";
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
    const played = playFirstRun(1, { instantConstruction: true });
    const staffing = allocateWorkforce(played.parcels, played.economy.resources.population);

    // The barracks are staffed first, so the trade-off is visible in what is left behind: a city
    // that fielded its batteries cannot also run every farm and shop it built.
    expect(staffing.byKind.military.staffedDemand / staffing.workforce).toBeGreaterThan(0.15);
    expect(staffing.byKind.agricultural.idle + staffing.byKind.commercial.idle).toBeGreaterThan(0);
  });
});
