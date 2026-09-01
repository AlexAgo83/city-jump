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
  readonly materials: number;
  readonly services: number;
}

export interface CityTerms {
  readonly population: { readonly value: number; readonly housing: number; readonly change: number; readonly foodShortage: number };
  readonly food: { readonly value: number; readonly produced: number; readonly consumed: number };
  readonly materials: { readonly value: number; readonly produced: number };
  readonly services: { readonly value: number; readonly produced: number };
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
    this.state = { population: state.population ?? 12, food: state.food ?? 0, materials: state.materials ?? 0, services: state.services ?? 0 };
  }

  get resources(): CityResources {
    return this.state;
  }

  replaceWith(state: Partial<CityResources> = {}): void {
    this.state = { population: state.population ?? 12, food: state.food ?? 0, materials: state.materials ?? 0, services: state.services ?? 0 };
  }

  advance(parcels: readonly Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">[], seconds: number): CityTerms {
    const day = Math.max(0, seconds) / CITY_DAY_SECONDS;
    const housing = housingCapacity(parcels);
    const foodProduced = output(parcels, this.state.population, "agricultural", 8) * day;
    const materialsProduced = 0;
    const servicesProduced = output(parcels, this.state.population, "commercial", 4) * day;
    const foodConsumed = this.state.population * day;
    const foodAvailable = this.state.food + foodProduced;
    const foodShortage = Math.max(0, foodConsumed - foodAvailable);
    const jobs = allocateWorkforce(parcels, this.state.population).staffedDemand;
    const growth = foodShortage > 0 ? -Math.min(this.state.population, foodShortage * 2) : Math.min(housing - this.state.population, Math.max(0, servicesProduced + jobs * 0.02) * day);
    this.state = {
      population: Math.max(0, this.state.population + growth),
      food: Math.max(0, foodAvailable - foodConsumed),
      materials: this.state.materials,
      services: this.state.services + servicesProduced,
    };
    return {
      population: { value: this.state.population, housing, change: growth, foodShortage },
      food: { value: this.state.food, produced: foodProduced, consumed: foodConsumed },
      materials: { value: this.state.materials, produced: materialsProduced },
      services: { value: this.state.services, produced: servicesProduced },
      trade: servicesProduced,
    };
  }
}

export function roadBuildCost(type: string, metres: number): number {
  const base = ROAD_METRE_COST[roadType(type).id.split("_")[0]!] ?? 8;
  return Math.ceil(base * metres);
}

export function buildingBuildCost(parcel: Pick<BuildingParcel, "frontageCells" | "depthCells">): number {
  return parcel.frontageCells * parcel.depthCells * 800;
}

export function demolitionRefund(cost: number): number {
  return cost / 2;
}

export function incomePerSecond(population: number, statuses: readonly Pick<BuildingStatus, "parcel" | "state">[]): number {
  return population * 0.02;
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
