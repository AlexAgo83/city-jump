import type { BuildingStatus } from "./buildingLifecycle";
import type { BuildingKind } from "./buildingKinds";
import { roadType } from "./roadTypes";
import type { BuildingParcel } from "./slots";

export const STARTING_MONEY = 20_000;

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

const BUILDING_CELL_COST: Record<BuildingKind, number> = {
  residential: 60,
  commercial: 110,
  agricultural: 75,
  industrial: 140,
  military: 190,
};

export function roadBuildCost(type: string, metres: number): number {
  const base = ROAD_METRE_COST[roadType(type).id.split("_")[0]!] ?? 8;
  return Math.ceil(base * metres);
}

export function buildingBuildCost(parcel: Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">): number {
  return parcel.frontageCells * parcel.depthCells * BUILDING_CELL_COST[parcel.kind];
}

export function demolitionRefund(cost: number): number {
  return cost / 2;
}

export function incomePerSecond(population: number, statuses: readonly Pick<BuildingStatus, "parcel" | "state">[]): number {
  const tax = population * 0.02;
  const trade = statuses
    .filter((status) => status.state === "working" && status.parcel.kind === "commercial")
    .reduce((sum, status) => sum + status.parcel.frontageCells * status.parcel.depthCells * 0.8, 0);
  return tax + trade;
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
