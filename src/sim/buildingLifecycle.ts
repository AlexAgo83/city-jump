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
/**
 * How far the population has to move before the shifts are dealt again: a twelfth of the city, or
 * twelve residents in a small one, whichever is larger. Under that the last deal stands.
 */
const WORKFORCE_BAND = 1 / 12;
const WORKFORCE_BAND_FLOOR = 12;

export class BuildingLifecycle {
  private states = new Map<string, { state: BuildingState; startedAt: number; seenAt: number; staffed: boolean }>();
  /**
   * The population the shifts were last dealt on.
   *
   * A lot is staffed whole or not at all, so the one sitting where the workforce runs out flips
   * every time the population moves by a resident -- and a city that is short of food moves by a
   * resident constantly. Preferring the incumbent is not enough on its own: when the pool itself
   * shrinks, the incumbent has to go, and it comes back a tick later.
   *
   * So the shifts are dealt on a population that only moves when the change is real. Below the
   * band, the deal from a moment ago still stands and nobody is hired or laid off.
   */
  private committed = 0;
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
    // Whoever had the shift keeps it: see `allocateWorkforce`. And it is dealt on a population that
    // moves in steps rather than by the resident: see `committed`.
    if (Math.abs(population - this.committed) > Math.max(WORKFORCE_BAND_FLOOR, this.committed * WORKFORCE_BAND)) this.committed = population;
    const workforceParcels = parcels
      .map((parcel, index) => ({ parcel, index }))
      .filter(({ parcel }) => this.states.get(parcelKey(parcel))?.state !== "rebuilding");
    const staffing = new Map(
      allocateWorkforce(
        workforceParcels.map(({ parcel }) => parcel),
        this.committed,
        (parcel) => this.states.get(parcelKey(parcel))?.staffed === true,
      ).parcels.map((parcel) => [workforceParcels[parcel.index]!.index, parcel.staffed]),
    );
    const live = new Map<string, { state: BuildingState; startedAt: number; seenAt: number; staffed: boolean }>();
    const statuses = parcels.map((parcel, index) => {
      const key = parcelKey(parcel);
      const previous = this.states.get(key);
      if (!previous) {
        const state = stageSeconds <= 0 ? (staffing.get(index) === false ? "idle" : "working") : "rising";
        const startedAt = now;
        live.set(key, { state, startedAt, seenAt: now, staffed: staffing.get(index) !== false });
        return status(parcel, state, staffing.get(index) !== false, startedAt, now, stageSeconds, state === "rising" ? "construction" : state === "idle" ? "workers" : undefined, true);
      }
      const held = previous.state === "rebuilding" && rebuildPaused;
      const underWork = held || ((previous.state === "rising" || previous.state === "rebuilding") && now - previous.startedAt < stageSeconds);
      const state = underWork ? previous.state : staffing.get(index) === false ? "idle" : "working";
      const isStaffed = state === "rebuilding" ? false : staffing.get(index) !== false;
      // A held rebuild keeps restarting its stage, so the work begins when the wave lifts.
      const startedAt = held ? now : state === previous.state ? previous.startedAt : now;
      live.set(key, { state, startedAt, seenAt: now, staffed: isStaffed });
      return status(parcel, state, isStaffed, startedAt, now, stageSeconds, state === "rising" || state === "rebuilding" ? "construction" : state === "idle" ? "workers" : undefined);
    });
    // The lots that were not in this tick's list keep their state for a while rather than being
    // dropped: see MEMORY_SECONDS.
    for (const [key, entry] of this.states) if (!live.has(key) && now - entry.seenAt < MEMORY_SECONDS) live.set(key, entry);
    this.states = live;
    this.last = statuses.map(({ parcel, state }) => [round(parcel.position.x), round(parcel.position.z), state, this.states.get(parcelKey(parcel))!.startedAt]);
    return statuses;
  }

  rebuild(parcel: BuildingParcel, now: number): boolean {
    this.states.set(parcelKey(parcel), { state: "rebuilding", startedAt: now, seenAt: now, staffed: this.states.get(parcelKey(parcel))?.staffed === true });
    return true;
  }

  stateOf(parcel: Pick<BuildingParcel, "position">): BuildingState | undefined {
    return this.states.get(parcelKey(parcel))?.state;
  }

  /**
   * Moves the states a save carried onto the lots the city actually came back with.
   *
   * A lot is keyed by where it stands, to the centimetre, and a replayed city does not cut itself
   * into quite the same lots -- junction trims come out a hair different and the lots slide about
   * a metre. Every lot that moved was an unknown parcel, so it started a fresh construction stage:
   * measured on a city of 38 lots, 35 working before a reload and 7 after, the rest back under
   * scaffolding, housing nobody and feeding nobody for a full stage. Which is a city that dips
   * every time it is opened.
   *
   * Returns how many states were carried across.
   */
  snapTo(parcels: readonly Pick<BuildingParcel, "position">[], tolerance = 3): number {
    const buckets = new Map<string, string[]>();
    for (const id of this.states.keys()) {
      const [x, z] = id.split(":").map(Number);
      const bucket = `${Math.floor(x! / tolerance)}:${Math.floor(z! / tolerance)}`;
      const list = buckets.get(bucket);
      if (list) list.push(id);
      else buckets.set(bucket, [id]);
    }
    let moved = 0;
    for (const parcel of parcels) {
      const wanted = parcelKey(parcel);
      if (this.states.has(wanted)) continue;
      let best: string | null = null;
      let bestDistance = tolerance;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          for (const id of buckets.get(`${Math.floor(parcel.position.x / tolerance) + ox}:${Math.floor(parcel.position.z / tolerance) + oz}`) ?? []) {
            const [x, z] = id.split(":").map(Number);
            const distance = Math.hypot(x! - parcel.position.x, z! - parcel.position.z);
            if (distance > bestDistance) continue;
            bestDistance = distance;
            best = id;
          }
        }
      }
      const carried = best === null ? undefined : this.states.get(best);
      if (!carried) continue;
      this.states.delete(best!);
      this.states.set(wanted, carried);
      moved += 1;
    }
    return moved;
  }

  /** Whether the workforce reached this lot on the last pass -- what the guns and the panel read. */
  staffedOf(parcel: Pick<BuildingParcel, "position">): boolean {
    return this.states.get(parcelKey(parcel))?.staffed === true;
  }

  replaceWith(saved: readonly SavedBuildingState[]): void {
    this.states.clear();
    this.committed = 0;
    this.last = saved.map(([x, z, state, startedAt]) => [x, z, normalizeState(state), startedAt]);
    for (const [x, z, state, startedAt] of this.last) this.states.set(key(x, z), { state, startedAt, seenAt: startedAt, staffed: state === "working" });
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
