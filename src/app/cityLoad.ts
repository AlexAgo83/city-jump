/**
 * Putting a saved city back on screen, as a sequence rather than as a closure.
 *
 * The order here is the load: terrain before the replay, because node elevations were recorded
 * against a pristine heightmap; both snapTo passes before anything is drawn; the clock slot after
 * the hour is set. Held inside `startApp` this order was guaranteed by four comments and nothing
 * else, and the whole procedure sat in the largest untested module in the repository.
 *
 * The hooks are wide on purpose: every step the load actually takes is one of them, so a test can
 * assert the sequence, not only the arithmetic. The city's own state is passed in whole and worked
 * on directly; what stays behind in `app/app.ts` as a hook is everything that reaches the scene,
 * the HUD, the heightmap or a closure variable. This module replays and decides; it does not draw.
 */
import type { BuildingLifecycle } from "../sim/buildingLifecycle";
import type { CityEconomy, Treasury } from "../sim/economy";
import type { RoadGraph } from "../sim/graph";
import type { Plantings } from "../sim/plantings";
import { createRun, type RunState } from "../sim/run";
import type { Rubble } from "../sim/rubble";
import { restoreCity, type CitySave, type SavedCamera } from "../sim/save";
import type { BuildableCell } from "../sim/slots";
import type { Utilities } from "../sim/utilities";
import { createWaveClock, type WaveClock } from "../sim/wave";
import type { Zones } from "../sim/zones";
import { admittedParcels } from "./cityRebuild";

/** What the caller has to install once a load has succeeded. */
export interface ResumedCity {
  readonly run: RunState;
  readonly waveClock: WaveClock;
  readonly elapsed: number;
  readonly day: number;
}

/** The city itself: what a load replays into, and what it re-lays the zoning and buildings onto. */
export interface CityState {
  readonly graph: RoadGraph;
  readonly plantings: Plantings;
  readonly zones: Zones;
  readonly rubble: Rubble;
  readonly buildingLifecycle: BuildingLifecycle;
  readonly treasury: Treasury;
  readonly cityEconomy: CityEconomy;
  readonly utilities: Utilities;
  /** The lots the replayed roads actually cut, solved afresh because the replay changes them. */
  buildableCells(): readonly BuildableCell[];
}

export interface CityLoadHooks {
  /** A tool mid-placement has nothing to place onto once the city changes underneath it. */
  cancelTool(): void;
  applyTerrain(preset: "rugged" | "rolling"): void;
  onRefused(message: string): void;
  clearHistory(): void;
  resetWave(): void;
  /** Installs the resumed run, clock and day, at the point the load reached them. */
  resume(resumed: ResumedCity): void;
  updateRunHud(): void;
  renderRunPanel(): void;
  onAlert(message: string): void;
  setClockHour(hour: number): void;
  /** Records which quarter-hour the resumed city is autosaved against. */
  noteClockSlot(): void;
  addOffshoreBridge(): void;
  /** Rebuilds every derived view without charging for the construction it finds standing. */
  rebuildWithoutCharging(): void;
  applyCamera(camera: SavedCamera): void;
  updateUndoRedo(): void;
}

/**
 * Anything but `rugged` is the rolling island. A save carries whatever string it was written with,
 * including one from a build that offered a preset this one does not.
 */
export function terrainFor(city: CitySave): "rugged" | "rolling" {
  return city.terrain === "rugged" ? "rugged" : "rolling";
}

/**
 * Never restore a wave in progress. Nothing about the kaiju is saved -- not where it stands, not
 * what it was walking towards, not the missiles in the air -- so reloading rebuilt the plan from a
 * fresh seed and dropped a new monster on the other side of the island with the old hit points. A
 * reload puts the city back to just before the wave; the city is still big enough to summon it, so
 * it comes again.
 */
export function resumedWaveClock(city: CitySave): WaveClock {
  return { ...(city.waveClock ?? createWaveClock()), active: null };
}

/** The state a save resumes into, with every pre-run field defaulted rather than refused. */
export function resumedCity(city: CitySave): ResumedCity {
  return {
    run: city.run ?? createRun(),
    waveClock: resumedWaveClock(city),
    elapsed: city.elapsed ?? 0,
    day: city.day ?? 1,
  };
}

/** What the player is told when the replay could not put everything back where it was. */
export function relaidNotice(relaid: number, carried: number): string | null {
  if (!relaid && !carried) return null;
  return `${relaid} zoned lots and ${carried} buildings were re-laid onto the city as it came back.`;
}

/**
 * Runs the load. Returns the state to install, or null when the replay refused the city -- in
 * which case nothing past the replay has run and the caller keeps whatever was on screen.
 */
export function loadCityInto(city: CitySave, state: CityState, hooks: CityLoadHooks): ResumedCity | null {
  hooks.cancelTool();
  try {
    // The terrain has to be pristine before the replay: node elevations were recorded against the
    // raw heightmap, and the rebuild conforms it to the roads afterwards.
    hooks.applyTerrain(terrainFor(city));
    restoreCity(state.graph, state.plantings, state.zones, city, state.rubble, state.buildingLifecycle, state.treasury, state.cityEconomy, state.utilities);
  } catch (error) {
    hooks.onRefused(`This city could not be loaded: ${(error as Error).message}`);
    return null;
  }
  hooks.clearHistory();
  hooks.resetWave();

  const resumed = resumedCity(city);
  hooks.resume(resumed);
  hooks.updateRunHud();
  hooks.renderRunPanel();

  // The replay does not cut the city into exactly the same lots, so both the zoning and the
  // buildings standing on it are moved onto the ones it did cut, before anything is drawn from
  // them. See `Zones.snapTo` and `BuildingLifecycle.snapTo`.
  const relaid = state.zones.snapTo(state.buildableCells());
  const carried = state.buildingLifecycle.snapTo(
    admittedParcels(state.buildableCells(), state.zones, city.resources?.population ?? 0, resumed.elapsed, (parcel) => state.buildingLifecycle.stateOf(parcel) !== undefined),
  );
  const notice = relaidNotice(relaid, carried);
  if (notice) hooks.onAlert(notice);

  hooks.setClockHour(city.hour);
  hooks.noteClockSlot();
  hooks.addOffshoreBridge();
  hooks.rebuildWithoutCharging();
  if (city.camera) hooks.applyCamera(city.camera);
  hooks.updateUndoRedo();
  return resumed;
}
