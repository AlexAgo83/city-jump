import { batteriesForParcels, batteriesInRange, firepowerPerMinute } from "./batteries";
import { buildingNeeds, type BuildingNeed, type BuildingKind } from "./buildingKinds";
import { BUILDING_STAGE_SECONDS, BuildingLifecycle, type BuildingStatus } from "./buildingLifecycle";
import { buildingBuildCost, CityEconomy, incomePerSecond, Treasury } from "./economy";
import { RoadGraph } from "./graph";
import { Rubble } from "./rubble";
import { commitSegment, resolveSnap } from "./rules";
import { createRun, DEFAULT_RUN_RULES, defeat, endIfPopulationZero, settleWave, type RunRules, type RunState } from "./run";
import { buildableCells, buildingParcels, parcelsForDemand, type BuildingParcel } from "./slots";
import { setTerrain, flatTerrain } from "./terrain";
import { distXZ, v3 } from "./vec";
import { missingUtility, suppliedDiffusers, Utilities } from "./utilities";
import { advanceWaveClockWithThreat, createWaveClock, damageWaveClock, scheduleNextWave, waveThreat, WAVE_STARTING_VALUES, type WaveClock } from "./wave";
import { Zones } from "./zones";
import { advanceKaijuAssault, createKaijuAssault } from "./kaiju";

export type FirstWaveShape = "total_loss" | "partial_loss" | "clean_hold";

/** One wave, as it happened: what arrived, what the city answered with, and what it cost. */
export interface WaveRecord {
  readonly wave: number;
  /** Seconds of city-building between the previous wave ending and this one arriving. */
  readonly waitedSeconds: number;
  readonly threat: number;
  readonly population: number;
  readonly parcels: number;
  /** Lots standing when the wave landed, by business. */
  readonly byKind: Readonly<Record<BuildingKind, number>>;
  /** Metres of road drawn, by road type. */
  readonly roadMetres: Readonly<Record<string, number>>;
  readonly fieldedBatteries: number;
  readonly firepowerPerMinute: number;
  readonly combatDurationSeconds: number;
  readonly salvos: number;
  readonly held: boolean;
  readonly destroyed: number;
  readonly rebuildingCost: number;
  readonly treasury: number;
  readonly science: number;
  readonly shape: FirstWaveShape;
}

export interface RunPlaythrough {
  readonly seed: number;
  readonly seconds: number;
  readonly graph: RoadGraph;
  readonly zones: Zones;
  readonly parcels: readonly BuildingParcel[];
  readonly statuses: readonly BuildingStatus[];
  readonly needs: readonly BuildingNeed[];
  readonly run: RunState;
  readonly waveClock: WaveClock;
  readonly treasury: Treasury;
  readonly economy: CityEconomy;
  readonly waves: readonly WaveRecord[];
  readonly log: readonly string[];
}

/** Kept for callers that only care about the opening wave; it is `playRun` stopped after one. */
export interface PlaythroughResult extends RunPlaythrough {
  readonly wave: WaveRecord & { readonly nextWaveReachable: boolean };
}

export interface ScenarioRules extends RunRules {
  /** Place power and water the way a player would, and let buildings go idle without them. */
  readonly utilities: boolean;
  /** Keep drawing roads outward while there is money and a shortage to answer. */
  readonly expand: boolean;
}

export const DEFAULT_SCENARIO_RULES: ScenarioRules = { ...DEFAULT_RUN_RULES, utilities: true, expand: true };

const GROW_STEP_SECONDS = 4;
const GROW_STEPS_PER_WAVE = 120;
const COMBAT_STEP_SECONDS = 0.25;
const COMBAT_CAP_SECONDS = 90;
/** Salvos a defence should need to kill a wave -- the top of the readable band. */
const SALVO_TARGET = 8;

/**
 * Plays a run: arrive, road, zone, grow, meet a kaiju, rebuild, meet the next one, until the run
 * ends or `maxWaves` have been fought.
 *
 * It drives the same rules the app drives, from the same entry points -- roads through
 * `commitSegment`, parcels through `parcelsForDemand`, damage through `damageWaveClock` -- and it
 * mirrors the two app rules the single-wave version skipped: a destroyed parcel stays in play while
 * it rebuilds, and a building without the utility it needs is idle.
 */
