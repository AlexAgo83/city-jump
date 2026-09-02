import type { BuildingParcel } from "./slots";
import { allocateWorkforce } from "./workforce";

export type BuildingState = "rising" | "working" | "idle" | "rebuilding";
type LegacyBuildingState = BuildingState | "waiting";
export type SavedBuildingState = [x: number, z: number, state: LegacyBuildingState, startedAt: number];
type StoredBuildingState = [x: number, z: number, state: BuildingState, startedAt: number];

export interface BuildingStatus {
  readonly parcel: BuildingParcel;
  readonly state: BuildingState;
  /**
   * Whether the workforce reached this lot. A lot is staffed whole or not at all, and a lot that
   * is still going up holds its share of the pool all the same -- the shift is hired before the
   * doors open.
   */
  readonly staffed: boolean;
  readonly reason?: "construction" | "workers" | "power" | "water" | "materials";
  readonly startedAt: number;
  readonly progress: number;
  readonly remainingSeconds: number;
  readonly started?: boolean;
}

export const BUILDING_STAGE_SECONDS = 24;
/**
 * How long a lot that is no longer standing keeps its state.
 *
 * The demand cap is a lot per so many residents, so it crosses an integer whenever the population
 * wobbles and the marginal lot leaves the list for a tick. Forgetting it there made it come back
 * as a brand new parcel -- a fresh construction stage, restarted before it could ever finish,
 * which is what read on screen as buildings flickering between "Under construction" and
 * "No workers". Long enough to outlast that wobble, short enough that a lot the player actually
 * bulldozed and re-zoned builds itself again.
 */
const MEMORY_SECONDS = 120;

export class BuildingLifecycle {
  private states = new Map<string, { state: BuildingState; startedAt: number; seenAt: number }>();
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
    const live = new Map<string, { state: BuildingState; startedAt: number; seenAt: number }>();
    const statuses = parcels.map((parcel, index) => {
      const key = parcelKey(parcel);
      const previous = this.states.get(key);
      if (!previous) {
        const state = stageSeconds <= 0 ? (staffing.get(index) === false ? "idle" : "working") : "rising";
        const startedAt = now;
        live.set(key, { state, startedAt, seenAt: now });
        return status(parcel, state, staffing.get(index) !== false, startedAt, now, stageSeconds, state === "rising" ? "construction" : state === "idle" ? "workers" : undefined, true);
      }
      const held = previous.state === "rebuilding" && rebuildPaused;
      const underWork = held || ((previous.state === "rising" || previous.state === "rebuilding") && now - previous.startedAt < stageSeconds);
      const state = underWork ? previous.state : staffing.get(index) === false ? "idle" : "working";
      // A held rebuild keeps restarting its stage, so the work begins when the wave lifts.
      const startedAt = held ? now : state === previous.state ? previous.startedAt : now;
      live.set(key, { state, startedAt, seenAt: now });
      return status(parcel, state, staffing.get(index) !== false, startedAt, now, stageSeconds, state === "rising" || state === "rebuilding" ? "construction" : state === "idle" ? "workers" : undefined);
    });
    // The lots that were not in this tick's list keep their state for a while rather than being
    // dropped: see MEMORY_SECONDS.
    for (const [key, entry] of this.states) if (!live.has(key) && now - entry.seenAt < MEMORY_SECONDS) live.set(key, entry);
    this.states = live;
    this.last = statuses.map(({ parcel, state }) => [round(parcel.position.x), round(parcel.position.z), state, this.states.get(parcelKey(parcel))!.startedAt]);
    return statuses;
  }

  rebuild(parcel: BuildingParcel, now: number): boolean {
    this.states.set(parcelKey(parcel), { state: "rebuilding", startedAt: now, seenAt: now });
    return true;
  }

  stateOf(parcel: Pick<BuildingParcel, "position">): BuildingState | undefined {
    return this.states.get(parcelKey(parcel))?.state;
  }

  replaceWith(saved: readonly SavedBuildingState[]): void {
    this.states.clear();
    this.last = saved.map(([x, z, state, startedAt]) => [x, z, normalizeState(state), startedAt]);
    for (const [x, z, state, startedAt] of this.last) this.states.set(key(x, z), { state, startedAt, seenAt: startedAt });
  }

  toJSON(): SavedBuildingState[] {
    return [...this.last].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }
}

function status(parcel: BuildingParcel, state: BuildingState, staffed: boolean, startedAt: number, now: number, stageSeconds: number, reason?: BuildingStatus["reason"], started?: boolean): BuildingStatus {
  const underWork = state === "rising" || state === "rebuilding";
  const elapsed = underWork ? Math.max(0, now - startedAt) : BUILDING_STAGE_SECONDS;
  const progress = stageSeconds <= 0 ? 1 : Math.min(1, elapsed / stageSeconds);
  const remainingSeconds = underWork ? Math.max(0, stageSeconds - elapsed) : 0;
  return { parcel, state, staffed, startedAt, progress, remainingSeconds, ...(reason ? { reason } : {}), ...(started ? { started } : {}) };
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
