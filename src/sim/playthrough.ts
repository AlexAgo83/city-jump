import { batteriesForParcels, firepowerPerMinute } from "./batteries";
import { buildingNeeds, type BuildingNeed, type BuildingKind } from "./buildingKinds";
import { BUILDING_STAGE_SECONDS, BuildingLifecycle, type BuildingStatus } from "./buildingLifecycle";
import { CityEconomy, incomePerSecond, Treasury } from "./economy";
import { RoadGraph } from "./graph";
import { Rubble } from "./rubble";
import { commitSegment, resolveSnap } from "./rules";
import { createRun, DEFAULT_RUN_RULES, settleWave, type RunRules, type RunState } from "./run";
import { buildableCells, buildingParcels, parcelsForDemand, type BuildingParcel } from "./slots";
import { setTerrain, flatTerrain } from "./terrain";
import { v3 } from "./vec";
import { advanceWaveClockWithThreat, createWaveClock, scheduleNextWave, waveThreat, type WaveClock } from "./wave";
import { Zones } from "./zones";

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
    readonly nextWaveReachable: boolean;
  };
  readonly log: readonly string[];
}

export function playFirstRun(seed = 1, rules: Partial<RunRules> = {}, shape: FirstWaveShape = "partial_loss"): PlaythroughResult {
  setTerrain(flatTerrain);
  const graph = new RoadGraph();
  const zones = new Zones();
  const lifecycle = new BuildingLifecycle();
  const treasury = new Treasury();
  const economy = new CityEconomy();
  const runRules = { ...DEFAULT_RUN_RULES, ...rules };
  let run = createRun(runRules);
  let waveClock = createWaveClock();
  let seconds = 0;
  let statuses: BuildingStatus[] = [];
  let parcels: BuildingParcel[] = [];
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
  const step = (dt: number) => {
    seconds += dt;
    parcels = parcelsForDemand(buildingParcels(buildableCells(graph, zones), zones), economy.resources.population, seconds);
    statuses = lifecycle.sync(parcels, economy.resources.population, seconds, runRules.instantConstruction ? 0 : BUILDING_STAGE_SECONDS);
    for (const status of statuses) if (status.started && !runRules.freeBuilding) treasury.spend(status.parcel.frontageCells * status.parcel.depthCells * 800, true);
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
  for (let i = 0; i < 80 && !waveClock.active; i++) {
    step(4);
    const needs = buildingNeeds(parcels, economy.resources.population);
    const short = needs.find((need) => need.need > need.supply);
    if (short && short.kind !== firstNeeds.find((need) => need.kind === short.kind)?.kind) log.push(`need:${short.kind}`);
    firstNeeds = needs;
  }

  if (!runRules.kaijuSpawns) {
    return result("clean_hold", 0, false);
  }
  if (!waveClock.active) throw new Error("first wave never arrived");
  return result(shape, waveClock.active.threat, true);

  function result(waveShape: FirstWaveShape, threat: number, applyOutcome: boolean): PlaythroughResult {
    const batteries = batteriesForParcels(parcels);
    const lost = waveShape === "total_loss" ? parcels : waveShape === "partial_loss" ? parcels.slice(0, Math.ceil(parcels.length / 2)) : [];
    const rebuildingCost = lost.reduce((sum, parcel) => sum + parcel.frontageCells * parcel.depthCells * 800, 0);
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
        fieldedBatteries: batteries.length,
        firepowerPerMinute: firepowerPerMinute(batteries),
        rebuildingCost,
        nextWaveReachable: !run.ended,
      },
      log,
    };
  }
}

export function militaryGap(seed = 1): number {
  const played = playFirstRun(seed, { instantConstruction: true, freeBuilding: true }, "clean_hold");
  return played.wave.firepowerPerMinute - played.wave.threat;
}
