import { batteriesForParcels, batteriesInRange, firepowerPerMinute } from "./batteries";
import { buildingNeeds, type BuildingNeed, type BuildingKind } from "./buildingKinds";
import { BUILDING_STAGE_SECONDS, BuildingLifecycle, type BuildingStatus } from "./buildingLifecycle";
import { buildingBuildCost, CityEconomy, incomePerSecond, rebuildingCost as rebuildCharge, Treasury } from "./economy";
import { RoadGraph } from "./graph";
import { Rubble } from "./rubble";
import { commitSegment, resolveSnap, validateSegment } from "./rules";
import { createRun, DEFAULT_RUN_RULES, defeat, endIfPopulationZero, settleWave, type RunRules, type RunState } from "./run";
import { buildableCells, buildingParcels, lotsInRect, lotsWithin, parcelsForDemand, type BuildingParcel } from "./slots";
import { distXZ, v3 } from "./vec";
import { missingUtility, suppliedDiffusers, Utilities } from "./utilities";
import { advanceWaveClock, createWaveClock, damageWaveClock, missileTravelSeconds, scheduleNextWave, summonIfDue, waveThreat, WAVE_STARTING_VALUES, type WaveClock } from "./wave";
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
  /** Let a building without the utility it needs go idle -- the app always does. */
  readonly utilities: boolean;
  /** Whether the simulated player actually builds the power and water network. */
  readonly placeUtilities: boolean;
  /**
   * Keep drawing roads outward while there is money and a shortage to answer.
   *
   * Off by default so `npm run balance` and the unit tests measure one fixed city and stay a
   * regression gate. `npm run scenarios` turns it on: exploring how a player who keeps building
   * changes the run must not move the bar the gate is checked against.
   */
  readonly expand: boolean;
}

export const DEFAULT_SCENARIO_RULES: ScenarioRules = { ...DEFAULT_RUN_RULES, utilities: true, placeUtilities: true, expand: false };

const GROW_STEP_SECONDS = 4;
/** A city now grows at a rate rather than converting food into people, so it takes longer
 * to become worth attacking. This is the budget before the harness gives up waiting. */
