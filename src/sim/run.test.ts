import { describe, expect, it } from "vitest";

import { buyUpgrade, carryScience, createRun, defeat, EARLY_WAVE_SCIENCE_MULTIPLIER, endIfPopulationZero, evacuate, FIRST_UPGRADE_WEB, settleWave, startingMoney, startingResources, type ProfileState } from "./run";

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

  it("offers only upgrades with starting-condition effects", () => {
    expect(FIRST_UPGRADE_WEB.map((node) => node.id)).toEqual(["starter-funds", "starter-materials", "starter-services"]);
    expect(FIRST_UPGRADE_WEB.every((node) => node.name !== node.id && node.description.length > 0)).toBe(true);
    expect(FIRST_UPGRADE_WEB.every((node) => node.branch === "starting")).toBe(true);

    const bought = buyUpgrade(profile(10), "starter-funds");
    expect(bought).toEqual({ prestige: 4, upgrades: ["starter-funds"], hardcore: false });
    expect(buyUpgrade(bought, "starter-funds")).toBe(bought);
    expect(buyUpgrade(profile(10), "coverage-map")).toEqual(profile(10));
  });

  it("applies owned starter upgrades to a new run's opening stocks only", () => {
    const owned = { prestige: 0, upgrades: ["starter-funds", "starter-materials", "starter-services"], hardcore: false };
    const resources = { population: 12, food: 0, materials: 0, services: 0 };

    expect(startingMoney(profile())).toBe(40_000);
    expect(startingMoney(owned)).toBe(50_000);
    expect(startingResources(profile(), resources)).toEqual(resources);
    expect(startingResources(owned, resources)).toEqual({ population: 12, food: 0, materials: 25, services: 20 });
    expect(FIRST_UPGRADE_WEB.every((node) => node.effect.kind.startsWith("starting-"))).toBe(true);
  });
});
