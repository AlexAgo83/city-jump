import type { BuildingParcel } from "./slots";
import { buildingBuildCost } from "./economy";
import { allocateWorkforce } from "./workforce";

export type BuildingState = "waiting" | "rising" | "working" | "idle" | "rebuilding";
export type SavedBuildingState = [x: number, z: number, state: BuildingState, startedAt: number];

export interface BuildingStatus {
  readonly parcel: BuildingParcel;
  readonly state: BuildingState;
  readonly reason?: "construction" | "workers" | "funds" | "power" | "water";
}

export interface BuildingFunding {
  spend(parcel: BuildingParcel, cost: number, allowDebt: boolean): boolean;
}

export const BUILDING_STAGE_SECONDS = 60;

export class BuildingLifecycle {
  private readonly states = new Map<string, { state: BuildingState; startedAt: number }>();
  private last: SavedBuildingState[] = [];

  constructor(saved: readonly SavedBuildingState[] = []) {
    this.replaceWith(saved);
  }

  sync(parcels: readonly BuildingParcel[], population: number, now: number, funding?: BuildingFunding): BuildingStatus[] {
    const staffing = new Map(allocateWorkforce(parcels, population).parcels.map((parcel) => [parcel.index, parcel.staffed]));
    const live = new Map<string, { state: BuildingState; startedAt: number }>();
    const statuses = parcels.map((parcel, index) => {
      const key = parcelKey(parcel);
      const previous = this.states.get(key);
      if (!previous || previous.state === "waiting") {
        const state: BuildingState = funding?.spend(parcel, buildingBuildCost(parcel), false) === false ? "waiting" : "rising";
        const startedAt = state === previous?.state ? previous.startedAt : now;
        live.set(key, { state, startedAt });
        return { parcel, state, reason: state === "waiting" ? "funds" as const : "construction" as const };
      }
      const underWork = (previous.state === "rising" || previous.state === "rebuilding") && now - previous.startedAt < BUILDING_STAGE_SECONDS;
      const state = underWork ? previous.state : staffing.get(index) === false ? "idle" : "working";
      const startedAt = state === previous.state ? previous.startedAt : now;
      live.set(key, { state, startedAt });
      return { parcel, state, ...(state === "rising" || state === "rebuilding" ? { reason: "construction" as const } : state === "idle" ? { reason: "workers" as const } : {}) };
    });
    this.states.clear();
    for (const [key, state] of live) this.states.set(key, state);
    this.last = statuses.map(({ parcel, state }) => [round(parcel.position.x), round(parcel.position.z), state, this.states.get(parcelKey(parcel))!.startedAt]);
    return statuses;
  }

  rebuild(parcel: BuildingParcel, now: number, funding: BuildingFunding): boolean {
    if (!funding.spend(parcel, buildingBuildCost(parcel), true)) return false;
    this.states.set(parcelKey(parcel), { state: "rebuilding", startedAt: now });
    return true;
  }

  stateOf(parcel: Pick<BuildingParcel, "position">): BuildingState | undefined {
    return this.states.get(parcelKey(parcel))?.state;
  }

  replaceWith(saved: readonly SavedBuildingState[]): void {
    this.states.clear();
    this.last = [...saved];
    for (const [x, z, state, startedAt] of saved) this.states.set(key(x, z), { state, startedAt });
  }

  toJSON(): SavedBuildingState[] {
    return [...this.last].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }
}

function parcelKey(parcel: Pick<BuildingParcel, "position">): string {
  return key(parcel.position.x, parcel.position.z);
}

function key(x: number, z: number): string {
  return `${round(x)}:${round(z)}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
