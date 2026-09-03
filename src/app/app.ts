import { createBuildingRenderer } from "../render/buildings";
import { installDebugApi } from "../render/debugApi";
import { createDrawTool, TREE_REACH } from "../render/drawTool";
import { createGround, createOcean, createWorldGrid, GROUND_CELL, GROUND_SIZE, OFFSHORE_ISLAND_RADIUS, OFFSHORE_ISLAND_Z, offshoreIslandHeight } from "../render/ground";
import { createKaijuRenderer } from "../render/kaiju";
import { createMissileRenderer, type MissileTrail } from "../render/missiles";
import { createRoadRenderer } from "../render/roadMesh";
import { createRubbleRenderer } from "../render/rubble";
import { createScene } from "../render/scene";
import { createFpsMeter } from "../render/fps";
import { createStreetlightRenderer } from "../render/streetlights";
import { createTrafficRenderer } from "../render/traffic";
import { createUtilityRenderer } from "../render/utilities";
import { createSignalRenderer } from "../render/signals";
import { createTreeRenderer } from "../render/trees";
import { createWaveMarkerRenderer } from "../render/waveMarkers";
import { cellKey, createZoneRenderer } from "../render/zones";
import { RoadGraph } from "../sim/graph";
import { BUILDING_STAGE_SECONDS, BuildingLifecycle, type BuildingStatus } from "../sim/buildingLifecycle";
import { buildingBuildCost, CityEconomy, Treasury, incomePerSecond, rebuildingCost, roadBuildCost, type CityTerms } from "../sim/economy";
import { Plantings } from "../sim/plantings";
import { Rubble } from "../sim/rubble";
import { Zones, type ZoneKind } from "../sim/zones";
import { batteriesForParcels, batteriesInRange, firepowerPerMinute } from "../sim/batteries";
import { buildingNeeds, BUILDING_KIND_COLOR } from "../sim/buildingKinds";
import { Heightmap, rollingHills, SEA_LEVEL, type TerrainBounds } from "../sim/heightmap";
import { createCityHistory } from "../sim/history";
import { allJunctions } from "../sim/junction";
import { advanceKaijuAssault, createKaijuAssault, kaijuPositionAt, planKaiju, type KaijuAssaultState, type KaijuPlan } from "../sim/kaiju";
import { baseRoadTypeId, roadType } from "../sim/roadTypes";
import { missingUtility, suppliedDiffusers, Utilities } from "../sim/utilities";
import { buildableCellCentre, buildingParcels, buildableCells, lotsInRect, lotsWithin, parcelDemandLimits, parcelsForDemand, GRID, type BuildableCell, type BuildingParcel } from "../sim/slots";
import { parseCity, serializeCity, restoreCity, SAVE_VERSION, type CitySave, type SavedCamera } from "../sim/save";
import { buyUpgrade, carryScience, createRun, endIfPopulationZero, evacuate, FIRST_UPGRADE_WEB, settleWave, startingMoney, startingResources, type ProfileState, type RunState } from "../sim/run";
import { streetForSegment } from "../sim/streets";
import { setTerrain } from "../sim/terrain";
import { approachAngle } from "../sim/transfers";
import { distXZ, v3 } from "../sim/vec";
import { advanceWaveClock, callWaveNow, createWaveClock, damageWaveClock, residentsUntilWave, scheduleNextWave, summonIfDue, waveAtPopulation, waveThreat, WAVE_STARTING_VALUES } from "../sim/wave";
import type { FollowTarget, SelectionInfo } from "../render/drawTool";
import { bindControls } from "../ui/controls";
import { deleteRunSaveOnDefeat, readAutosave, readSave, writeAutosave, writeCameraState, writeSave, readCameraState, readSettings, readProfile, writeProfile } from "../ui/saves";
import { createDetailCuller } from "../render/detail";
import { createPostFx } from "../render/postFx";
import { DEFAULT_HOUR, streetlightsOnAt } from "../render/streetlights";
import { showAlert, showCityStats, showCompass, showFps, showMoney, showRefusal, showRunStats, showSelection, showWaveBanner } from "../ui/hud";

/** Where a run opens: the far side of the island from the bridge. */
const STARTER_KIT_AT = { x: 210, z: -1350 } as const;

type CameraMode = "free" | "orbit" | "follow";
type WaveVerdict = "held" | "breached";
type TimeRate = 0 | 1 | 2 | 4;
type PendingMissile = { readonly from: { readonly x: number; readonly y: number; readonly z: number }; readonly launchedAt: number; readonly impactAt: number; readonly damage: number };

