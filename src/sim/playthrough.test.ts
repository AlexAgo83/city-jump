import { describe, expect, it } from "vitest";

import { playFirstRun, militaryGap } from "./playthrough";

describe("headless playthrough", () => {
  it("plays from arrival to the first wave through roads, zones, buildings and needs", () => {
    const played = playFirstRun(1, { instantConstruction: true, freeBuilding: true }, "partial_loss");

    expect(played.log).toContain("road:bridge");
    expect(played.log).toContain("zone:residential");
    expect(played.parcels.length).toBeGreaterThan(0);
    expect(played.statuses.some((status) => status.state === "working")).toBe(true);
    expect(played.needs.some((need) => need.need > 0)).toBe(true);
    expect(played.economy.resources.population).toBeGreaterThan(0);
    expect(played.wave.threat).toBeGreaterThan(0);
  });

  it("asserts the three first-wave outcomes", () => {
    expect(playFirstRun(2, { instantConstruction: true, freeBuilding: true }, "total_loss").run.ended).toBe("defeated");
    expect(playFirstRun(2, { instantConstruction: true, freeBuilding: true }, "partial_loss").wave.nextWaveReachable).toBe(true);
    expect(playFirstRun(2, { instantConstruction: true, freeBuilding: true }, "clean_hold").run.science).toBeGreaterThan(0);
  });

  it("is deterministic, honours gameplay switches and reports the military gap", () => {
    expect(playFirstRun(3, { instantConstruction: true, freeBuilding: true }).wave).toEqual(playFirstRun(3, { instantConstruction: true, freeBuilding: true }).wave);
    expect(playFirstRun(3, { kaijuSpawns: false }).wave.threat).toBe(0);
    expect(playFirstRun(3, { instantConstruction: true }).statuses.some((status) => status.remainingSeconds === 0)).toBe(true);
    expect(playFirstRun(3, { freeBuilding: true }).treasury.money).toBeGreaterThan(playFirstRun(3).treasury.money);
    expect(Number.isFinite(militaryGap(3))).toBe(true);
  });
});
