import type { BuildingStatus } from "./buildingLifecycle";
import type { BuildingKind } from "./buildingKinds";
import { roadType } from "./roadTypes";
import type { BuildingParcel } from "./slots";
import { allocateWorkforce } from "./workforce";

export const STARTING_MONEY = 40_000;
/**
 * Two and a half days of food for the people who arrive with the run.
 *
 * The first farm takes a construction stage to go up and another moment to be staffed, and a city
 * that starts an empty larder eats through a third of its population before it can grow anything.
 */
export const STARTING_FOOD = 30;
/** A stock to open with, so the first shops run before the first works is up. */
export const STARTING_MATERIALS = 40;
/** Share of itself a fed, housed city adds in a day. A curve, not a conversion rate. */
export const GROWTH_PER_DAY = 1.2;
/** Share of a homeless population that leaves in a day. Losing homes costs time, not the city. */
export const HOMELESS_LEAVE_PER_DAY = 0.4;
/** Materials a working commercial cell consumes a day, and a military one. */
export const MATERIALS_PER_COMMERCE_CELL = 1.5;
export const MATERIALS_PER_MILITARY_CELL = 2.5;
/** Stock a shortage has to climb back to before the shops and barracks restart. */
export const MATERIALS_RECOVERY = 12;
export const CITY_DAY_SECONDS = 96;

export interface CityResources {
  readonly population: number;
  readonly food: number;
  /** Industry makes them, commerce runs on them. Nothing else touches them. */
  readonly materials: number;
}

export interface CityTerms {
  readonly population: { readonly value: number; readonly housing: number; readonly change: number; readonly foodShortage: number };
  readonly food: { readonly value: number; readonly produced: number; readonly consumed: number };
  readonly materials: { readonly value: number; readonly produced: number; readonly consumed: number; readonly shortage: number };
  readonly trade: number;
}

const ROAD_METRE_COST: Record<string, number> = {
  pedestrian: 3,
  dirt: 4,
  street: 8,
  avenue: 14,
  industrial: 16,
  military: 18,
  tunnel: 45,
  highway: 32,
};

const output = (parcels: readonly Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">[], population: number, kind: BuildingKind, perCell: number): number => {
  const staffing = allocateWorkforce(parcels, population);
  return staffing.parcels.reduce((sum, status) => {
    const parcel = parcels[status.index]!;
    return sum + (status.staffed && parcel.kind === kind ? parcel.frontageCells * parcel.depthCells * perCell : 0);
  }, 0);
};

export function housingCapacity(parcels: readonly Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">[]): number {
  return parcels.filter((parcel) => parcel.kind === "residential").reduce((sum, parcel) => sum + parcel.frontageCells * parcel.depthCells * 12, 0);
}

/** Deterministic city stocks. One call is one simulation-day fraction, never a renderer frame. */
export class CityEconomy {
  private state: CityResources;
  /** True once the city has ever had a home, so the opening is not read as an eviction. */
  private housed = false;
  /** Latched while the works are behind, cleared only once the stock has really recovered. */
  private starved = false;

  constructor(state: Partial<CityResources> = {}) {
    this.state = { population: state.population ?? 12, food: state.food ?? STARTING_FOOD, materials: state.materials ?? STARTING_MATERIALS };
  }

  get resources(): CityResources {
    return this.state;
  }

  /**
   * True while the works cannot keep the shops and barracks supplied.
   *
   * Hysteresis, not a threshold: at a bare `materials <= 0` the shops stopped, stopped consuming,
   * the stock crept back above zero, they restarted and drained it again -- a flip between working
   * and idle every frame. A shortage now begins at empty and only ends once there is a real
   * buffer again.
   */
  get materialsShort(): boolean {
    if (this.state.materials <= 0) this.starved = true;
    else if (this.state.materials >= MATERIALS_RECOVERY) this.starved = false;
    return this.starved;
  }

  replaceWith(state: Partial<CityResources> = {}): void {
    this.state = { population: state.population ?? 12, food: state.food ?? STARTING_FOOD, materials: state.materials ?? STARTING_MATERIALS };
  }