export async function startApp(startedAt = performance.now()): Promise<void> {
  const canvas = document.getElementById("app") as HTMLCanvasElement;
  const { scene, camera, shadows, setSunHour, setShadowsEnabled, invalidateShadows, setFrameCap, frameDelta } = createScene(canvas);
  const detail = createDetailCuller(scene, camera);
  const postFx = createPostFx(scene, camera);
  const heightmap = new Heightmap({ size: GROUND_SIZE, cell: GROUND_CELL, generator: rollingHills() });
  setTerrain(heightmap);
  const frameTerrain = (): void => {
    camera.target.y = heightmap.heightAt(0, 0);
  };
  frameTerrain();

  const graph = new RoadGraph();
  const plantings = new Plantings();
  const zones = new Zones();
  const rubble = new Rubble();
  const utilities = new Utilities();
  const buildingLifecycle = new BuildingLifecycle();
  let profile: ProfileState = readProfile();
  const treasury = new Treasury(startingMoney(profile));
  const cityEconomy = new CityEconomy(startingResources(profile, new CityEconomy().resources));
  const history = createCityHistory<CitySave>(20);
  createOcean(scene);
  const ground = createGround(scene, heightmap);
  const worldGrid = createWorldGrid(scene, heightmap);
  const roads = createRoadRenderer(scene, graph);
  const traffic = createTrafficRenderer(scene, graph, frameDelta);
  const fps = createFpsMeter();
  const signals = createSignalRenderer(scene, graph, frameDelta);
  const streetlights = createStreetlightRenderer(scene, graph);
  const trees = createTreeRenderer(scene, heightmap, graph, shadows, plantings);
  const zoneOverlay = createZoneRenderer(scene);
  const utilityOverlay = createUtilityRenderer(scene, graph, utilities);
  const rubbleRenderer = createRubbleRenderer(scene, (x, z) => heightmap.heightAt(x, z));
  const kaiju = createKaijuRenderer(scene, shadows);
  const missiles = createMissileRenderer(scene);
  const waveMarkers = createWaveMarkerRenderer(scene, (x, z) => heightmap.heightAt(x, z));
  const buildings = await createBuildingRenderer(scene, graph, shadows);
  // What the World > Buildings checkbox itself says -- the select-tool view can hide buildings
  // on top of that, but flipping back to "All" has to restore this, not just force them on.
  let buildingsVisible = true;
  let cameraMode: CameraMode = "free";
  let followTarget: FollowTarget | null = null;
  let simPaused = true;
  let timeRate: TimeRate = 0;
  let lastRunRate: Exclude<TimeRate, 0> = readSettings().timeRate ?? 1;
  let simDay = 1;
  let pendingHistorySnapshot: CitySave | null = null;
  const setCameraMode = (mode: CameraMode): void => {
    cameraMode = mode;
    const input = document.querySelector<HTMLInputElement>(`input[name="camera-mode"][value="${mode}"]`);
    if (input) input.checked = true;
  };
  const setSun = (hour: number): void => {
    setSunHour(hour);
    streetlights.setSunHour(hour);
    traffic.setSunHour(hour);
    trees.setSunHour(hour);
    postFx.setNight(streetlightsOnAt(hour));
  };
  const addOffshoreBridge = (): void => {
    for (const segment of graph.allSegments()) {
      if (segment.type === "highway_2lane" && Math.max(graph.node(segment.a).pos.z, graph.node(segment.b).pos.z) > GROUND_SIZE / 2) graph.removeSegment(segment.id);
    }
    const islandZ = OFFSHORE_ISLAND_Z - OFFSHORE_ISLAND_RADIUS * 0.72;
    const main = graph.addNodeAt(v3(-360, heightmap.baseHeightAt(-360, 1500) + 14, 1500));
    const island = graph.addNodeAt(v3(620, Math.max(22, offshoreIslandHeight(620, islandZ) + 14), islandZ));
    graph.addElevatedSegment(main, island, v3(980, 82, (1500 + islandZ) / 2), "highway_2lane");
  };

  const rebuild = (dirty?: TerrainBounds, timings?: Record<string, number>): void => {
    const measure = (name: string, work: () => void): void => {
      if (!timings) {
        work();
        return;
      }
      const started = performance.now();
      work();
      timings[name] = performance.now() - started;
    };
    // Solving the parcel layout is the most expensive step in here, so it happens once and both
    // the terrain flattening and the building renderer work from the same answer.
    if (!dirty) measure("parcels", () => {
      currentBuildableCells = solveBuildableCells();
      currentParcels = parcelsForDemand(buildingParcels(currentBuildableCells, zones), cityEconomy.resources.population, simSeconds, (parcel) => buildingLifecycle.stateOf(parcel) !== undefined).filter((parcel) => !rubble.blocks(parcel) || buildingLifecycle.stateOf(parcel) === "rebuilding");
      syncBuildings();
    });
    let junctions: ReturnType<typeof allJunctions>;
    measure("allJunctions", () => {
      junctions = allJunctions(graph);
      if (timings) timings.allJunctionsCalls = 1;
    });
    measure("heightmap", () => heightmap.conformToRoads(graph, currentParcels, dirty, junctions));
    measure("ground", () => ground.refresh(dirty));
    measure("trees", () => trees.rebuild(dirty));
    measure("worldGrid", () => worldGrid.rebuild(dirty));
    measure("roads", () => roads.rebuild(dirty, junctions));
    measure("streetlights", () => streetlights.rebuild(junctions, dirty));
    measure("traffic", () => traffic.rebuild(dirty));
    measure("signals", () => signals.rebuild(junctions, dirty));
    measure("zones", () => zoneOverlay.rebuild(currentBuildableCells, zones, occupiedCells()));
    if (starterDistricts.length) window.setTimeout(layStarterDistricts, 0);
    measure("rubble", () => rubbleRenderer.rebuild(rubble.toJSON()));
    measure("utilities", () => utilityOverlay.rebuild(currentSuppliedUtilities()));
    if (dirty) scheduleBuildingRebuild();
    else measure("buildings", () => buildings.rebuild(currentBuildableCells, currentBuildingStatuses));
    invalidateShadows(); // the casters just changed, so the frozen shadow map is out of date
    detail.invalidate(); // and the new meshes have not been through the zoom rules yet
    scheduleAutosave();
  };

  /**
   * The buildable cells, re-solved only when the roads, the zoning or the ground have moved.
   *
   * Walking every block of every segment costs ~65ms on a city-sized graph, and it is the bulk of
   * a re-pack -- but a demand tick, which is what triggers most of them, changes none of its three
   * inputs, so it was 65ms spent to get the same array back.
   */
  let cachedCells: { key: string; cells: readonly BuildableCell[] } | null = null;
  const solveBuildableCells = (): readonly BuildableCell[] => {
    const key = `${graph.revision}:${zones.revision}:${heightmap.generation}`;
    if (cachedCells?.key !== key) cachedCells = { key, cells: buildableCells(graph, zones) };
    return cachedCells.cells;
  };

  /**
   * The lot layout on its own, for when the only thing that changed is which lots are admitted.
   *
   * A house going up moves no road, no signal, no car and no tree, and a full rebuild spends about
   * 480ms of its 500ms on exactly those (`api.measureCosts()` on a 561-building city: ground 231,
   * parcels 103, roads 82, signals 27, traffic 16 -- buildings themselves 10). Here the ground is
   * reconformed over the lots that appeared or left rather than over the whole map.
   */
  const repackParcels = (): void => {
    const before = new Map(currentParcels.map((parcel) => [parcelId(parcel), parcel]));
    currentBuildableCells = solveBuildableCells();
    // While the clock is stopped the city is a plan, not a building site: the paint lands on the
    // map and the lots stay as they are. Without this, zoning during a pause put buildings up and
    // charged the treasury for them on a clock that was not running. The overlay still repaints,
    // so the plan is visible; `setTimeRate` asks for this pass again the moment the clock starts,
    // and that is when the city answers it. Bulldozing is not affected: it takes its lot out of
    // the list itself rather than waiting for a re-pack.
    // Same rule for a wave as for a pause: the lots stay as they are while a kaiju walks the city
    // -- it is destroying them, this is no moment to re-pack -- but the paint still has to land on
    // the map. The buildable cells carry the zoning, and this pass is the only thing that
    // re-solves them: without it, zoning during an attack changed nothing on screen until the
    // wave was over.
    if (simPaused || waveClock.active) {
      // The picture still has to tell the truth about the lots that are there: a bulldozed
      // building takes itself out of the list, and nothing else would repaint after it.
      buildings.rebuild(currentBuildableCells, currentBuildingStatuses);
      zoneOverlay.rebuild(currentBuildableCells, zones, occupiedCells());
      invalidateShadows();
      detail.invalidate();
      scheduleAutosave();
      return;
    }
    currentParcels = parcelsForDemand(buildingParcels(currentBuildableCells, zones), cityEconomy.resources.population, simSeconds, (parcel) => buildingLifecycle.stateOf(parcel) !== undefined).filter((parcel) => !rubble.blocks(parcel) || buildingLifecycle.stateOf(parcel) === "rebuilding");
    syncBuildings();
    // `delete` answers whether the lot was already standing, so one pass leaves the arrivals in
    // `changed` and the departures in `before`.
    const changed = currentParcels.filter((parcel) => !before.delete(parcelId(parcel))).concat([...before.values()]);
    if (changed.length) {
      // One union box, not one call per lot: `ground.refresh` recomputes the normals of the whole
      // grid whatever bounds it is given, so its cost is per call, not per square metre.
      const dirty = changed.map(parcelBounds).reduce((a, b) => ({ minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX), minZ: Math.min(a.minZ, b.minZ), maxZ: Math.max(a.maxZ, b.maxZ) }));
      heightmap.conformToRoads(graph, currentParcels, dirty, allJunctions(graph));
      ground.refresh(dirty);
    }
    buildings.rebuild(currentBuildableCells, currentBuildingStatuses);
    zoneOverlay.rebuild(currentBuildableCells, zones, occupiedCells());
    invalidateShadows();
    detail.invalidate();
    scheduleAutosave();
  };

  // No longer chosen in the UI, but still carried by saves and honoured on load, so a city built
  // on the rugged map comes back on the rugged map.
  let terrainPreset = "rolling";
  let currentBuildableCells: readonly BuildableCell[] = [];
  let currentParcels: readonly BuildingParcel[] = [];
  let currentBuildingStatuses: readonly BuildingStatus[] = [];
  let waveClock = createWaveClock();
  let runState: RunState = createRun();
  let kaijuPlan: KaijuPlan | null = null;
  let kaijuAssault: KaijuAssaultState | null = null;
  let pendingMissiles: PendingMissile[] = [];
  let nextSalvoAt = 0;
  let waveVerdict: WaveVerdict | null = null;
  let waveVerdictUntil = 0;
  let waveCalledEarly = false;
  let buildingRebuildTimer = 0;
  let lastTerms: CityTerms | undefined;
  let darkDistricts = new Set<string>();
  let chargeConstructionStarts = true;
  const scheduleBuildingRebuild = (): void => {
    // A wave destroys a building every few seconds and the destruction repaints its own region;
    // the re-pack itself is held for the duration inside `repackParcels`, which still repaints
    // what the player painted.
    window.clearTimeout(buildingRebuildTimer);
    buildingRebuildTimer = window.setTimeout(repackParcels, 250);
  };
  let simSeconds = 0;
  let demandStep = 0;
  /**
   * How many lots of each kind the rules would admit right now.
   *
   * `parcelsForDemand` caps each kind at the lesser of a population limit and one more lot every
   * twenty seconds, so once the clock has outrun the limit, more time admits nothing. Comparing
   * this signature says whether a rebuild could possibly change the city, without solving the
   * parcel layout to find out.
   */
  const admittedCap = (): string => {
    const admitted = Math.floor(Math.max(0, simSeconds) / 20) + 1;
    const limits = parcelDemandLimits(cityEconomy.resources.population);
    return Object.entries(limits).map(([kind, limit]) => `${kind}:${Math.min(limit as number, admitted)}`).join(",");
  };
  let lastAdmittedCap = "";
  const stateCounts = (): Record<string, number> =>
    currentBuildingStatuses.reduce((counts, status) => {
      counts[status.state] = (counts[status.state] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  const updateMoneyHud = (): void => showMoney(treasury.money, incomePerSecond(cityEconomy.resources.population, currentBuildingStatuses), stateCounts());
  const updateRunHud = (): void => showRunStats(runState.wave, runState.science, profile.prestige);
  const emptyCity = (): CitySave => ({ v: SAVE_VERSION, terrain: "rolling", hour: DEFAULT_HOUR, money: startingMoney(profile), resources: startingResources(profile, new CityEconomy().resources), run: createRun(), waveClock: createWaveClock(), elapsed: 0, nodes: [], segments: [], planted: [], cleared: [], zones: [], rubble: [], buildingStates: [], utilities: [] });
  const spendBuild = (cost: number, allowDebt = false): boolean => runState.rules.freeBuilding || treasury.spend(cost, allowDebt);
  /** What the next wave will bring, so the needs panel can price the defence against it. */
  const projectedThreat = (): number => waveClock.active?.threat ?? waveThreat(runState.wave, cityEconomy.resources.population, currentParcels.length);
  const workingParcels = (): BuildingParcel[] => currentBuildingStatuses.filter((status) => status.state === "working").map((status) => status.parcel);
  /** The cells a standing building covers, so the zone overlay can shade taken land. */
  const occupiedCells = (): Set<string> => {
    const keys = new Set<string>();
    for (const parcel of currentParcels) for (const cell of parcel.cells) keys.add(cellKey(cell));
    return keys;
  };
  const currentSuppliedUtilities = (): Set<string> => suppliedDiffusers(graph, utilities.producers(), utilities.diffusers());
  const syncBuildings = (): void => {
    const residents = cityEconomy.resources.population;
    const supplied = currentSuppliedUtilities();
    const diffusers = utilities.diffusers();
    currentBuildingStatuses = buildingLifecycle.sync(currentParcels, residents, simSeconds, runState.rules.instantConstruction ? 0 : BUILDING_STAGE_SECONDS, Boolean(waveClock.active)).map((status) => {
      if (status.state === "rising" || status.state === "rebuilding") return status;
      const missing = missingUtility(status.parcel.kind, status.parcel.position, supplied, diffusers);
      const ignored = missing === "power" ? runState.rules.ignorePower : missing === "water" ? runState.rules.ignoreWater : false;
      if (missing && !ignored) return { ...status, state: "idle" as const, reason: missing };
      // Shops run on what the works make. No materials, no trade -- that is what industry is for.
      if ((status.parcel.kind === "commercial" || status.parcel.kind === "military") && cityEconomy.materialsShort) return { ...status, state: "idle" as const, reason: "materials" as const };
      return status;
    });
    const nextDark = new Set(currentBuildingStatuses.filter((status) => status.reason === "power" || status.reason === "water").map((status) => `${Math.round(status.parcel.position.x)}:${Math.round(status.parcel.position.z)}`));
    if ([...nextDark].some((key) => !darkDistricts.has(key))) showAlert("A district went dark.");
    darkDistricts = nextDark;
    for (const status of currentBuildingStatuses) {
      if (chargeConstructionStarts && status.started) spendBuild(buildingBuildCost(status.parcel), true);
    }
    let clearedRubble = false;
    for (const status of currentBuildingStatuses) {
      if (status.state === "rebuilding" || !rubble.blocks(status.parcel)) continue;
      rubble.clear(status.parcel);
      clearedRubble = true;
    }
    if (clearedRubble) rubbleRenderer.rebuild(rubble.toJSON());
    const income = incomePerSecond(residents, currentBuildingStatuses);
    // A city that has not ticked yet still has stocks worth reading. Without this the ledger sat
    // empty after every load and every refresh, until the player pressed play.
    lastTerms ??= cityEconomy.advance(workingParcels(), 0);
    showCityStats(residents, buildingNeeds(currentParcels, residents, projectedThreat()), cityEconomy.resources, { ...lastTerms, trade: income });
    showMoney(treasury.money, income, stateCounts());
  };
  const refreshUtilities = (): void => {
    syncBuildings();
    buildings.updateStates(currentBuildingStatuses);
    utilityOverlay.rebuild(currentSuppliedUtilities());
    scheduleAutosave();
  };
  let sunHour = DEFAULT_HOUR;
  const setClockHour = (hour: number): void => {
    sunHour = ((hour % 24) + 24) % 24;
    setSun(sunHour);
    controls?.setClock(sunHour, simDay, timeRate);
  };
  const advanceClock = (dt: number): void => {
    if (dt <= 0) return;
    simSeconds += dt;
    if (currentBuildableCells.length && Math.floor(simSeconds / 20) !== demandStep) {
      demandStep = Math.floor(simSeconds / 20);
      // Only when another lot could actually go up. This used to rebuild the whole world every
      // twenty simulated seconds -- five real ones at quadruple speed -- whether or not anything
      // had changed, so the city flickered through a full repaint on a timer.
      const cap = admittedCap();
      if (cap !== lastAdmittedCap) {
        lastAdmittedCap = cap;
        repackParcels();
      }
    }
    // Five minutes of real time for a full day and night at normal speed. At a quarter of an hour
    // per second the sky strobed -- a whole day every twenty-four seconds at x4 -- and half of a
    // session was spent unable to see the city.
    const next = sunHour + dt * 0.08;
    simDay += Math.floor(next / 24);
    setClockHour(next);
  };
  const applyTerrain = (preset: string): void => {
    terrainPreset = preset;
    heightmap.regenerate(preset === "rugged" ? rollingHills(18, 450, 18) : rollingHills());
    frameTerrain();
  };

  // Debounced, so dragging a long road writes once rather than on every rebuild.
  // ponytail: a timer, not a dirty-flag scheduler.
  // And nothing is written while one is on the island, so the save on disk is never mid-wave.
  let autosaveTimer = 0;
  let autosaveRefusedShown = false;
  const cameraSnapshot = (): SavedCamera => ({
    targetX: camera.target.x,
    targetY: camera.target.y,
    targetZ: camera.target.z,
    alpha: camera.alpha,
    beta: camera.beta,
    radius: camera.radius,
  });
  const applyCamera = (state: SavedCamera): void => {
    camera.target.set(state.targetX, state.targetY, state.targetZ);
    camera.alpha = state.alpha;
    camera.beta = state.beta;
    camera.radius = state.radius;
  };
  const scheduleAutosave = (): void => {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => {
      // The wave itself is not written -- nothing about a kaiju can be, and a reload puts the city
      // back to just before one anyway. The city is. Refusing to save at all while one walked meant
      // a wave that lasted, or a city big enough to summon the next one on the spot, stopped the
      // autosave for good: a refresh then came back to whatever was saved before the attack, with
      // the buildings, the money and the rubble of a much younger city.
      const saved = { ...waveClock, active: null };
      if (writeAutosave(serializeCity(graph, plantings, zones, terrainPreset, sunHour, cameraSnapshot(), rubble, buildingLifecycle, treasury, cityEconomy, utilities, runState, saved, simSeconds)) || autosaveRefusedShown) return;
      autosaveRefusedShown = true;
      showRefusal("Autosave could not be written. Browser storage may be full or disabled.");
    }, 2000);
  };

  /** A tree changes no road, so only the scenery is rebuilt. */
  const refreshTrees = (): void => {
    trees.rebuild();
    scheduleAutosave();
  };
  const snapshot = (withCamera = false): CitySave =>
    serializeCity(graph, plantings, zones, terrainPreset, sunHour, withCamera ? cameraSnapshot() : undefined, rubble, buildingLifecycle, treasury, cityEconomy, utilities, runState, waveClock, simSeconds);
  const restoreSnapshot = (city: CitySave): void => {
    tool.cancel();
    followTarget = null;
    restoreCity(graph, plantings, zones, city, rubble, buildingLifecycle, treasury, cityEconomy, utilities);
    addOffshoreBridge();
    rebuild();
    updateUndoRedo();
  };
  const beforeChange = (): void => {
    pendingHistorySnapshot ??= snapshot();
  };
  const afterChange = (changed: boolean): void => {
    if (changed && pendingHistorySnapshot) history.record(pendingHistorySnapshot);
    pendingHistorySnapshot = null;
    updateUndoRedo();
  };
  let updateUndoRedo = (): void => {};
  const undo = (): void => {
    if (!history.undo(snapshot(), restoreSnapshot)) showRefusal("Nothing to undo.");
  };
  const redo = (): void => {
    if (!history.redo(snapshot(), restoreSnapshot)) showRefusal("Nothing to redo.");
  };
  let stopFpsHud: (() => void) | null = null;
  const setFpsVisible = (visible: boolean): void => {
    if (visible === Boolean(stopFpsHud)) return;
    if (visible) {
      stopFpsHud = fps.watch();
      showFps(fps.display);
      return;
    }
    stopFpsHud?.();
    stopFpsHud = null;
    showFps(null);
  };
  const measureFps = (ms: number): Promise<number> => {
    const stop = fps.watch();
    return new Promise((resolve) => {
      window.setTimeout(() => {
        const measured = fps.display;
        stop();
        resolve(measured);
      }, ms);
    });
  };
  const startWave = (seed = String(Math.round(waveClock.elapsedSeconds))): void => {
    const half = GROUND_SIZE / 2;
    const coast = Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      return v3(Math.cos(a) * half * 0.92, 0, Math.sin(a) * half * 0.92);
    });
    kaijuPlan = planKaiju(
      seed,
      { minX: -half, maxX: half, minZ: -half, maxZ: half },
      coast,
      currentParcels.map((parcel) => v3(parcel.position.x, parcel.position.y, parcel.position.z)),
      v3(-360, 0, 1500),
    );
    pendingMissiles = [];
    kaijuAssault = null;
    nextSalvoAt = 0;
    waveVerdict = null;
    waveVerdictUntil = 0;
    // Show the player the thing that is about to walk through their city. It lands a kilometre or
    // more off the coast and walks in, so without this it destroyed the place off screen.
    const target = kaijuPlan.target ?? kaijuPlan.coast;
    const midX = (kaijuPlan.landing.x + target.x) / 2;
    const midZ = (kaijuPlan.landing.z + target.z) / 2;
    applyCamera({
      targetX: midX,
      targetY: 0,
      targetZ: midZ,
      alpha: Math.atan2(kaijuPlan.landing.z - target.z, kaijuPlan.landing.x - target.x) - Math.PI / 2,
      beta: Math.PI / 3.2,
      radius: Math.max(700, distXZ(kaijuPlan.landing, target) * 0.9),
    });
  };
  const finishWave = (verdict: WaveVerdict): void => {
    waveVerdict = verdict;
    waveVerdictUntil = waveClock.elapsedSeconds + 3;
    runState = verdict === "held"
      ? settleWave(runState, { defeated: true, calledEarly: waveCalledEarly, baseScience: 10 * runState.wave })
      : endIfPopulationZero(settleWave(runState, { defeated: false, calledEarly: waveCalledEarly, baseScience: 10 * runState.wave }), cityEconomy.resources.population);
    waveClock = runState.ended ? waveClock : scheduleNextWave(waveClock);
    waveCalledEarly = false;
    if (runState.ended) {
      deleteRunSaveOnDefeat(profile, runState.ended);
      endRun();
    }
    updateRunHud();
    // Clear the plan and the walker, not just the mesh. Leaving them meant the next wave found a
    // plan already set, skipped `startWave`, and resumed the old kaiju exactly where it had
    // stopped -- in the middle of the city, with no arrival and no reason.
    kaijuPlan = null;
    kaijuAssault = null;
    // The one full rebuild the wave deferred: re-pack the parcels now that the dust has settled.
    rebuild();
    kaiju.hide();
    waveMarkers.hide();
    pendingMissiles = [];
    missiles.rebuild([]);
    showWaveBanner(verdict === "held" ? "Wave held" : "Wave breached", verdict);
  };
  const resetWave = (): void => {
    waveClock = createWaveClock();
    kaijuPlan = null;
    kaijuAssault = null;
    pendingMissiles = [];
    waveVerdict = null;
    waveVerdictUntil = 0;
    waveCalledEarly = false;
    kaiju.hide();
    waveMarkers.hide();
    missiles.rebuild([]);
  };
  /** Districts waiting for the lots they belong to, laid out on the next rebuild. */
  let starterDistricts: [kind: ZoneKind, fromX: number, toX: number][] = [];
  const layStarterDistricts = (): void => {
    if (!starterDistricts.length || !currentBuildableCells.length) return;
    const z = STARTER_KIT_AT.z;
    for (const [kind, fromX, toX] of starterDistricts) {
      zones.paintLots(lotsInRect(currentBuildableCells, fromX, z - 40, toX, z + 40), kind);
    }
    starterDistricts = [];
    rebuild();
  };
  const addStarterKit = (): void => {
    // The bridge is the only road a fresh island carries, so anything else means this is a city
    // that already exists. Checking the type is exact; the old check was a z threshold that the
    // kit's own road had to stay behind, which is how it ended up marooned in the middle.
    if (graph.allSegments().some((segment) => segment.type !== "highway_2lane")) return;
    // The far side of the island from the bridge, so the kaiju -- which lands on the edge furthest
    // from the bridge -- arrives near the city rather than a summit away from it.
    const z = STARTER_KIT_AT.z;
    const landing = graph.addNodeAt(v3(STARTER_KIT_AT.x, heightmap.baseHeightAt(STARTER_KIT_AT.x, z), z));
    const x = STARTER_KIT_AT.x;
    // One segment, not two meeting in the middle: a junction trims the frontage either side of it,
    // and splitting a 300 m street in half cost sixteen building lots and left a visible gap.
    graph.addSegment(landing, graph.addNodeAt(v3(x + 300, heightmap.baseHeightAt(x + 300, z), z)), v3(x + 150, 0, z), "street");
    // Three blocks along the street, as rectangles. The brush is a circle -- which is right for a
    // brush -- but three circles on a rectangular frontage leave round edges, holes in the middle
    // and gaps between them. A district laid out at the start should look laid out.
    // Laid out after the lots exist: a zone belongs to a lot, and the lots come from the road that
    // was just drawn, so the districts are painted on the far side of the first rebuild.
    starterDistricts = [
      ["agricultural", x, x + 100],
      ["residential", x + 100, x + 200],
      ["commercial", x + 200, x + 300],
    ];
    // Power and water, because a building without them does not work and a city where nothing
    // works produces no food and loses its people. Utilities are a system to extend, not a first
    // lesson to fail: the run opens with enough to keep the starter lots running.
    for (const kind of ["power", "water"] as const) {
      utilities.place(graph, "producer", kind, x + 20, z);
      utilities.place(graph, "diffuser", kind, x + 110, z);
      utilities.place(graph, "diffuser", kind, x + 230, z);
    }
  };
  const updateWave = (dt: number): void => {
    // A finished run is finished. Without this the clock kept running over a dead city, gathered
    // the next wave and sent the kaiju back in -- and evacuating did nothing a player could see.
    if (runState.ended) {
      kaijuPlan = null;
      kaijuAssault = null;
      pendingMissiles = [];
      kaiju.hide();
      waveMarkers.hide();
      missiles.rebuild([]);
      showWaveBanner(runState.ended === "evacuated" ? `Evacuated with ${Math.floor(runState.science)} science` : runState.ended === "population_zero" ? "The island emptied" : "The city fell", runState.ended === "evacuated" ? "held" : "breached");
      return;
    }
    if (!runState.rules.kaijuSpawns) {
      kaijuPlan = null;
      kaijuAssault = null;
      pendingMissiles = [];
      kaiju.hide();
      waveMarkers.hide();
      missiles.rebuild([]);
      showWaveBanner("Pacifist: waves, science and prestige are paused.", "waiting");
      return;
    }
    waveClock = advanceWaveClock(waveClock, dt);
    if (waveVerdict) {
      if (waveClock.elapsedSeconds < waveVerdictUntil) {
        showWaveBanner(waveVerdict === "held" ? "Wave held" : "Wave breached", waveVerdict);
        return;
      }
      waveVerdict = null;
    }
    // Only once the last verdict has cleared the screen.
    // Only while the clock runs. A kaiju summoned during a pause landed on a city that was not
    // playing, and stayed pending for as long as the player left the game stopped.
    if (dt > 0) waveClock = summonIfDue(waveClock, runState.wave, cityEconomy.resources.population, waveThreat(runState.wave, cityEconomy.resources.population, currentParcels.length));
    if (waveClock.active && !kaijuPlan) startWave();
    if (!waveClock.active || !kaijuPlan) {
      kaiju.hide();
      waveMarkers.hide();
      missiles.rebuild([]);
      showWaveBanner(`Kaiju at ${waveAtPopulation(runState.wave)} residents -- ${Math.floor(cityEconomy.resources.population)} so far, ${Math.ceil(residentsUntilWave(runState.wave, cityEconomy.resources.population))} to go`, "waiting");
      return;
    }
    const seconds = waveClock.elapsedSeconds - waveClock.active.startedAtSeconds;
    const coastSeconds = distXZ(kaijuPlan.landing, kaijuPlan.coast) / WAVE_STARTING_VALUES.kaijuSpeedMps;
    const livingBuildings = currentBuildingStatuses.filter((status) => status.state !== "rebuilding");
    if (seconds >= coastSeconds) {
      kaijuAssault ??= createKaijuAssault(kaijuPlan.coast);
      kaijuAssault = advanceKaijuAssault(kaijuAssault, livingBuildings.map((status) => status.parcel.position), dt);
    }
    const position = kaijuAssault?.position ?? kaijuPositionAt({ ...kaijuPlan, path: [kaijuPlan.landing, kaijuPlan.coast] }, seconds);
    const next = kaijuAssault?.target ?? kaijuPositionAt({ ...kaijuPlan, path: [kaijuPlan.landing, kaijuPlan.coast] }, seconds + 0.1);
    waveMarkers.show(kaijuPlan);
    // Never below the waterline: offshore, the ground it is standing on is the sea floor -- 136 m
    // down at the edge of the map -- and a kaiju coming out of the sea wades in rather than
    // walking along the bottom of it.
    kaiju.show(v3(position.x, Math.max(SEA_LEVEL, heightmap.heightAt(position.x, position.z)), position.z), Math.atan2(next.x - position.x, next.z - position.z), seconds);
    const batteries = batteriesForParcels(currentParcels, cityEconomy.resources.population, (parcel) => buildingLifecycle.staffedOf(parcel));
    if (seconds >= nextSalvoAt) {
      pendingMissiles.push(...batteriesInRange(batteries, position).map((battery, index) => {
        const launchedAt = seconds + index * 0.22;
        return {
          from: battery.position,
          launchedAt,
          impactAt: launchedAt + WAVE_STARTING_VALUES.missileTravelSecondsAtRange * Math.min(1, distXZ(battery.position, position) / battery.range),
          damage: battery.damage,
        };
      }));
      nextSalvoAt = seconds + WAVE_STARTING_VALUES.reloadSeconds;
    }
    const hits = pendingMissiles.filter((missile) => missile.impactAt <= seconds);
    if (hits.length) waveClock = damageWaveClock(waveClock, hits.reduce((sum, missile) => sum + missile.damage, 0));
    pendingMissiles = pendingMissiles.filter((missile) => missile.impactAt > seconds);
    const missileToTrail = (missile: PendingMissile, impact = false): MissileTrail => ({
      from: missile.from,
      to: position,
      progress: impact ? 1 : (seconds - missile.launchedAt) / Math.max(0.01, missile.impactAt - missile.launchedAt),
      impact,
    });
    missiles.rebuild([...pendingMissiles.filter((missile) => missile.launchedAt <= seconds).map((missile) => missileToTrail(missile)), ...hits.map((missile) => missileToTrail(missile, true))]);
    const active = waveClock.active;
    if (!active) return;
    showWaveBanner(`Kaiju ${Math.ceil(active.hitPoints)}/${active.threat} HP - ${Math.round(firepowerPerMinute(batteries))} dmg/min`, "active");
    if (active.hitPoints <= 0) {
      finishWave("held");
      return;
    }
    const hit = kaijuAssault?.destroyed ? currentParcels.find((parcel) => samePosition(parcel.position, kaijuAssault!.destroyed!)) : null;
    if (!hit) return;
    rubble.destroy(hit);
    treasury.spend(rebuildingCost(buildingBuildCost(hit)), true);
    buildingLifecycle.rebuild(hit, simSeconds);
    syncBuildings();
    history.clear();
    rebuild(parcelBounds(hit));
    if (!currentBuildingStatuses.some((status) => status.state !== "rebuilding")) finishWave("breached");
  };

  // Set once bindControls runs, just below -- createDrawTool needs a selection callback before
  // that exists, but the callback itself only ever fires later, once the player actually clicks.
  let controls: ReturnType<typeof bindControls> | undefined;
  let selectedInfo: SelectionInfo | null = null;
  const setTimeRate = (rate: TimeRate): void => {
    const wasPaused = simPaused;
    timeRate = rate;
    if (rate === 1 || rate === 2 || rate === 4) lastRunRate = rate;
    simPaused = rate === 0;
    // Starting the clock builds what was planned while it was stopped, rather than leaving the
    // player to wait for the next demand step twenty simulated seconds later.
    if (wasPaused && !simPaused) repackParcels();
    traffic.setTimeScale(rate);
    signals.setTimeScale(rate);
    controls?.setClock(sunHour, simDay, rate);
    controls?.setPaused(simPaused);
  };
  const setPaused = (paused: boolean): void => {
    setTimeRate(paused ? 0 : lastRunRate);
  };
  const onSelect = (info: SelectionInfo | null): void => {
    selectedInfo = info;
    showSelection(info);
    followTarget = info?.kind === "vehicle" ? info.target : null;
    // The eyedropper: picking a road sets the Roads tab up to match it, ready to draw more.
    if (info?.kind === "road") controls?.applyRoadType(info.baseId, info.lanes, info.oneWay);
  };

  const tool = createDrawTool(
    scene,
    graph,
    ground.mesh,
    rebuild,
    showRefusal,
    {
      plant(x, z, species) {
        if (heightmap.heightAt(x, z) <= SEA_LEVEL) return false;
        plantings.plant(x, z, species);
        refreshTrees();
        return true;
      },
      clearTree(x, z) {
        const tree = trees.nearestTree(x, z, TREE_REACH);
        if (!tree) return false;
        plantings.clear(tree.x, tree.z);
        refreshTrees();
        return true;
      },
      treeAt: (x, z, within) => trees.nearestTree(x, z, within),
    },
    {
      /** The brush zones the lots it covers. There is no ground paint any more. */
      paint(x, z, radius, kind) {
        zones.paintLots(lotsWithin(currentBuildableCells, x, z, radius), kind);
        // Zoning changes what can be built, so the cell and parcel solve has to run again.
        scheduleBuildingRebuild();
      },
      /**
       * The overlay answers straight away -- it reads the zoning per cell, so it does not need the
       * cells re-solved to show the stroke -- and the lots follow on the debounced re-pack that
       * `paint` just asked for. Nothing else moves: a zone does not touch the terrain, the trees,
       * the roads or the traffic, and rebuilding those over the brush was what made the trees
       * blink.
       */
      painted() {
        zoneOverlay.rebuild(currentBuildableCells, zones, occupiedCells());
        scheduleAutosave();
      },
    },
    {
      buildingAt: (x, z) => buildings.buildingAt(x, z),
      vehicleAt: (x, z) => traffic.vehicleAt(x, z),
      vehicleByMesh: (name) => traffic.vehicleByMesh(name),
    },
    onSelect,
    "street",
    { beforeChange, afterChange },
    {
      roadCost: roadBuildCost,
      canSpend: (cost) => treasury.canSpend(cost),
      spend(cost, allowDebt) {
        const spent = spendBuild(cost, allowDebt);
        updateMoneyHud();
        return spent;
      },
      refund(amount) {
        treasury.earn(amount);
        updateMoneyHud();
      },
      money: () => treasury.money,
    },
    {
      building(status) {
        rubble.destroy(status.parcel);
        currentParcels = currentParcels.filter((parcel) => parcel !== status.parcel);
        syncBuildings();
        rebuild(parcelBounds(status.parcel));
        return true;
      },
    },
    {
      place: (role, kind, x, z) => Boolean(utilities.place(graph, role, kind, x, z)),
      removeAt(x, z) {
        const removed = utilities.removeNear(x, z, 10);
        if (removed) rebuild();
        return removed;
      },
      nearest: (x, z, within) => utilities.nearest(x, z, within),
      refresh: refreshUtilities,
    },
  );

  await seedDefaultDemoSave();
  const evacuateButton = document.getElementById("evacuate-run") as HTMLButtonElement;
  const callWaveButton = document.getElementById("call-wave") as HTMLButtonElement;
  const hardcoreBox = document.getElementById("hardcore-run") as HTMLInputElement;
  const kaijuBox = document.getElementById("kaiju-spawns") as HTMLInputElement;
  const instantBox = document.getElementById("instant-construction") as HTMLInputElement;
  const freeBuildBox = document.getElementById("free-building") as HTMLInputElement;
  const ignorePowerBox = document.getElementById("ignore-power") as HTMLInputElement;
  const ignoreWaterBox = document.getElementById("ignore-water") as HTMLInputElement;
  const gameplayNote = document.getElementById("gameplay-note") as HTMLSpanElement;
  const betweenRuns = document.getElementById("between-runs") as HTMLDivElement;
  const upgradeWeb = document.getElementById("upgrade-web") as HTMLSpanElement;
  const runOutcome = document.getElementById("run-outcome") as HTMLSpanElement;
  const newRunButton = document.getElementById("new-run") as HTMLButtonElement;
  const renderGameplayRules = (): void => {
    kaijuBox.checked = runState.rules.kaijuSpawns;
    instantBox.checked = runState.rules.instantConstruction;
    freeBuildBox.checked = runState.rules.freeBuilding;
    ignorePowerBox.checked = runState.rules.ignorePower;
    ignoreWaterBox.checked = runState.rules.ignoreWater;
    // Only say something when a switch has taken something away. Stating what the normal rules are
    // reads as an orphan sentence beside four checkboxes.
    gameplayNote.textContent = runState.rules.kaijuSpawns ? "" : "Pacifist: no waves, so no science and no prestige.";
    controls?.setToolEnabled("power", !runState.rules.ignorePower);
    controls?.setToolEnabled("water", !runState.rules.ignoreWater);
  };
  const setRunRules = (): void => {
    runState = { ...runState, rules: { kaijuSpawns: kaijuBox.checked, instantConstruction: instantBox.checked, freeBuilding: freeBuildBox.checked, ignorePower: ignorePowerBox.checked, ignoreWater: ignoreWaterBox.checked } };
    renderGameplayRules();
    syncBuildings();
    buildings.updateStates(currentBuildingStatuses);
    scheduleAutosave();
  };
  const renderUpgradeWeb = (): void => {
    upgradeWeb.replaceChildren(...FIRST_UPGRADE_WEB.map((upgrade) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${upgrade.name} ${upgrade.cost}`;
      button.title = upgrade.description;
      button.dataset.owned = String(profile.upgrades.includes(upgrade.id));
      button.addEventListener("click", () => {
        const next = buyUpgrade(profile, upgrade.id);
        if (next === profile) return showRefusal("Not enough prestige.");
        profile = next;
        writeProfile(profile);
        updateRunHud();
        renderUpgradeWeb();
      });
      return button;
    }));
    betweenRuns.hidden = !runState.ended;
    runOutcome.textContent = runState.ended === "evacuated" ? `Evacuated with ${Math.floor(runState.science)} science.`
      : runState.ended === "population_zero" ? "The island emptied."
      : runState.ended === "defeated" ? "The city fell." : "";
  };
  /** A new island: the same path a save takes, then framed on the kit the run opens with. */
  const startFreshRun = (): void => {
    loadCity(emptyCity());
    addStarterKit();
    rebuild();
    // The run panel and the banner both remember the run that just ended, and neither is refreshed
    // by loading a city. Without this, a new island opened still reading "The island emptied".
    renderUpgradeWeb();
    updateWave(0);
    applyCamera({ targetX: STARTER_KIT_AT.x + 150, targetY: 0, targetZ: STARTER_KIT_AT.z, alpha: -Math.PI / 2, beta: Math.PI / 3.4, radius: 520 });
  };
  const endRun = (): void => {
    setTimeRate(0);
    updateWave(0);
    updateRunHud();
    renderUpgradeWeb();
  };
  const finishByEvacuation = (): void => {
    if (runState.ended) return;
    runState = evacuate(runState);
    profile = carryScience(profile, runState);
    writeProfile(profile);
    writeAutosave(snapshot(true));
    endRun();
    showRefusal(`Evacuated with ${Math.floor(runState.science)} science. Start a new run when you are ready.`);
  };
  hardcoreBox.checked = profile.hardcore;
  hardcoreBox.addEventListener("change", () => {
    profile = { ...profile, hardcore: hardcoreBox.checked };
    writeProfile(profile);
  });
  for (const box of [kaijuBox, instantBox, freeBuildBox, ignorePowerBox, ignoreWaterBox]) box.addEventListener("change", setRunRules);
  renderGameplayRules();
  // The run is over and the city is frozen; the only useful thing left is the next island.
  newRunButton.addEventListener("click", () => {
    if (!window.confirm("Leave for a new island?")) return;
    startFreshRun();
  });
  evacuateButton.addEventListener("click", () => {
    if (!window.confirm("Evacuate this run?")) return;
    finishByEvacuation();
  });
  callWaveButton.addEventListener("click", () => {
    if (waveClock.active || runState.ended) return;
    if (!runState.rules.kaijuSpawns) return showRefusal("Pacifist mode pauses waves, science and prestige.");
    waveClock = callWaveNow(waveClock, waveThreat(runState.wave, cityEconomy.resources.population, currentParcels.length));
    waveCalledEarly = true;
    updateWave(0);
  });
  renderUpgradeWeb();

  controls = bindControls({
    onRoadMode(mode) {
      tool.setMode(mode);
      const drawingRoads = mode === "straight" || mode === "curve" || mode === "roundabout";
      const zoning = mode === "zone";
      buildings.setVisible(zoning ? false : buildingsVisible);
      buildings.setGridVisible(drawingRoads || zoning);
      buildings.setFaded(drawingRoads);
      zoneOverlay.setVisible(zoning);
    },
    onRoadType(type) {
      tool.setRoadType(type);
    },
    roadPrice: (type) => roadBuildCost(type, 1),
    onUtility: (kind, role) => tool.setUtility(kind, role),
    onWorldGrid: worldGrid.setVisible,
    onFps: setFpsVisible,
    onShadows: setShadowsEnabled,
    onLights(visible) {
      streetlights.setLightsEnabled(visible);
      traffic.setLightsEnabled(visible);
    },
    onLook: postFx.setLook,
    onFrameCap: setFrameCap,
    onTraffic: traffic.setEnabled,
    onTrafficDensity: traffic.setDensity,
    onGridSnap(enabled) {
      tool.setGridSnap(enabled);
    },
    onTreeSpecies(species) {
      tool.setTreeSpecies(species);
    },
    onSprayRadius(radius) {
      tool.setSprayRadius(radius);
    },
    onZoneKind(kind) {
      tool.setZoneKind(kind);
    },
    onZoneRadius(radius) {
      tool.setZoneRadius(radius);
    },
    onBuildings(visible) {
      buildingsVisible = visible;
      buildings.setVisible(visible);
    },
    onDecor(visible) {
      buildings.setDecor(visible);
    },
    onBoxes(boxes) {
      buildings.setDistant(boxes);
    },
    onSelectView(view) {
      // "Zones" swaps the models for the same taken/open grid a road-draw already shows,
      // so the ground itself reads as which cells are used without full 3D buildings in the way.
      // "Traffic" hides them outright -- the lane overlay is meant to be read from above, and a
      // building in the way defeats the point.
      buildings.setVisible(view === "all" ? buildingsVisible : view === "state");
      buildings.setGridVisible(view === "no-buildings");
      zoneOverlay.setVisible(view === "no-buildings");
      roads.setShowTraffic(view === "traffic");
      utilityOverlay.setVisible(view === "utilities");
      // The road surface, sidewalks and the streetlights standing on them fade back so the lane
      // overlay is the thing that actually reads.
      roads.setFaded(view === "traffic" || view === "utilities" || view === "state");
      streetlights.setFaded(view === "traffic" || view === "utilities" || view === "state");
    },
    onSunHour(hour) {
      setClockHour(hour);
    },
    onTimeRate: setTimeRate,
    onCameraMode(mode) {
      if (mode === "follow" && !followTarget) {
        showRefusal("Select a car before using Follow.");
        setCameraMode("free");
        return;
      }
      setCameraMode(mode);
    },
    onUndo: undo,
    onRedo: redo,
    canUndo: () => history.canUndo,
    canRedo: () => history.canRedo,
    onSave: () => snapshot(true),
    onLoad: loadCity,
    onNew: startFreshRun,
  });
  updateUndoRedo = controls.updateUndoRedo;
  updateUndoRedo();
  setTimeRate(0);

  function loadCity(city: CitySave): boolean {
    tool.cancel();
    try {
      // The terrain has to be pristine before the replay: node elevations were recorded against
      // the raw heightmap, and `rebuild` conforms it to the roads afterwards.
      applyTerrain(city.terrain === "rugged" ? "rugged" : "rolling");
      restoreCity(graph, plantings, zones, city, rubble, buildingLifecycle, treasury, cityEconomy, utilities);
    } catch (error) {
      showRefusal(`This city could not be loaded: ${(error as Error).message}`);
      return false;
    }
    history.clear();
    pendingHistorySnapshot = null;
    resetWave();
    lastTerms = undefined;
    runState = city.run ?? createRun();
    // Never restore a wave in progress. Nothing about the kaiju is saved -- not where it stands,
    // not what it was walking towards, not the missiles in the air -- so reloading rebuilt the plan
    // from a fresh seed and dropped a new monster on the other side of the island with the old
    // hit points. A reload puts the city back to just before the wave; the city is still big
    // enough to summon it, so it comes again.
    waveClock = { ...(city.waveClock ?? createWaveClock()), active: null };
    updateRunHud();
    renderGameplayRules();
    renderUpgradeWeb();
    // The replay does not cut the city into exactly the same lots, so both the zoning and the
    // buildings standing on it are moved onto the ones it did cut, before anything is drawn from
    // them. See `Zones.snapTo` and `BuildingLifecycle.snapTo`.
    const relaid = zones.snapTo(solveBuildableCells());
    const carried = buildingLifecycle.snapTo(
      parcelsForDemand(buildingParcels(solveBuildableCells(), zones), city.resources?.population ?? 0, city.elapsed ?? 0, (parcel) => buildingLifecycle.stateOf(parcel) !== undefined),
    );
    if (relaid || carried) showAlert(`${relaid} zoned lots and ${carried} buildings were re-laid onto the city as it came back.`);
    simSeconds = city.elapsed ?? 0;
    simDay = 1;
    setClockHour(city.hour);
    addOffshoreBridge();
    chargeConstructionStarts = false;
    rebuild();
    chargeConstructionStarts = true;
    if (city.camera) applyCamera(city.camera);
    updateUndoRedo();
    return true;
  }

  addOffshoreBridge();
  addStarterKit();
  rebuild();
  // Looking at the city, not at a patch of empty ground. Only "New island" framed the kit, so a
  // first load opened on whatever the default camera happened to point at.
  applyCamera({ targetX: STARTER_KIT_AT.x + 150, targetY: 0, targetZ: STARTER_KIT_AT.z, alpha: -Math.PI / 2, beta: Math.PI / 3.4, radius: 520 });
  updateRunHud();

  // Pick up where the last session stopped. A city the player never named is still their work.
  const resumed = readAutosave();
  if (resumed && loadCity(resumed)) controls!.applyCity(resumed);

  // Resumes wherever the camera was left, instead of snapping back to the default framing on
  // every reload -- a source edit already forces one of those more often than is comfortable.
  // Restored after the city loads: loading one reframes the camera on the fresh terrain, which
  // would otherwise overwrite this right back to the default.
  const savedCamera = readCameraState();
  if (savedCamera) applyCamera(savedCamera);
  showCompass(camera.alpha);
  scene.registerBeforeRender(() => {
    const dt = frameDelta() / 1000;
    const simDt = dt * timeRate;
    advanceClock(simDt);
    if (simDt > 0 && currentParcels.length) {
      // Only a working building produces or houses anyone. A lot that is rising, unstaffed or cut
      // off from power or water is a building the city paid for and does not yet have.
      lastTerms = cityEconomy.advance(workingParcels(), simDt);
      const nextRun = endIfPopulationZero(runState, cityEconomy.resources.population);
      if (nextRun !== runState) {
        runState = nextRun;
        updateRunHud();
      }
      syncBuildings();
      const income = incomePerSecond(cityEconomy.resources.population, currentBuildingStatuses);
      treasury.earn(income * simDt);
      updateMoneyHud();
      buildings.updateStates(currentBuildingStatuses);
      if (selectedInfo?.kind === "building") {
        const info = selectedInfo;
        const selected = currentBuildingStatuses.find((status) => samePosition(status.parcel.position, info));
        if (selected) showSelection((selectedInfo = { ...selectedInfo, state: selected.state, reason: selected.reason, progress: selected.progress, remainingSeconds: selected.remainingSeconds, staffed: selected.staffed }));
      }
    }
    updateWave(simDt);
    detail.update();
    postFx.update();
    if (fps.active && fps.frame(performance.now()) && stopFpsHud) showFps(fps.display);
    showCompass(camera.alpha);
    const selectedTarget = selectedInfo?.kind === "vehicle" ? selectedInfo.target() : null;
    if (selectedInfo?.kind === "vehicle" && selectedTarget) {
      const street = streetForSegment(graph, selectedTarget.segment.id).name;
      if (street !== selectedInfo.street) showSelection((selectedInfo = { ...selectedInfo, street }));
    }
    if (cameraMode === "orbit") {
      camera.alpha += (frameDelta() / 1000) * 0.22;
      return;
    }
    if (cameraMode !== "follow") return;
    // A wave outranks a selected car: while a kaiju is on the island it is what Follow follows.
    if (kaijuAssault && waveClock.active) {
      camera.target.set(kaijuAssault.position.x, heightmap.heightAt(kaijuAssault.position.x, kaijuAssault.position.z), kaijuAssault.position.z);
      return;
    }
    const target = selectedTarget ?? followTarget?.();
    if (!target) {
      showRefusal("Follow ended because the vehicle is gone.");
      setCameraMode("free");
      return;
    }
    camera.target.x += (target.x - camera.target.x) * 0.14;
    camera.target.y += (target.y - camera.target.y) * 0.14;
    camera.target.z += (target.z - camera.target.z) * 0.14;
    camera.alpha = approachAngle(camera.alpha, -target.heading - Math.PI / 2, dt * 3);
  });
  window.addEventListener("keydown", (event) => {
    if (!(event.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']") && event.code === "Space") {
      event.preventDefault();
      setPaused(!simPaused);
      return;
    }
    if (cameraMode !== "free" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) setCameraMode("free");
  }, true);
  let cameraSaveTimer = 0;
  camera.onViewMatrixChangedObservable.add(() => {
    if (cameraMode !== "free") return;
    window.clearTimeout(cameraSaveTimer);
    cameraSaveTimer = window.setTimeout(
      () =>
        writeCameraState(cameraSnapshot()),
      800,
    );
  });

  installDebugApi(scene, graph, rebuild, startedAt, () => ({
    segments: graph.allSegments().length,
    junctions: surfaceJunctions(),
    roundabouts: graph.allNodes().filter((node) => node.roundabout).length,
    buildings: buildings.count(),
    population: cityEconomy.resources.population,
    needs: buildingNeeds(currentParcels, cityEconomy.resources.population, projectedThreat()),
    avenues: graph.allSegments().filter((segment) => baseRoadTypeId(segment.type) === "avenue").length,
    tunnels: graph.allSegments().filter((segment) => roadType(segment.type).tunnelDepth !== undefined).length,
    cars: traffic.count(),
    signals: signals.count(),
    pedestrians: traffic.pedestrians(),
    streetlights: streetlights.count(),
    realStreetlights: streetlights.realLightCount(),
    trees: trees.count(),
    zones: zones.count(),
    rubble: rubble.count(),
    utilities: utilities.toJSON().length,
    buildingStates: stateCounts(),
    /** Why the lots that are not working are not working, which the state alone does not say. */
    buildingReasons: currentBuildingStatuses.reduce((counts, status) => {
      if (status.reason) counts[status.reason] = (counts[status.reason] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>),
    materialsShort: cityEconomy.materialsShort,
    // Which lots hold a shift, not how many: two lots can swap theirs without the count moving,
    // and that swap is two buildings changing colour on screen.
    staffedKey: currentBuildingStatuses.reduce((sum, status) => sum + (status.staffed ? Math.round(status.parcel.position.x) * 31 + Math.round(status.parcel.position.z) : 0), 0),
    money: treasury.money,
    income: incomePerSecond(cityEconomy.resources.population, currentBuildingStatuses),
    models: buildings.modelCount,
    startupModels: buildings.startupModelCount,
    activeMeshes: scene.getActiveMeshes().length,
    kaiju: kaiju.visible(),
    missiles: pendingMissiles.length,
    wave: waveVerdict ?? (waveClock.active ? "active" : "waiting"),
    waveHp: waveClock.active?.hitPoints ?? null,
    run: runState,
    profile,
    rules: runState.rules,
    timeRate,
    simDay,
    simHour: sunHour,
  }), { setWorldGridVisible: worldGrid.setVisible, measureFps });
  const debugApi = (window as unknown as { cityjump?: Record<string, unknown> }).cityjump ?? {};
  const debugReset = debugApi.reset as (() => void) | undefined;
  Object.assign(debugApi, {
    reset() {
      resetWave();
      runState = createRun();
      updateRunHud();
      renderGameplayRules();
      debugReset?.();
    },
    /** Paint a zone from a script, so zoning can be checked without driving the pointer. */
    zone(x: number, z: number, radius: number, kind: ZoneKind | null) {
      // The toolbar turns its "clear" button into a null before it gets here; a script calling
      // this directly should not be able to paint a zone kind the overlay has no colour for.
      if (kind !== null && !(kind in BUILDING_KIND_COLOR)) throw new Error(`unknown zone kind: ${kind}`);
      tool.paintZoneAt(x, z, radius, kind);
      return currentBuildableCells.filter((cell) => cell.zone).length;
    },
    buildingPoint: (nearX?: number, nearZ?: number) => buildings.buildingPoint(nearX, nearZ),
    vehiclePoint: () => traffic.vehiclePoint(),
    selectVehicle() {
      const target = traffic.firstVehicle();
      if (target) onSelect({ kind: "vehicle", name: target.kind, model: target.vehicle, street: streetForSegment(graph, target.segment.id).name, target: target.target });
      return Boolean(target);
    },
    paused: () => simPaused,
    setTimeRate,
    // For a check that has to click a car: a moving one is somewhere else by the time the click
    // lands, and on a slow machine somewhere else is half a street away.
    setPaused,
    setMoney: (money: number) => {
      treasury.replaceWith(money);
      updateMoneyHud();
    },
    /**
     * A grown city without playing one. Lot demand answers to elapsed time and to population, so a
     * scripted screenshot of a full city has to set both -- drawing roads and zoning them admits
     * two houses and nothing else.
     */
    growCity(seconds: number, population: number) {
      simSeconds = seconds;
      cityEconomy.replaceWith({ ...cityEconomy.resources, population });
      chargeConstructionStarts = false;
      rebuild();
      chargeConstructionStarts = true;
      return { buildings: currentParcels.length };
    },
    setRunRules(rules: Partial<typeof runState.rules>) {
      runState = { ...runState, rules: { ...runState.rules, ...rules } };
      renderGameplayRules();
      syncBuildings();
      buildings.updateStates(currentBuildingStatuses);
      return runState.rules;
    },
    measureBuildingStateChange() {
      const started = performance.now();
      simSeconds += BUILDING_STAGE_SECONDS;
      syncBuildings();
      buildings.updateStates(currentBuildingStatuses);
      return { buildings: currentParcels.length, ms: performance.now() - started, states: stateCounts() };
    },
    measureWaveCost(maxSeconds = 90) {
      const started = performance.now();
      if (!waveClock.active) {
        waveClock = callWaveNow(waveClock, waveThreat(runState.wave, cityEconomy.resources.population, currentParcels.length));
        startWave("debug");
      }
      const rubbleBefore = rubble.count();
      for (let elapsed = 0; waveClock.active && !waveVerdict && elapsed < maxSeconds && rubble.count() === rubbleBefore; elapsed += 0.25) updateWave(0.25);
      return { ms: performance.now() - started, rubble: rubble.count() - rubbleBefore, wave: waveVerdict ?? (waveClock.active ? "active" : "waiting") };
    },
    forceWave(seconds = 0) {
      waveClock = callWaveNow(waveClock, waveThreat(runState.wave, cityEconomy.resources.population, currentParcels.length));
      startWave("debug");
      waveClock = { ...waveClock, elapsedSeconds: waveClock.active ? waveClock.active.startedAtSeconds + seconds : waveClock.elapsedSeconds };
      if (seconds > 0) updateWave(seconds);
    },
    forceHeldWave() {
      if (!waveClock.active) {
        waveClock = callWaveNow(waveClock, waveThreat(runState.wave, cityEconomy.resources.population, currentParcels.length));
        startWave("debug");
      }
      waveClock = damageWaveClock(waveClock, WAVE_STARTING_VALUES.kaijuHitPoints);
      finishWave("held");
    },
    evacuateRun() {
      finishByEvacuation();
      return { run: runState, profile };
    },
  });

  function surfaceJunctions(): number {
    return graph
      .allNodes()
      .filter((node) => [...node.segments].filter((id) => !roadType(graph.segment(id).type).tunnelDepth).length >= 3).length;
  }

  /** A lot's identity across re-packs: where it stands. */
  function parcelId(parcel: BuildingParcel): string {
    return `${Math.round(parcel.position.x)}:${Math.round(parcel.position.z)}`;
  }

  function parcelBounds(parcel: BuildingParcel): TerrainBounds {
    const points = parcel.cells.flatMap((cell) => cell.corners);
    return {
      minX: Math.min(...points.map((point) => point.x)) - 16,
      maxX: Math.max(...points.map((point) => point.x)) + 16,
      minZ: Math.min(...points.map((point) => point.z)) - 16,
      maxZ: Math.max(...points.map((point) => point.z)) + 16,
    };
  }

  function samePosition(a: { x: number; z: number }, b: { x: number; z: number }): boolean {
    return Math.abs(a.x - b.x) < 0.01 && Math.abs(a.z - b.z) < 0.01;
  }
}

async function seedDefaultDemoSave(): Promise<void> {
  if (readSave("Demo")) return;
  try {
    const response = await fetch("/default-demo.json", { cache: "no-cache" });
    if (!response.ok) return;
    const city = parseCity(await response.text());
    if (city) writeSave("Demo", city);
  } catch {
    // Offline/dev-file runs still work; they just start without the bundled save.
  }
}
