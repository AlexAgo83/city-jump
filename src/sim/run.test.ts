import { describe, expect, it } from "vitest";

import { buyUpgrade, carryScience, createRun, defeat, EARLY_WAVE_SCIENCE_MULTIPLIER, endIfPopulationZero, evacuate, FIRST_UPGRADE_WEB, settleWave, type ProfileState } from "./run";

const profile = (prestige = 0): ProfileState => ({ prestige, upgrades: [], hardcore: false });

describe("run state", () => {
  it("pays science only for defeated waves and doubles an early call", () => {
    const won = settleWave(createRun(), { defeated: true, calledEarly: false, baseScience: 10 });
    expect(won).toMatchObject({ wave: 2, science: 10 });

    const early = settleWave(won, { defeated: true, calledEarly: true, baseScience: 10 });
    expect(early.science).toBe(10 + 10 * EARLY_WAVE_SCIENCE_MULTIPLIER);

    const lost = settleWave(early, { defeated: false, calledEarly: true, baseScience: 10 });
    expect(lost.science).toBe(early.science);
    expect(lost.wave).toBe(early.wave + 1);
  });

  it("ends by evacuation or population zero", () => {
    expect(evacuate(createRun()).ended).toBe("evacuated");
    expect(endIfPopulationZero(createRun(), 0).ended).toBe("population_zero");
    expect(endIfPopulationZero(createRun(), 1).ended).toBeNull();
  });

  it("carries science only when the player leaves", () => {
    const run = settleWave(createRun(), { defeated: true, calledEarly: false, baseScience: 7 });

    expect(carryScience(profile(3), evacuate(run)).prestige).toBe(10);
    expect(carryScience(profile(3), defeat(run)).prestige).toBe(3);
  });

  it("spends prestige on capabilities, starts, and information without core-rate nodes", () => {
    expect(FIRST_UPGRADE_WEB).toHaveLength(9);
    expect(new Set(FIRST_UPGRADE_WEB.map((node) => node.branch))).toEqual(new Set(["capability", "starting", "information"]));

    const bought = buyUpgrade(profile(10), "coverage-map");
    expect(bought).toEqual({ prestige: 3, upgrades: ["coverage-map"], hardcore: false });
    expect(buyUpgrade(bought, "coverage-map")).toBe(bought);
  });
});
