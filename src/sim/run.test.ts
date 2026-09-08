import { describe, expect, it } from "vitest";

import { buyUpgrade, carryScience, createRun, defeat, EARLY_WAVE_SCIENCE_MULTIPLIER, endIfPopulationZero, evacuate, isTalentOpen, settleWave, startingMoney, startingResources, TALENT_WEB, talentBonuses, type ProfileState } from "./run";

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

  it("describes every talent and roots the web at one node", () => {
    expect(TALENT_WEB.filter((node) => node.ring === 0).map((node) => node.id)).toEqual(["starter-funds"]);
    expect(TALENT_WEB.every((node) => node.name !== node.id && node.description.length > 0)).toBe(true);
    // Every node but the root hangs off a real one, so no branch is drawn to nothing.
    expect(TALENT_WEB.every((node) => node.ring === 0 || node.requires.every((id) => TALENT_WEB.some((other) => other.id === id)))).toBe(true);

    const bought = buyUpgrade(profile(10), "starter-funds");
    expect(bought).toEqual({ prestige: 4, upgrades: ["starter-funds"], hardcore: false });
    expect(buyUpgrade(bought, "starter-funds")).toBe(bought);
    expect(buyUpgrade(profile(10), "coverage-map")).toEqual(profile(10));
  });

  it("opens a talent only next to one already owned", () => {
    const root = TALENT_WEB.find((node) => node.id === "starter-funds")!;
    const drill = TALENT_WEB.find((node) => node.id === "barracks-drill")!;
    const shells = TALENT_WEB.find((node) => node.id === "guided-shells")!;

    expect(isTalentOpen(profile(99), root)).toBe(true);
    expect(isTalentOpen(profile(99), drill)).toBe(false);
    expect(buyUpgrade(profile(99), "barracks-drill")).toEqual(profile(99));

    const opened = buyUpgrade(profile(99), "starter-funds");
    expect(isTalentOpen(opened, drill)).toBe(true);
    expect(isTalentOpen(opened, shells)).toBe(false);
    expect(isTalentOpen(opened, root)).toBe(false); // owned is past, not open

    const drilled = buyUpgrade(opened, "barracks-drill");
    expect(isTalentOpen(drilled, shells)).toBe(true);
  });

  it("multiplies what its owned talents say and nothing else", () => {
    expect(talentBonuses(profile())).toEqual({ startingMoney: 0, militaryPower: 1, farmOutput: 1, tradeOutput: 1 });

    const both = { prestige: 0, upgrades: ["barracks-drill", "guided-shells"], hardcore: false };
    expect(talentBonuses(both).militaryPower).toBeCloseTo(1.4);
    expect(talentBonuses(both).farmOutput).toBe(1);
  });

  it("applies owned starter upgrades to a new run's opening stocks only", () => {
    const owned = { prestige: 0, upgrades: ["starter-funds"], hardcore: false };
    const resources = { population: 12, food: 0, materials: 0 };

    expect(startingMoney(profile())).toBe(100_000);
    expect(startingMoney(owned)).toBe(110_000);
    expect(startingResources(profile(), resources)).toEqual(resources);
    expect(startingResources(owned, resources)).toEqual(resources);
    expect(TALENT_WEB.filter((node) => node.effect.kind === "starting-money").map((node) => node.id)).toEqual(["starter-funds"]);
  });
});