export function playRun(seed = 1, rules: Partial<ScenarioRules> = {}, maxWaves = 1): RunPlaythrough {
  setTerrain(flatTerrain);
  const graph = new RoadGraph();
  const zones = new Zones();
  const lifecycle = new BuildingLifecycle();
  const rubble = new Rubble();
  const utilities = new Utilities();
  const treasury = new Treasury();
  const economy = new CityEconomy();
  const scenario = { ...DEFAULT_SCENARIO_RULES, ...rules };
  let run = createRun(scenario);
  let waveClock = createWaveClock();
  let seconds = 0;
  let statuses: BuildingStatus[] = [];
  let parcels: BuildingParcel[] = [];
  const waves: WaveRecord[] = [];
  const log: string[] = [];

  const road = (name: string, x0: number, z0: number, x1: number, z1: number, type = "street") => {
    const result = commitSegment(graph, resolveSnap(graph, x0, z0), resolveSnap(graph, x1, z1), v3((x0 + x1) / 2, 0, (z0 + z1) / 2), type);
    if (!result.ok) throw new Error(`${name}: ${result.reason}`);
    log.push(`road:${name}`);
  };
  const paint = (kind: BuildingKind, x: number, z: number, radius = 40) => {
    zones.paint(x, z, radius, kind);
    log.push(`zone:${kind}`);
  };
  /**
   * A player who has money and room keeps drawing. Each expansion is one street further out plus a
   * zone on it, so the city grows in network as well as in density -- which is what decides how
   * much can be built between two waves.
   */
  let expansions = 0;
  const expand = (kind: BuildingKind): boolean => {
    if (expansions >= 8) return false;
    const z = 410 + expansions * 50;
    const spine = commitSegment(graph, resolveSnap(graph, -200, z - 50), resolveSnap(graph, -200, z), v3(-200, 0, z - 25), "street");
    const street = commitSegment(graph, resolveSnap(graph, -220, z), resolveSnap(graph, 80, z), v3(-70, 0, z), kind === "military" ? "military" : "street");
    if (!spine.ok || !street.ok) return false;
    zones.paint(-70, z, 70, kind);
    expansions += 1;
    log.push(`expand:${kind}@z=${z}`);
    return true;
  };
  const needZones: Record<BuildingKind, readonly [x: number, z: number]> = {
    residential: [-170, 300],
    agricultural: [-70, 220],
    commercial: [20, 300],
    industrial: [20, 260],
    military: [-70, 360],
  };

  /** The app's `syncBuildings`, minus the renderer: demand, lifecycle, utilities, rubble, bills. */
  const sync = (charge: boolean): void => {
    parcels = parcelsForDemand(buildingParcels(buildableCells(graph, zones), zones), economy.resources.population, seconds)
      .filter((parcel) => !rubble.blocks(parcel) || lifecycle.stateOf(parcel) === "rebuilding");
    const supplied = scenario.utilities ? suppliedDiffusers(graph, utilities.producers(), utilities.diffusers()) : null;
    const diffusers = utilities.diffusers();
    statuses = lifecycle.sync(parcels, economy.resources.population, seconds, scenario.instantConstruction ? 0 : BUILDING_STAGE_SECONDS).map((status) => {
      if (!supplied || status.state === "rising" || status.state === "rebuilding") return status;
      const missing = missingUtility(status.parcel.kind, status.parcel.position, supplied, diffusers);
      return missing ? { ...status, state: "idle" as const, reason: missing } : status;
    });
    if (charge && !scenario.freeBuilding) for (const status of statuses) if (status.started) treasury.spend(buildingBuildCost(status.parcel), true);
    // A finished rebuild clears its rubble, the way the app does, so the lot is buildable again.
    for (const status of statuses) if (status.state !== "rebuilding" && rubble.blocks(status.parcel)) rubble.clear(status.parcel);
  };

  const step = (dt: number): void => {
    seconds += dt;
    sync(true);
    economy.advance(statuses.filter((status) => status.state === "working").map((status) => status.parcel), dt);
    treasury.earn(incomePerSecond(economy.resources.population, statuses) * dt);
    if (scenario.kaijuSpawns && !waveClock.active) {
      waveClock = advanceWaveClockWithThreat(waveClock, dt, waveThreat(run.wave, economy.resources.population, parcels.length));
    }
  };

  road("bridge", -260, 260, 40, 260);
  road("farms", -220 + seed, 220, 80 + seed, 220, "dirt");
  road("shops", -220, 310 + seed, 80, 310 + seed);
  road("battery", -220, 360 + seed, 80, 360 + seed, "military");
  // A spine crossing all four, so the city is one network: without it the utility producers cannot
  // reach the diffusers and every lot sits idle -- which is a badly drawn city, not a broken game.
  road("spine", -200, 200, -200, 380);
  paint("residential", -170, 300);
  paint("agricultural", -70, 220);
  paint("commercial", 20, 300);
  paint("military", -70, 360);
  if (scenario.utilities) {
    for (const kind of ["power", "water"] as const) {
      utilities.place(graph, "producer", kind, -250, 260);
      for (const [x, z] of [[-170, 300], [-70, 220], [20, 300], [-70, 360]] as const) utilities.place(graph, "diffuser", kind, x, z);
    }
    log.push(`utilities:${utilities.producers().length}p/${utilities.diffusers().length}d`);
  }

  const followedNeeds = new Set<BuildingKind>();
  for (let wave = 1; wave <= maxWaves && !run.ended; wave++) {
    if (!grow()) break;
    waves.push(fight(wave));
  }

  return snapshot();

  /** Builds until the wave lands. False when none is coming -- pacifist, or the budget ran out. */
  function grow(): boolean {
    const opened = seconds;
    let previous = buildingNeeds(parcels, economy.resources.population);
    for (let i = 0; i < GROW_STEPS_PER_WAVE && !waveClock.active; i++) {
      step(GROW_STEP_SECONDS);
      const needs = buildingNeeds(parcels, economy.resources.population);
      const short = needs.find((need) => need.need > need.supply);
      if (short && short.ratio < (previous.find((need) => need.kind === short.kind)?.ratio ?? 1)) {
        if (!followedNeeds.has(short.kind)) {
          followedNeeds.add(short.kind);
          const [x, z] = needZones[short.kind];
          paint(short.kind, x, z, 60);
          log.push(`need:${short.kind}->zone:${short.kind} supply=${short.supply} need=${short.need}`);
        } else if (scenario.expand && treasury.money > 5_000 && expand(short.kind)) {
          log.push(`need:${short.kind}->expand supply=${short.supply} need=${short.need}`);
        }
      }
      // The needs panel never asks for defence -- its military row compares staffed lots against
      // staffed-plus-idle, so a fully staffed district reads as satisfied however small it is. A
      // player reads the banner instead: threat against firepower. This does the same.
      if (scenario.expand && treasury.money > 5_000) {
        const projected = waveThreat(run.wave, economy.resources.population, parcels.length);
        const salvoDamage = batteriesForParcels(parcels, economy.resources.population).reduce((sum, battery) => sum + battery.damage, 0);
        if (salvoDamage * SALVO_TARGET < projected && expand("military")) log.push(`threat:${projected}>firepower:${salvoDamage * SALVO_TARGET}->expand:military`);
      }
      previous = needs;
    }
    if (waveClock.active) log.push(`wait:${(seconds - opened).toFixed(1)}`);
    return Boolean(waveClock.active);
  }

  function fight(wave: number): WaveRecord {
    sync(false);
    const started = seconds;
    const waitedSeconds = started - (waves.at(-1)?.waitedSeconds ?? 0) - waves.reduce((sum, record) => sum + record.combatDurationSeconds, 0);
    const threat = waveClock.active!.threat;
    const population = economy.resources.population;
    const parcelsAtWave = parcels.length;
    const byKind = parcels.reduce((counts, parcel) => ({ ...counts, [parcel.kind]: (counts[parcel.kind] ?? 0) + 1 }), {} as Record<BuildingKind, number>);
    const roadMetres = graph.allSegments().reduce((metres, segment) => ({ ...metres, [segment.type]: Math.round((metres[segment.type] ?? 0) + segment.length) }), {} as Record<string, number>);
    const opening = batteriesForParcels(parcels, population);
    let assault = createKaijuAssault(v3(-260 + seed, 0, 260));
    let missiles: { readonly damage: number; readonly impactAt: number }[] = [];
    let nextSalvoAt = 0;
    let salvos = 0;
    let destroyed = 0;
    let rebuildingCost = 0;
    log.push(`defence:wave=${wave} population=${population.toFixed(1)} batteries=${opening.length} threat=${threat}`);

    while (waveClock.active && waveClock.active.hitPoints > 0 && seconds - started < COMBAT_CAP_SECONDS && parcels.length) {
      const live = statuses.filter((status) => status.state !== "rebuilding").map((status) => status.parcel.position);
      assault = advanceKaijuAssault(assault, live, COMBAT_STEP_SECONDS);
      const batteries = batteriesForParcels(parcels, economy.resources.population);
      if (seconds - started >= nextSalvoAt) {
        const firing = batteriesInRange(batteries, assault.position);
        salvos += firing.length ? 1 : 0;
        missiles.push(...firing.map((shot) => ({
          damage: shot.damage,
          impactAt: seconds + WAVE_STARTING_VALUES.missileTravelSecondsAtRange * Math.min(1, distXZ(shot.position, assault.position) / shot.range),
        })));
        nextSalvoAt += WAVE_STARTING_VALUES.reloadSeconds;
      }
      const hits = missiles.filter((missile) => missile.impactAt <= seconds);
      if (hits.length) waveClock = damageWaveClock(waveClock, hits.reduce((sum, missile) => sum + missile.damage, 0));
      missiles = missiles.filter((missile) => missile.impactAt > seconds);
      const hit = assault.destroyed ? parcels.find((parcel) => distXZ(parcel.position, assault.destroyed!) < 0.01) : null;
      if (hit) {
        destroyed += 1;
        rebuildingCost += buildingBuildCost(hit);
        rubble.destroy(hit);
        treasury.spend(buildingBuildCost(hit), true);
        lifecycle.rebuild(hit, seconds);
        parcels = parcels.filter((parcel) => parcel !== hit);
        statuses = statuses.filter((status) => status.parcel !== hit);
      }
      seconds += COMBAT_STEP_SECONDS;
    }

    const held = (waveClock.active?.hitPoints ?? 0) <= 0;
    log.push(`wave:${held ? "held" : "breached"}`, `combat:${seconds - started}`, `salvos:${salvos}`);
    run = held
      ? settleWave(run, { defeated: true, calledEarly: false, baseScience: 10 * run.wave })
      : endIfPopulationZero(defeat(settleWave(run, { defeated: false, calledEarly: false, baseScience: 10 * run.wave })), economy.resources.population);
    if (!run.ended) waveClock = scheduleNextWave(waveClock);
    return {
      wave,
      waitedSeconds,
      threat,
      population,
      parcels: parcelsAtWave,
      byKind,
      roadMetres,
      fieldedBatteries: opening.length,
      firepowerPerMinute: firepowerPerMinute(opening),
      combatDurationSeconds: seconds - started,
      salvos,
      held,
      destroyed,
      rebuildingCost,
      treasury: treasury.money,
      science: run.science,
      shape: held ? (destroyed ? "partial_loss" : "clean_hold") : parcels.length ? "partial_loss" : "total_loss",
    };
  }

  function snapshot(): RunPlaythrough {
    return {
      seed,
      seconds,
      graph,
      zones,
      parcels,
      statuses,
      needs: buildingNeeds(parcels, economy.resources.population),
      run,
      waveClock,
      treasury,
      economy,
      waves,
      log,
    };
  }
}

export function playFirstRun(seed = 1, rules: Partial<ScenarioRules> = {}): PlaythroughResult {
  const played = playRun(seed, rules, 1);
  const first: WaveRecord = played.waves[0] ?? {
    wave: 1, waitedSeconds: played.seconds, threat: 0, population: played.economy.resources.population,
    parcels: played.parcels.length, byKind: {} as Record<BuildingKind, number>, roadMetres: {}, fieldedBatteries: 0, firepowerPerMinute: 0, combatDurationSeconds: 0,
    salvos: 0, held: false, destroyed: 0, rebuildingCost: 0, treasury: played.treasury.money,
    science: played.run.science, shape: "clean_hold",
  };
  return { ...played, wave: { ...first, nextWaveReachable: !played.run.ended } };
}

export function militaryGap(seed = 1): number {
  return playFirstRun(seed, { instantConstruction: true }).wave.combatDurationSeconds - 30;
}
