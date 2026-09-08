import { STARTING_MONEY, type CityResources } from "./economy";
import { DEFAULT_RESIDENTS_PER_WAVE } from "./wave";

export type RunEndReason = "evacuated" | "population_zero" | "defeated";

export interface RunState {
  readonly wave: number;
  readonly science: number;
  readonly ended: RunEndReason | null;
  readonly rules: RunRules;
}

export interface WaveReward {
  readonly defeated: boolean;
  readonly calledEarly: boolean;
  readonly baseScience: number;
}

export type UpgradeBranch = "starting" | "military" | "farming" | "trade";

/**
 * A talent node. `requires` is what makes the web a web rather than a shopping list: a node is
 * for sale once one of its neighbours is owned, so the unlocked area grows outwards from the
 * centre and the player picks a direction rather than a basket.
 */
export interface PrestigeUpgrade {
  readonly id: string;
  readonly branch: UpgradeBranch;
  /** Distance from the centre, which is also the drawing radius. 0 is the root. */
  readonly ring: number;
  readonly cost: number;
  readonly name: string;
  readonly description: string;
  /** Any one of these being owned opens this node. Empty means it is the root. */
  readonly requires: readonly string[];
  readonly effect: TalentEffect;
}

/** `starting-money` is dollars; every other kind is a share added to a multiplier of 1. */
export type TalentEffect =
  | { readonly kind: "starting-money"; readonly amount: number }
  | { readonly kind: "military-power"; readonly amount: number }
  | { readonly kind: "farm-output"; readonly amount: number }
  | { readonly kind: "trade-output"; readonly amount: number };

export interface ProfileState {
  readonly prestige: number;
  readonly upgrades: readonly string[];
  readonly hardcore: boolean;
}

export interface RunRules {
  readonly kaijuSpawns: boolean;
  readonly instantConstruction: boolean;
  readonly freeBuilding: boolean;
  readonly ignorePower: boolean;
  readonly ignoreWater: boolean;
  readonly residentsPerWave: number;
}

export const EARLY_WAVE_SCIENCE_MULTIPLIER = 2;
export const DEFAULT_RUN_RULES: RunRules = { kaijuSpawns: true, instantConstruction: false, freeBuilding: false, ignorePower: true, ignoreWater: true, residentsPerWave: DEFAULT_RESIDENTS_PER_WAVE };
/** Kept as a small first node: useful, not a second opening treasury. */
const STARTER_FUNDS_BONUS = 10_000;

/**
 * The talent web. Science banked by evacuating buys these, and they stay bought from one run to
 * the next -- the run resets, the web does not. Growing it is data: a node, a cost, and which
 * neighbour opens it.
 */
export const TALENT_WEB: readonly PrestigeUpgrade[] = [
  { id: "starter-funds", branch: "starting", ring: 0, cost: 6, name: "Starter grant", description: `Begin each run with $${STARTER_FUNDS_BONUS.toLocaleString()} extra.`, requires: [], effect: { kind: "starting-money", amount: STARTER_FUNDS_BONUS } },
  { id: "barracks-drill", branch: "military", ring: 1, cost: 8, name: "Barracks drill", description: "Batteries hit 15% harder.", requires: ["starter-funds"], effect: { kind: "military-power", amount: 0.15 } },
  { id: "guided-shells", branch: "military", ring: 2, cost: 16, name: "Guided shells", description: "Batteries hit a further 25% harder.", requires: ["barracks-drill"], effect: { kind: "military-power", amount: 0.25 } },
  { id: "crop-rotation", branch: "farming", ring: 1, cost: 8, name: "Crop rotation", description: "Farms grow 15% more food.", requires: ["starter-funds"], effect: { kind: "farm-output", amount: 0.15 } },
  { id: "greenhouses", branch: "farming", ring: 2, cost: 16, name: "Greenhouses", description: "Farms grow a further 25% more food.", requires: ["crop-rotation"], effect: { kind: "farm-output", amount: 0.25 } },
  { id: "trade-charter", branch: "trade", ring: 1, cost: 8, name: "Trade charter", description: "Commerce earns 15% more.", requires: ["starter-funds"], effect: { kind: "trade-output", amount: 0.15 } },
  { id: "free-port", branch: "trade", ring: 2, cost: 16, name: "Free port", description: "Commerce earns a further 25% more.", requires: ["trade-charter"], effect: { kind: "trade-output", amount: 0.25 } },
] as const;

export function createRun(rules: Partial<RunRules> = {}): RunState {
  return { wave: 1, science: 0, ended: null, rules: { ...DEFAULT_RUN_RULES, ...rules } };
}

export function settleWave(run: RunState, reward: WaveReward): RunState {
  if (run.ended) return run;
  const earned = reward.defeated ? reward.baseScience * (reward.calledEarly ? EARLY_WAVE_SCIENCE_MULTIPLIER : 1) : 0;
  return { ...run, wave: run.wave + 1, science: run.science + earned, ended: null };
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

/** Owned nodes are past, not open. Open means: not owned, and standing next to something owned. */
export function isTalentOpen(profile: Pick<ProfileState, "upgrades">, upgrade: PrestigeUpgrade): boolean {
  if (profile.upgrades.includes(upgrade.id)) return false;
  return upgrade.requires.length === 0 || upgrade.requires.some((id) => profile.upgrades.includes(id));
}

export function buyUpgrade(profile: ProfileState, upgradeId: string, web = TALENT_WEB): ProfileState {
  const upgrade = web.find((candidate) => candidate.id === upgradeId);
  if (!upgrade || !isTalentOpen(profile, upgrade) || profile.prestige < upgrade.cost) return profile;
  return { ...profile, prestige: profile.prestige - upgrade.cost, upgrades: [...profile.upgrades, upgradeId] };
}

export interface TalentBonuses {
  readonly startingMoney: number;
  /** Multipliers, so 1 is "no talent bought yet". */
  readonly militaryPower: number;
  readonly farmOutput: number;
  readonly tradeOutput: number;
}

export const NO_TALENT_BONUSES: TalentBonuses = { startingMoney: 0, militaryPower: 1, farmOutput: 1, tradeOutput: 1 };

export function talentBonuses(profile: Pick<ProfileState, "upgrades">, web = TALENT_WEB): TalentBonuses {
  const bonuses = { ...NO_TALENT_BONUSES };
  for (const upgrade of web) {
    if (!profile.upgrades.includes(upgrade.id)) continue;
    if (upgrade.effect.kind === "starting-money") bonuses.startingMoney += upgrade.effect.amount;
    if (upgrade.effect.kind === "military-power") bonuses.militaryPower += upgrade.effect.amount;
    if (upgrade.effect.kind === "farm-output") bonuses.farmOutput += upgrade.effect.amount;
    if (upgrade.effect.kind === "trade-output") bonuses.tradeOutput += upgrade.effect.amount;
  }
  return bonuses;
}

export function startingMoney(profile: Pick<ProfileState, "upgrades">, base = STARTING_MONEY): number {
  return base + talentBonuses(profile).startingMoney;
}

export function startingResources(_profile: Pick<ProfileState, "upgrades">, base: CityResources): CityResources {
  return base;
}
