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
import { advanceWaveClockWithThreat, createWaveClock, damageWaveClock, scheduleNextWave, waveThreat, WAVE_STARTING_VALUES, type WaveClock } from "./wave";
import { Zones } from "./zones";
import { advanceKaijuAssault, createKaijuAssault } from "./kaiju";

export type FirstWaveShape = "total_loss" | "partial_loss" | "clean_hold";

export interface PlaythroughResult {
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
  readonly wave: {
    readonly shape: FirstWaveShape;
    readonly threat: number;
    readonly fieldedBatteries: number;
    readonly firepowerPerMinute: number;
    readonly rebuildingCost: number;
    readonly combatDurationSeconds: number;
    readonly salvos: number;
    readonly nextWaveReachable: boolean;
  };
  readonly log: readonly string[];
}

export function playFirstRun(seed = 1, rules: Partial<RunRules> = {}): PlaythroughResult {
  setTerrain(flatTerrain);
  const graph = new RoadGraph();
  const zones = new Zones();
  const lifecycle = new BuildingLifecycle();
  const rubble = new Rubble();
  const treasury = new Treasury();
  const economy = new CityEconomy();
  const runRules = { ...DEFAULT_RUN_RULES, ...rules };
  let run = createRun(runRules);
  let waveClock = createWaveClock();
  let seconds = 0;
  let statuses: BuildingStatus[] = [];
  let parcels: BuildingParcel[] = [];
  let waveFieldedBatteries = 0;
  let waveFirepowerPerMinute = 0;
  let waveRebuildingCost = 0;
  let waveCombatDurationSeconds = 0;
  let waveSalvos = 0;
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
  const needZones: Record<BuildingKind, readonly [x: number, z: number]> = {
    residential: [-170, 300],
    agricultural: [-70, 220],
    commercial: [20, 300],
    industrial: [20, 260],
    military: [-70, 360],
  };
  const step = (dt: number) => {
    seconds += dt;
    parcels = parcelsForDemand(buildingParcels(buildableCells(graph, zones), zones), economy.resources.population, seconds).filter((parcel) => !rubble.blocks(parcel));
    statuses = lifecycle.sync(parcels, economy.resources.population, seconds, runRules.instantConstruction ? 0 : BUILDING_STAGE_SECONDS);
    for (const status of statuses) if (status.started && !runRules.freeBuilding) treasury.spend(buildingBuildCost(status.parcel), true);
    economy.advance(parcels, dt);
    treasury.earn(incomePerSecond(economy.resources.population, statuses) * dt);
    if (runRules.kaijuSpawns && !waveClock.active) waveClock = advanceWaveClockWithThreat(waveClock, dt, waveThreat(run.wave, economy.resources.population, parcels.length));
  };

  road("bridge", -260, 260, 40, 260);
  road("farms", -220 + seed, 220, 80 + seed, 220, "dirt");
  road("shops", -220, 310 + seed, 80, 310 + seed);
  road("battery", -220, 360 + seed, 80, 360 + seed, "military");
  paint("residential", -170, 300);
  paint("agricultural", -70, 220);
  paint("commercial", 20, 300);
  paint("military", -70, 360);

  let firstNeeds = buildingNeeds([], economy.resources.population);
  const followedNeeds = new Set<BuildingKind>();
  for (let i = 0; i < 80 && !waveClock.active; i++) {
    step(4);
    const needs = buildingNeeds(parcels, economy.resources.population);
    const short = needs.find((need) => need.need > need.supply);
    if (short && !followedNeeds.has(short.kind) && short.ratio < (firstNeeds.find((need) => need.kind === short.kind)?.ratio ?? 1)) {
      followedNeeds.add(short.kind);
      const [x, z] = needZones[short.kind];
      paint(short.kind, x, z, 60);
      log.push(`need:${short.kind}->zone:${short.kind} supply=${short.supply} need=${short.need}`);
    }
    firstNeeds = needs;
  }

  if (!runRules.kaijuSpawns) {
    return result("clean_hold", 0, false);
  }
  if (!waveClock.active) throw new Error("first wave never arrived");
  parcels = parcelsForDemand(buildingParcels(buildableCells(graph, zones), zones), economy.resources.population, seconds).filter((parcel) => !rubble.blocks(parcel));
  statuses = lifecycle.sync(parcels, economy.resources.population, seconds, runRules.instantConstruction ? 0 : BUILDING_STAGE_SECONDS);
  return fightWave();

  function result(waveShape: FirstWaveShape, threat: number, applyOutcome: boolean): PlaythroughResult {
    const batteries = batteriesForParcels(parcels, economy.resources.population);
    if (applyOutcome) {
      run = waveShape === "clean_hold" ? settleWave(run, { defeated: true, calledEarly: false, baseScience: 10 }) : { ...settleWave(run, { defeated: false, calledEarly: false, baseScience: 10 }), ended: waveShape === "total_loss" ? "defeated" : null };
      if (!run.ended) waveClock = scheduleNextWave(waveClock);
    }
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
      wave: {
        shape: waveShape,
        threat,
        fieldedBatteries: waveFieldedBatteries || batteries.length,
        firepowerPerMinute: waveFirepowerPerMinute || firepowerPerMinute(batteries),
        rebuildingCost: waveRebuildingCost,
        combatDurationSeconds: waveCombatDurationSeconds,
        salvos: waveSalvos,
        nextWaveReachable: !run.ended,
      },
      log,
    };
  }

  function fightWave(): PlaythroughResult {
    let assault = createKaijuAssault(v3(-260 + seed, 0, 260));
    let nextSalvoAt = 0;
    let salvos = 0;
    let missiles: { readonly damage: number; readonly impactAt: number }[] = [];
    const started = seconds;
    const threat = waveClock.active!.threat;
    const openingBatteries = batteriesForParcels(parcels, economy.resources.population);
    waveFieldedBatteries = openingBatteries.length;
    waveFirepowerPerMinute = firepowerPerMinute(openingBatteries);
    log.push(`defence:population=${economy.resources.population.toFixed(1)} batteries=${waveFieldedBatteries}`);
    while (waveClock.active && waveClock.active.hitPoints > 0 && seconds - started < 90 && parcels.length) {
      const live = statuses.filter((status) => status.state !== "rebuilding").map((status) => status.parcel.position);
      assault = advanceKaijuAssault(assault, live, 0.25);
      const position = assault.position;
      const batteries = batteriesForParcels(parcels, economy.resources.population);
      if (seconds - started >= nextSalvoAt) {
        const firing = batteriesInRange(batteries, position);
        salvos += firing.length ? 1 : 0;
        missiles.push(...firing.map((shot) => ({ damage: shot.damage, impactAt: seconds + WAVE_STARTING_VALUES.missileTravelSecondsAtRange * Math.min(1, distXZ(shot.position, position) / shot.range) })));
        nextSalvoAt += WAVE_STARTING_VALUES.reloadSeconds;
      }
      const hits = missiles.filter((missile) => missile.impactAt <= seconds);
      if (hits.length) waveClock = damageWaveClock(waveClock, hits.reduce((sum, missile) => sum + missile.damage, 0));
      missiles = missiles.filter((missile) => missile.impactAt > seconds);
      const hit = assault.destroyed ? parcels.find((parcel) => distXZ(parcel.position, assault.destroyed!) < 0.01) : null;
      if (hit) {
        rubble.destroy(hit);
        waveRebuildingCost += buildingBuildCost(hit);
        treasury.spend(buildingBuildCost(hit), true);
        lifecycle.rebuild(hit, seconds);
        parcels = parcels.filter((parcel) => parcel !== hit);
        statuses = lifecycle.sync(parcels, economy.resources.population, seconds, 0);
      }
      seconds += 0.25;
    }
    const held = (waveClock.active?.hitPoints ?? 0) <= 0;
    waveCombatDurationSeconds = seconds - started;
    waveSalvos = salvos;
    log.push(`wave:${held ? "held" : "breached"}`);
    log.push(`combat:${waveCombatDurationSeconds}`);
    log.push(`salvos:${salvos}`);
    run = held ? settleWave(run, { defeated: true, calledEarly: false, baseScience: 10 }) : endIfPopulationZero(defeat(settleWave(run, { defeated: false, calledEarly: false, baseScience: 10 })), economy.resources.population);
    if (held) waveClock = scheduleNextWave(waveClock);
    return result(held ? (rubble.count() ? "partial_loss" : "clean_hold") : parcels.length ? "partial_loss" : "total_loss", threat, false);
  }
}

export function militaryGap(seed = 1): number {
  return playFirstRun(seed, { instantConstruction: true }).wave.combatDurationSeconds - 30;
}