const GROW_STEPS_PER_WAVE = 900;
const COMBAT_STEP_SECONDS = 0.25;
const COMBAT_CAP_SECONDS = 90;

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
  let lastWaveEnded = 0;
  const log: string[] = [];

  const road = (name: string, x0: number, z0: number, x1: number, z1: number, type = "street") => {
    const result = commitSegment(graph, resolveSnap(graph, x0, z0), resolveSnap(graph, x1, z1), v3((x0 + x1) / 2, 0, (z0 + z1) / 2), type);
    if (!result.ok) throw new Error(`${name}: ${result.reason}`);
    log.push(`road:${name}`);
  };
  const paint = (kind: BuildingKind, x: number, z: number, radius = 40) => {
    zones.paintLots(lotsWithin(buildableCells(graph), x, z, radius), kind);
    log.push(`zone:${kind}`);
  };
  /** A district laid along a road, the way a player draws one. */
  const band = (kind: BuildingKind, z: number, fromX: number, toX: number, depth = 40) => {
    zones.paintLots(lotsInRect(buildableCells(graph), fromX, z - depth, toX, z + depth), kind);
    log.push(`zone:${kind}`);
  };
  /**
   * A player who has money and room keeps drawing. Each expansion is one street further out plus a
   * zone on it, so the city grows in network as well as in density -- which is what decides how
   * much can be built between two waves.
   */
  let expansions = 0;
  const expand = (kind: BuildingKind): boolean => {
    if (expansions >= 16) return false;
    const z = 410 + expansions * 50;
    const spineFrom = resolveSnap(graph, -200, z - 50);
    const spineTo = resolveSnap(graph, -200, z);
    const spineControl = v3(-200, 0, z - 25);
    const streetFrom = resolveSnap(graph, -220, z);
    const streetTo = resolveSnap(graph, 80, z);
    const streetControl = v3(-70, 0, z);
    const streetType = kind === "military" ? "military" : "street";
    // The expansion is atomic from the harness' point of view: both roads must validate first.
    if (!validateSegment(spineFrom.position, spineControl, spineTo.position, "street").ok) return false;
    if (!validateSegment(streetFrom.position, streetControl, streetTo.position, streetType).ok) return false;
    const spine = commitSegment(graph, spineFrom, spineTo, spineControl, "street");
    const street = commitSegment(graph, streetFrom, streetTo, streetControl, streetType);
    if (!spine.ok || !street.ok) return false;
    zones.paintLots(lotsWithin(buildableCells(graph), -70, z, 70), kind);
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

  /**
   * The lot layout, solved again only when the roads or the zoning have moved.
   *
   * A run steps nine hundred times between two waves and again every quarter second of a fight,
   * and every one of those steps re-solved the whole city to get the same array back -- the same
   * ~65ms pass the app now caches behind its revision counters. The scenario does not reshape the
   * ground, so the graph and the zoning are the whole key here.
   */
  let packed: { key: string; parcels: BuildingParcel[] } | null = null;
  const layout = (): BuildingParcel[] => {
    const key = `${graph.revision}:${zones.revision}`;
    if (packed?.key !== key) packed = { key, parcels: buildingParcels(buildableCells(graph, zones), zones) };
    return packed.parcels;
  };

  /** The app's `syncBuildings`, minus the renderer: demand, lifecycle, utilities, rubble, bills. */
  const sync = (charge: boolean): void => {
    parcels = parcelsForDemand(layout(), economy.resources.population, seconds)
      .filter((parcel) => !rubble.blocks(parcel) || lifecycle.stateOf(parcel) === "rebuilding");
    const supplied = scenario.utilities ? suppliedDiffusers(graph, utilities.producers(), utilities.diffusers()) : null;
    const diffusers = utilities.diffusers();
    statuses = lifecycle.sync(parcels, economy.resources.population, seconds, scenario.instantConstruction ? 0 : BUILDING_STAGE_SECONDS, Boolean(waveClock.active)).map((status) => {
      if (!supplied || status.state === "rising" || status.state === "rebuilding") return status;
      const missing = missingUtility(status.parcel.kind, status.parcel.position, supplied, diffusers);
      const ignored = missing === "power" ? scenario.ignorePower : missing === "water" ? scenario.ignoreWater : false;
      return missing && !ignored ? { ...status, state: "idle" as const, reason: missing } : status;
    });
    if (charge && !scenario.freeBuilding) for (const status of statuses) if (status.started) treasury.spend(buildingBuildCost(status.parcel), true);
    // A finished rebuild clears its rubble, the way the app does, so the lot is buildable again.
    for (const status of statuses) if (status.state !== "rebuilding" && rubble.blocks(status.parcel)) rubble.clear(status.parcel);
  };

  const step = (dt: number): void => {
    seconds += dt;
    sync(true);
    economy.advance(statuses, dt);
    treasury.earn(incomePerSecond(economy.resources.population, statuses) * dt);
    if (scenario.kaijuSpawns && !waveClock.active) {
      waveClock = summonIfDue(advanceWaveClock(waveClock, dt), run.wave, economy.resources.population, waveThreat(run.wave, economy.resources.population, parcels.length));
    }
  };

  road("bridge", -260, 260, 40, 260);
  road("farms", -220 + seed, 220, 80 + seed, 220, "dirt");
  road("shops", -220, 310 + seed, 80, 310 + seed);
  road("battery", -220, 360 + seed, 80, 360 + seed, "military");
  // A spine crossing all four, so the city is one network: without it the utility producers cannot
  // reach the diffusers and every lot sits idle -- which is a badly drawn city, not a broken game.
  road("spine", -200, 200, -200, 380);
  // A block along each road. Nothing builds on unzoned land any more, so the scenario has to zone
  // what it wants the way a player would -- rectangles on the frontage, not circles beside it.
  band("agricultural", 220, -300, 160, 50);
  band("residential", 260, -320, 120, 50);
  band("commercial", 310 + seed, -300, 160, 50);
  paint("military", -70, 360 + seed, 45);
  if (scenario.placeUtilities) {
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
      const needs = buildingNeeds(parcels, economy.resources.population, waveThreat(run.wave, economy.resources.population, parcels.length));
      if (scenario.expand && run.wave > 1 && treasury.money > 5_000) {
        const defence = needs.find((entry) => entry.kind === "military");
        if (defence && defence.supply < defence.need && expand("military")) {
          log.push(`gauge:military ${Math.round(defence.supply)}<${Math.round(defence.need)}->expand:military`);
          continue;
        }
      }
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
      // Read the gauge the player reads, rather than keeping a second copy of the rule here.
      if (scenario.expand && treasury.money > 5_000) {
        const defence = needs.find((entry) => entry.kind === "military");
        if (defence && defence.supply < defence.need && expand("military")) log.push(`gauge:military ${Math.round(defence.supply)}<${Math.round(defence.need)}->expand:military`);
      }
      previous = needs;
    }
    if (waveClock.active) log.push(`wait:${(seconds - opened).toFixed(1)}`);
    return Boolean(waveClock.active);
  }

  function fight(wave: number): WaveRecord {
    sync(false);
    const started = seconds;
    const waitedSeconds = started - lastWaveEnded;
    const threat = waveClock.active!.threat;
    const population = economy.resources.population;
    const parcelsAtWave = parcels.length;
    const byKind = parcels.reduce((counts, parcel) => {
      counts[parcel.kind] = (counts[parcel.kind] ?? 0) + 1;
      return counts;
    }, {} as Record<BuildingKind, number>);
    const roadMetres = graph.allSegments().reduce((metres, segment) => {
      metres[segment.type] = Math.round((metres[segment.type] ?? 0) + segment.length);
      return metres;
    }, {} as Record<string, number>);
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
      const batteries = batteriesForParcels(statuses.filter((status) => status.state !== "rebuilding").map((status) => status.parcel), economy.resources.population);
      if (seconds - started >= nextSalvoAt) {
        const firing = batteriesInRange(batteries, assault.position);
        salvos += firing.length ? 1 : 0;
        missiles.push(...firing.map((shot) => ({
          damage: shot.damage,
          impactAt: seconds + missileTravelSeconds(distXZ(shot.position, assault.position)),
        })));
        nextSalvoAt += WAVE_STARTING_VALUES.reloadSeconds;
      }
      const hits = missiles.filter((missile) => missile.impactAt <= seconds);
      if (hits.length) waveClock = damageWaveClock(waveClock, hits.reduce((sum, missile) => sum + missile.damage, 0));
      missiles = missiles.filter((missile) => missile.impactAt > seconds);
      const hit = assault.destroyed ? parcels.find((parcel) => distXZ(parcel.position, assault.destroyed!) < 0.01) : null;
      if (hit) {
        destroyed += 1;
        rebuildingCost += rebuildCharge(buildingBuildCost(hit));
        rubble.destroy(hit);
        treasury.spend(rebuildCharge(buildingBuildCost(hit)), true);
        lifecycle.rebuild(hit, seconds);
      }
      seconds += COMBAT_STEP_SECONDS;
      // Rebuilding runs during the attack, the way the app's per-frame sync does: a lot the kaiju
      // flattened comes back once its stage elapses, and is not a target while it is going up.
      sync(false);
    }

    const held = (waveClock.active?.hitPoints ?? 0) <= 0;
    lastWaveEnded = seconds;
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
