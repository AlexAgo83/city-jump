import { STARTING_MONEY, type CityResources } from "./economy";

export type RunEndReason = "evacuated" | "population_zero" | "defeated";

export interface RunState {
  readonly wave: number;
  readonly science: number;
  readonly ended: RunEndReason | null;
}

export interface WaveReward {
  readonly defeated: boolean;
  readonly calledEarly: boolean;
  readonly baseScience: number;
}

export type UpgradeBranch = "capability" | "starting" | "information";

export interface PrestigeUpgrade {
  readonly id: string;
  readonly branch: UpgradeBranch;
  readonly cost: number;
  readonly name: string;
  readonly description: string;
  readonly effect: { readonly kind: "starting-money"; readonly amount: number } | { readonly kind: "starting-resource"; readonly resource: "materials" | "services"; readonly amount: number };
}

export interface ProfileState {
  readonly prestige: number;
  readonly upgrades: readonly string[];
  readonly hardcore: boolean;
}

export const EARLY_WAVE_SCIENCE_MULTIPLIER = 2;
const STARTER_FUNDS_BONUS = 10_000;
const STARTER_MATERIALS_BONUS = 25;
const STARTER_SERVICES_BONUS = 20;

export const FIRST_UPGRADE_WEB: readonly PrestigeUpgrade[] = [
  { id: "starter-funds", branch: "starting", cost: 6, name: "Starter grant", description: `Begin each run with $${STARTER_FUNDS_BONUS.toLocaleString()} extra.`, effect: { kind: "starting-money", amount: STARTER_FUNDS_BONUS } },
  { id: "starter-materials", branch: "starting", cost: 9, name: "Material cache", description: `Begin each run with ${STARTER_MATERIALS_BONUS} materials.`, effect: { kind: "starting-resource", resource: "materials", amount: STARTER_MATERIALS_BONUS } },
  { id: "starter-services", branch: "starting", cost: 10, name: "Service crew", description: `Begin each run with ${STARTER_SERVICES_BONUS} services.`, effect: { kind: "starting-resource", resource: "services", amount: STARTER_SERVICES_BONUS } },
] as const;

export function createRun(): RunState {
  return { wave: 1, science: 0, ended: null };
}

export function settleWave(run: RunState, reward: WaveReward): RunState {
  if (run.ended) return run;
  const earned = reward.defeated ? reward.baseScience * (reward.calledEarly ? EARLY_WAVE_SCIENCE_MULTIPLIER : 1) : 0;
  return { wave: run.wave + 1, science: run.science + earned, ended: null };
}

export function evacuate(run: RunState): RunState {
  return run.ended ? run : { ...run, ended: "evacuated" };
}

export function endIfPopulationZero(run: RunState, population: number): RunState {
  return !run.ended && population <= 0 ? { ...run, ended: "population_zero" } : run;
}

export function defeat(run: RunState): RunState {
  return run.ended ? run : { ...run, ended: "defeated" };
}

export function carryScience(profile: ProfileState, run: RunState): ProfileState {
  return run.ended === "evacuated" ? { ...profile, prestige: profile.prestige + run.science } : profile;
}

export function buyUpgrade(profile: ProfileState, upgradeId: string, web = FIRST_UPGRADE_WEB): ProfileState {
  const upgrade = web.find((candidate) => candidate.id === upgradeId);
  if (!upgrade || profile.upgrades.includes(upgradeId) || profile.prestige < upgrade.cost) return profile;
  return { ...profile, prestige: profile.prestige - upgrade.cost, upgrades: [...profile.upgrades, upgradeId] };
}

export function startingMoney(profile: Pick<ProfileState, "upgrades">, base = STARTING_MONEY): number {
  return FIRST_UPGRADE_WEB.reduce((money, upgrade) => money + (upgrade.effect.kind === "starting-money" && profile.upgrades.includes(upgrade.id) ? upgrade.effect.amount : 0), base);
}

export function startingResources(profile: Pick<ProfileState, "upgrades">, base: CityResources): CityResources {
  return FIRST_UPGRADE_WEB.reduce((resources, upgrade) => {
    if (upgrade.effect.kind !== "starting-resource" || !profile.upgrades.includes(upgrade.id)) return resources;
    return { ...resources, [upgrade.effect.resource]: resources[upgrade.effect.resource] + upgrade.effect.amount };
  }, base);
}
