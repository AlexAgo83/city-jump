import type { BuildingParcel } from "./slots";
import { allocateWorkforce } from "./workforce";

export type BuildingState = "rising" | "working" | "idle" | "rebuilding";
type LegacyBuildingState = BuildingState | "waiting";
export type SavedBuildingState = [x: number, z: number, state: LegacyBuildingState, startedAt: number];
type StoredBuildingState = [x: number, z: number, state: BuildingState, startedAt: number];

export interface BuildingStatus {
  readonly parcel: BuildingParcel;
  readonly state: BuildingState;
  readonly reason?: "construction" | "workers" | "power" | "water";
  readonly startedAt: number;
  readonly progress: number;
  readonly remainingSeconds: number;
  readonly started?: boolean;
}

export const BUILDING_STAGE_SECONDS = 24;

export class BuildingLifecycle {
  private readonly states = new Map<string, { state: BuildingState; startedAt: number }>();
  private last: StoredBuildingState[] = [];

  constructor(saved: readonly SavedBuildingState[] = []) {
    this.replaceWith(saved);
  }

  /**
   * @param rebuildPaused While a wave is on the island, nothing is rebuilt: a lot the kaiju
   * flattened stays flattened, and its stage only starts once the attack is over. The clock is
   * held rather than merely checked, so a long wave cannot let a rebuild slip through.
   */
  sync(parcels: readonly BuildingParcel[], population: number, now: number, stageSeconds = BUILDING_STAGE_SECONDS, rebuildPaused = false): BuildingStatus[] {
    const staffing = new Map(allocateWorkforce(parcels, population).parcels.map((parcel) => [parcel.index, parcel.staffed]));
    const live = new Map<string, { state: BuildingState; startedAt: number }>();
    const statuses = parcels.map((parcel, index) => {
      const key = parcelKey(parcel);
      const previous = this.states.get(key);
      if (!previous) {
        const state = stageSeconds <= 0 ? (staffing.get(index) === false ? "idle" : "working") : "rising";
        const startedAt = now;
        live.set(key, { state, startedAt });
        return status(parcel, state, startedAt, now, stageSeconds, state === "rising" ? "construction" : state === "idle" ? "workers" : undefined, true);
      }
      const held = previous.state === "rebuilding" && rebuildPaused;
      const underWork = held || ((previous.state === "rising" || previous.state === "rebuilding") && now - previous.startedAt < stageSeconds);
      const state = underWork ? previous.state : staffing.get(index) === false ? "idle" : "working";
      // A held rebuild keeps restarting its stage, so the work begins when the wave lifts.
      const startedAt = held ? now : state === previous.state ? previous.startedAt : now;
      live.set(key, { state, startedAt });
      return status(parcel, state, startedAt, now, stageSeconds, state === "rising" || state === "rebuilding" ? "construction" : state === "idle" ? "workers" : undefined);
    });
    this.states.clear();
    for (const [key, state] of live) this.states.set(key, state);
    this.last = statuses.map(({ parcel, state }) => [round(parcel.position.x), round(parcel.position.z), state, this.states.get(parcelKey(parcel))!.startedAt]);
    return statuses;
  }

  rebuild(parcel: BuildingParcel, now: number): boolean {
    this.states.set(parcelKey(parcel), { state: "rebuilding", startedAt: now });
    return true;
  }

  stateOf(parcel: Pick<BuildingParcel, "position">): BuildingState | undefined {
    return this.states.get(parcelKey(parcel))?.state;
  }

  replaceWith(saved: readonly SavedBuildingState[]): void {
    this.states.clear();
    this.last = saved.map(([x, z, state, startedAt]) => [x, z, normalizeState(state), startedAt]);
    for (const [x, z, state, startedAt] of this.last) this.states.set(key(x, z), { state, startedAt });
  }

  toJSON(): SavedBuildingState[] {
    return [...this.last].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }
}

function status(parcel: BuildingParcel, state: BuildingState, startedAt: number, now: number, stageSeconds: number, reason?: BuildingStatus["reason"], started?: boolean): BuildingStatus {
  const underWork = state === "rising" || state === "rebuilding";
  const elapsed = underWork ? Math.max(0, now - startedAt) : BUILDING_STAGE_SECONDS;
  const progress = stageSeconds <= 0 ? 1 : Math.min(1, elapsed / stageSeconds);
  const remainingSeconds = underWork ? Math.max(0, stageSeconds - elapsed) : 0;
  return { parcel, state, startedAt, progress, remainingSeconds, ...(reason ? { reason } : {}), ...(started ? { started } : {}) };
}

function normalizeState(state: LegacyBuildingState): BuildingState {
  return state === "waiting" ? "rising" : state;
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
