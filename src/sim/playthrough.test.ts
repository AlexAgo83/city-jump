import { describe, expect, it } from "vitest";

import { playFirstRun, militaryGap } from "./playthrough";

describe("headless playthrough", () => {
  it("plays from arrival to the first wave through roads, zones, buildings and needs", () => {
    const played = playFirstRun(1, { instantConstruction: true, freeBuilding: true });

    expect(played.log).toContain("road:bridge");
    expect(played.log).toContain("zone:residential");
    expect(played.parcels.length).toBeGreaterThan(0);
    expect(played.statuses.some((status) => status.state === "working")).toBe(true);
    expect(played.needs.some((need) => need.need > 0)).toBe(true);
    expect(played.log.some((line) => line.startsWith("need:"))).toBe(true);
    expect(played.economy.resources.population).toBeGreaterThan(0);
    expect(played.wave.threat).toBeGreaterThan(0);
    expect(played.log.some((line) => line.startsWith("wave:"))).toBe(true);
  });

  it("derives the first-wave outcome from the fight", () => {
    const played = playFirstRun(2, { instantConstruction: true, freeBuilding: true });

    expect(played.log).toContain("wave:held");
    expect(played.wave.salvos).toBeGreaterThan(0);
    expect(played.run.ended === "defeated" || played.run.science > 0).toBe(true);
    expect(played.wave.rebuildingCost).toBeGreaterThan(0);
  });

  it("is deterministic, honours gameplay switches and reports the military gap", () => {
    expect(playFirstRun(3, { instantConstruction: true, freeBuilding: true }).wave).toEqual(playFirstRun(3, { instantConstruction: true, freeBuilding: true }).wave);
    expect(playFirstRun(3, { kaijuSpawns: false }).log.some((line) => line.startsWith("wave:"))).toBe(false);
    expect(playFirstRun(3, { instantConstruction: true }).statuses.some((status) => status.remainingSeconds === 0)).toBe(true);
    expect(playFirstRun(3, { freeBuilding: true }).treasury.money).toBeGreaterThan(playFirstRun(3).treasury.money);
    expect(militaryGap(3)).toBeLessThan(0);
  });
});
