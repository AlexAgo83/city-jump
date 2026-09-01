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
}

export interface ProfileState {
  readonly prestige: number;
  readonly upgrades: readonly string[];
  readonly hardcore: boolean;
}

export const EARLY_WAVE_SCIENCE_MULTIPLIER = 2;

export const FIRST_UPGRADE_WEB: readonly PrestigeUpgrade[] = [
  { id: "battery-readiness", branch: "capability", cost: 5 },
  { id: "utility-survey", branch: "capability", cost: 8 },
  { id: "evac-drill", branch: "capability", cost: 12 },
  { id: "starter-funds", branch: "starting", cost: 6 },
  { id: "starter-materials", branch: "starting", cost: 9 },
  { id: "starter-services", branch: "starting", cost: 10 },
  { id: "wave-forecast", branch: "information", cost: 4 },
  { id: "coverage-map", branch: "information", cost: 7 },
  { id: "risk-ledger", branch: "information", cost: 11 },
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