  advance(parcels: readonly Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">[], seconds: number): CityTerms {
    const day = Math.max(0, seconds) / CITY_DAY_SECONDS;
    const housing = housingCapacity(parcels);
    const foodProduced = output(parcels, this.state.population, "agricultural", 8) * day;
    const materialsProduced = output(parcels, this.state.population, "industrial", 5) * day;
    const materialsConsumed = (output(parcels, this.state.population, "commercial", MATERIALS_PER_COMMERCE_CELL) + output(parcels, this.state.population, "military", MATERIALS_PER_MILITARY_CELL)) * day;
    const materialsAvailable = this.state.materials + materialsProduced;
    const materialsShortage = Math.max(0, materialsConsumed - materialsAvailable);
    const foodConsumed = this.state.population * day;
    const foodAvailable = this.state.food + foodProduced;
    const foodShortage = Math.max(0, foodConsumed - foodAvailable);
    const foodSurplus = Math.max(0, foodAvailable - foodConsumed);
    // Housing caps growth from the moment the city has any. Before that -- the opening minute,
    // where the first houses are still going up -- `housing - population` was a negative number
    // and the arrivals drained away before anything they could live in existed. Once a city has
    // been housed, losing those homes does push the population back down: that is a wave's cost,
    // and it is the whole reason the cap exists.
    this.housed ||= housing > 0;
    const room = this.housed ? housing - this.state.population : 0;
    // A city grows at a rate, not by turning every spare loaf into a resident. Growth used to be
    // half the food surplus, so one 3x4 farm -- 96 food a day against twelve mouths -- added
    // forty-two people a day and a town of twelve became two hundred in three minutes. Food and
    // housing gate it; the pace is the city's own.
    const canGrow = foodSurplus > 0 && room > 0;
    const growth = foodShortage > 0
      ? -Math.min(this.state.population, foodShortage * 2)
      // More people than homes: they leave, but over days rather than in the tick that noticed.
      // Taking the whole deficit at once meant one road placement -- which reshuffles which lots
      // exist -- emptied the island and ended the run on the spot.
      : room < 0 ? Math.max(room, -this.state.population * HOMELESS_LEAVE_PER_DAY * day)
      : canGrow ? Math.min(room, this.state.population * GROWTH_PER_DAY * day, foodSurplus) : 0;
    this.state = {
      // Under one resident there is nobody left; an exponential decline would otherwise approach
      // zero for ever and a run would never end.
      population: this.state.population + growth < 1 ? 0 : this.state.population + growth,
      food: Math.max(0, foodAvailable - foodConsumed),
      materials: Math.max(0, materialsAvailable - materialsConsumed),
    };
    return {
      population: { value: this.state.population, housing, change: growth, foodShortage },
      food: { value: this.state.food, produced: foodProduced, consumed: foodConsumed },
      materials: { value: this.state.materials, produced: materialsProduced, consumed: materialsConsumed, shortage: materialsShortage },
      trade: incomePerSecond(this.state.population, parcels.map((parcel) => ({ parcel, state: "working" as const }))),
    };
  }
}

export function roadBuildCost(type: string, metres: number): number {
  const base = ROAD_METRE_COST[roadType(type).id.split("_")[0]!] ?? 8;
  return Math.ceil(base * metres);
}

export function buildingBuildCost(parcel: Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">): number {
  const perCell: Record<BuildingKind, number> = { residential: 60, commercial: 110, agricultural: 75, industrial: 140, military: 190 };
  return parcel.frontageCells * parcel.depthCells * perCell[parcel.kind];
}

export function demolitionRefund(cost: number): number {
  return cost / 2;
}

/**
 * A wave's rebuilding is charged at a quarter of what the building cost to put up.
 *
 * Not free, so a wave through a dense district is felt in the budget as well as the clock; not
 * full price, so a bad wave does not bankrupt a city that was already short -- which is the spiral
 * the rule exists to avoid, and which full price produced: the treasury went from +$11k before a
 * second wave to -$17k after it, and a city of four thousand ended a run at -$144k.
 */
export function rebuildingCost(cost: number): number {
  return cost / 4;
}

export function incomePerSecond(population: number, statuses: readonly { readonly parcel: Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">; readonly state: BuildingStatus["state"] }[]): number {
  const trade = statuses.reduce((sum, status) => sum + (status.state === "working" && status.parcel.kind === "commercial" ? status.parcel.frontageCells * status.parcel.depthCells * 0.35 : 0), 0);
  return population * 0.02 + trade;
}

export class Treasury {
  private balance: number;

  constructor(balance = STARTING_MONEY) {
    this.balance = balance;
  }

  get money(): number {
    return this.balance;
  }

  canSpend(cost: number): boolean {
    return this.balance >= cost;
  }

  spend(cost: number, allowDebt = false): boolean {
    if (!allowDebt && !this.canSpend(cost)) return false;
    this.balance -= cost;
    return true;
  }

  earn(amount: number): void {
    this.balance += amount;
  }

  replaceWith(balance = STARTING_MONEY): void {
    this.balance = balance;
  }
}
