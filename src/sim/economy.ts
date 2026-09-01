import type { BuildingStatus } from "./buildingLifecycle";
import type { BuildingKind } from "./buildingKinds";
import { roadType } from "./roadTypes";
import type { BuildingParcel } from "./slots";
import { allocateWorkforce } from "./workforce";

export const STARTING_MONEY = 40_000;
export const CITY_DAY_SECONDS = 96;

export interface CityResources {
  readonly population: number;
  readonly food: number;
}

export interface CityTerms {
  readonly population: { readonly value: number; readonly housing: number; readonly change: number; readonly foodShortage: number };
  readonly food: { readonly value: number; readonly produced: number; readonly consumed: number };
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

  constructor(state: Partial<CityResources> = {}) {
    this.state = { population: state.population ?? 12, food: state.food ?? 0 };
  }

  get resources(): CityResources {
    return this.state;
  }

  replaceWith(state: Partial<CityResources> = {}): void {
    this.state = { population: state.population ?? 12, food: state.food ?? 0 };
  }

  advance(parcels: readonly Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">[], seconds: number): CityTerms {
    const day = Math.max(0, seconds) / CITY_DAY_SECONDS;
    const housing = housingCapacity(parcels);
    const foodProduced = output(parcels, this.state.population, "agricultural", 8) * day;
    const foodConsumed = this.state.population * day;
    const foodAvailable = this.state.food + foodProduced;
    const foodShortage = Math.max(0, foodConsumed - foodAvailable);
    const foodSurplus = Math.max(0, foodAvailable - foodConsumed);
    const growth = foodShortage > 0 ? -Math.min(this.state.population, foodShortage * 2) : Math.min(housing - this.state.population, foodSurplus * 0.5);
    this.state = {
      population: Math.max(0, this.state.population + growth),
      food: Math.max(0, foodAvailable - foodConsumed),
    };
    return {
      population: { value: this.state.population, housing, change: growth, foodShortage },
      food: { value: this.state.food, produced: foodProduced, consumed: foodConsumed },
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

export function incomePerSecond(population: number, statuses: readonly { readonly parcel: Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">; readonly state: BuildingStatus["state"] }[]): number {
  const trade = statuses.reduce((sum, status) => sum + (status.state === "working" && (status.parcel.kind === "commercial" || status.parcel.kind === "industrial") ? status.parcel.frontageCells * status.parcel.depthCells * (status.parcel.kind === "commercial" ? 0.35 : 0.25) : 0), 0);
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
