import { createBuildingRenderer } from "../render/buildings";
import { createDestructionEffects } from "../render/destructionEffects";
import { installDebugApi } from "../render/debugApi";
import { createDrawTool, TREE_REACH } from "../render/drawTool";
import { createGround, createOcean, createWorldGrid, GROUND_CELL, GROUND_SIZE, OFFSHORE_ISLAND_RADIUS, OFFSHORE_ISLAND_Z, offshoreIslandHeight } from "../render/ground";
import { createKaijuRenderer } from "../render/kaiju";
import { createMissileRenderer } from "../render/missiles";
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
import { admittedParcels, parcelBounds, parcelId, samePosition } from "./cityRebuild";
import { applyCamera as applyCameraState, cameraSnapshot as snapshotCamera, createAutosave } from "./persistence";
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
import { advanceKaijuAssault, createKaijuAssault, kaijuPositionAt, type KaijuAssaultState, type KaijuPlan } from "../sim/kaiju";
import { baseRoadTypeId, roadType } from "../sim/roadTypes";
import { missingUtility, suppliedDiffusers, UTILITY_CATALOG, Utilities } from "../sim/utilities";
import { buildableCells, lotsWithin, parcelDemandLimits, type BuildableCell, type BuildingParcel } from "../sim/slots";
import { parseCity, serializeCity, restoreCity, SAVE_VERSION, type CitySave, type SavedCamera } from "../sim/save";
import { carryScience, createRun, endIfPopulationZero, evacuate, startingMoney, startingResources, type ProfileState, type RunState } from "../sim/run";
import { streetForSegment } from "../sim/streets";
import { setTerrain } from "../sim/terrain";
import { approachAngle } from "../sim/transfers";
import { RULES } from "../sim/rules";
import { distXZ, v3 } from "../sim/vec";
import { advanceWaveClock, callWaveNow, createWaveClock, damageWaveClock, missileTravelSeconds, residentsUntilWave, summonIfDue, waveAtPopulation, waveThreat, WAVE_STARTING_VALUES } from "../sim/wave";
import type { FollowTarget, SelectionInfo } from "../render/drawTool";
import { bindControls } from "../ui/controls";
import { deleteRunSaveOnDefeat, readAutosave, readSave, writeAutosave, writeCameraState, writeSave, readCameraState, readSettings, readProfile, writeProfile } from "../ui/saves";
import { createDetailCuller } from "../render/detail";
import { createPostFx } from "../render/postFx";
import { DEFAULT_HOUR, streetlightsOnAt } from "../sim/time";
import { showAlert, showCityStats, showCompass, showFps, showMoney, showRefusal, showRunStats, showSelection, showWaveBanner } from "../ui/hud";
import { bindRunPanel, type RunPanel } from "../ui/runPanel";
import { clearWaveVisuals, createWavePlan, rebuildMissileTrails, settleWaveOutcome, type PendingMissile, type WaveVerdict } from "./waveLoop";
import { createDrawController } from "./drawController";

/** The island a run opens on. Exported from the game, so the layout is edited by playing it. */
const STARTER_KIT_URL = "/starter-kit.json";

type CameraMode = "free" | "orbit" | "follow";
type TimeRate = 0 | 1 | 2 | 4;

// ponytail: module-size is the composition root owning the live scene graph; split only when a
// closed lifecycle slice can move with its timers, observers, persistence and renderer calls.
export async function startApp(startedAt = performance.now()): Promise<{ dispose(): void }> {
  const canvas = document.getElementById("app") as HTMLCanvasElement;
  const renderScene = createScene(canvas);
  const { scene, camera, shadows, setSunHour, setShadowsEnabled, invalidateShadows, setFrameCap, frameDelta } = renderScene;
  const detail = createDetailCuller(scene, camera);
  const postFx = createPostFx(scene, camera);
  const heightmap = new Heightmap({ size: GROUND_SIZE, cell: GROUND_CELL, generator: rollingHills() });
  setTerrain(heightmap);
  const frameTerrain = (): void => {
    camera.target.y = heightmap.heightAt(0, 0);
  };
  frameTerrain();

  const graph = new RoadGraph((x, z) => heightmap.heightAt(x, z));
  const plantings = new Plantings();
  const zones = new Zones();
  const rubble = new Rubble();
  const utilities = new Utilities();
  const buildingLifecycle = new BuildingLifecycle();
  let profile: ProfileState = readProfile();
  const treasury = new Treasury(startingMoney(profile));
  const cityEconomy = new CityEconomy(startingResources(profile, new CityEconomy().resources));
  const history = createCityHistory<CitySave>(20);
  const ocean = createOcean(scene);
  const ground = createGround(scene, heightmap);
  const worldGrid = createWorldGrid(scene, heightmap);
  const roads = createRoadRenderer(scene, graph, (x, z) => heightmap.heightAt(x, z));
  const traffic = createTrafficRenderer(scene, graph, frameDelta, (x, z) => heightmap.heightAt(x, z));
  const fps = createFpsMeter();
  const signals = createSignalRenderer(scene, graph, frameDelta);
  const streetlights = createStreetlightRenderer(scene, graph);
  const trees = createTreeRenderer(scene, heightmap, graph, shadows, plantings);
  const zoneOverlay = createZoneRenderer(scene);
  const utilityOverlay = createUtilityRenderer(scene, graph, utilities, (x, z) => heightmap.heightAt(x, z));
  const rubbleRenderer = createRubbleRenderer(scene, (x, z) => heightmap.heightAt(x, z));
  const destructionEffects = createDestructionEffects(scene, (x, z) => heightmap.heightAt(x, z));
  const kaiju = createKaijuRenderer(scene, shadows);
  const missiles = createMissileRenderer(scene);
  const waveMarkers = createWaveMarkerRenderer(scene, (x, z) => heightmap.heightAt(x, z));
  const buildings = await createBuildingRenderer(scene, graph, shadows, (x, z) => heightmap.heightAt(x, z));
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
  /**
   * The landward node sits on the ground, not above it.
   *
   * It used to be lifted fourteen metres to clear the water, which left the deck stopping in mid
   * air over solid land: `conformToRoads` skips an elevated segment, so no ground ever rose to
   * meet it. Worse for the player, a road drawn off that node started at the deck's height while
   * every interior sample followed the terrain -- `buildSamples` forces `heights[0]` to the node --
   * so it began with a fourteen-metre step rather than a slope, and `validateSegment` could not
   * refuse it because the gradient guard samples the terrain along the curve and never compares
   * the start node against the ground beneath it.
   *
   * The span still clears the sea without the lift: `buildSamples` holds an elevated segment's
   * interior samples at `heightAt + ELEVATED_CLEARANCE`, and the deck stays far enough above the
   * water for `isElevatedBridge` to keep giving it piers, pylons and cables.
   */
  const addOffshoreBridge = (): void => {
    for (const segment of graph.allSegments()) {
      if (segment.type === "highway_2lane" && Math.max(graph.node(segment.a).pos.z, graph.node(segment.b).pos.z) > GROUND_SIZE / 2) graph.removeSegment(segment.id);
    }
    const islandZ = OFFSHORE_ISLAND_Z - OFFSHORE_ISLAND_RADIUS * 0.72;
    // Whatever already reaches the landfall keeps the junction. `addNodeAt` never dedupes, so
    // building one unconditionally left the deck's node sitting on top of the road's node without
    // touching it -- one network for the bridge, another for the city, and no way across a joint
    // that looked joined. Measured on a city with a road drawn up to here: two nodes at the same
    // metre, components of 13 and 2.
    const main = graph.nearestNode(-360, 1500, RULES.nodeSnapRadius)?.id
      ?? graph.addNodeAt(v3(-360, heightmap.baseHeightAt(-360, 1500), 1500));
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
      currentParcels = admittedParcels(currentBuildableCells, zones, cityEconomy.resources.population, simSeconds, (parcel) => buildingLifecycle.stateOf(parcel) !== undefined).filter((parcel) => !rubble.blocks(parcel) || buildingLifecycle.stateOf(parcel) === "rebuilding");
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
    measure("rubble", () => {
      const savedRubble = rubble.toJSON();
      rubbleRenderer.rebuild(savedRubble);
      destructionEffects.rebuildFires(savedRubble, performance.now() / 1000);
    });
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
    currentParcels = admittedParcels(currentBuildableCells, zones, cityEconomy.resources.population, simSeconds, (parcel) => buildingLifecycle.stateOf(parcel) !== undefined).filter((parcel) => !rubble.blocks(parcel) || buildingLifecycle.stateOf(parcel) === "rebuilding");
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
  /** The cells a standing building covers, so the zone overlay can shade taken land. */
  const occupiedCells = (): Set<string> => {
    const keys = new Set<string>();
    for (const parcel of currentParcels) for (const cell of parcel.cells) keys.add(cellKey(cell));
    return keys;
  };
  let utilitySnapshot: { revision: number; supplied: Set<string>; diffusers: ReturnType<Utilities["diffusers"]> } | null = null;
  const currentUtilitySnapshot = (): NonNullable<typeof utilitySnapshot> => {
    if (utilitySnapshot?.revision === graph.revision) return utilitySnapshot;
    const diffusers = utilities.diffusers();
    utilitySnapshot = { revision: graph.revision, diffusers, supplied: suppliedDiffusers(graph, utilities.producers(), diffusers) };
    return utilitySnapshot;
  };
  const currentSuppliedUtilities = (): Set<string> => currentUtilitySnapshot().supplied;
  const syncBuildings = (): void => {
    const residents = cityEconomy.resources.population;
    const { supplied, diffusers } = currentUtilitySnapshot();
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
    if (clearedRubble) {
      const savedRubble = rubble.toJSON();
      rubbleRenderer.rebuild(savedRubble);
      destructionEffects.rebuildFires(savedRubble, performance.now() / 1000);
      detail.invalidate();
    }
    const income = incomePerSecond(residents, currentBuildingStatuses);
    // A city that has not ticked yet still has stocks worth reading. Without this the ledger sat
    // empty after every load and every refresh, until the player pressed play.
    lastTerms ??= cityEconomy.advance(currentBuildingStatuses, 0);
    showCityStats(residents, buildingNeeds(currentBuildingStatuses.filter((status) => status.state !== "rebuilding").map((status) => status.parcel), residents, projectedThreat()), cityEconomy.resources, { ...lastTerms, trade: income });
    showMoney(treasury.money, income, stateCounts());
  };
  const refreshUtilities = (): void => {
    syncBuildings();
    buildings.updateStates(currentBuildingStatuses);
    utilityOverlay.rebuild(currentSuppliedUtilities());
    scheduleAutosave();
  };
  let sunHour = DEFAULT_HOUR;
  let sunMinute = -1;
  const displayedMinute = (hour: number): number => Math.round((((hour % 24) + 24) % 24) * 60) % (24 * 60);
  const setClockHour = (hour: number, force = false): void => {
    sunHour = ((hour % 24) + 24) % 24;
    const minute = displayedMinute(sunHour);
    if (force || minute !== sunMinute) {
      sunMinute = minute;
      setSun(sunHour);
    }
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

  const cameraSnapshot = (): SavedCamera => snapshotCamera(camera);
  const applyCamera = (state: SavedCamera): void => applyCameraState(camera, state);
  const scheduleAutosave = createAutosave(
    () => {
      // The wave itself is not written -- nothing about a kaiju can be, and a reload puts the city
      // back to just before one anyway.
      const saved = { ...waveClock, active: null };
      return serializeCity(graph, plantings, zones, terrainPreset, sunHour, cameraSnapshot(), rubble, buildingLifecycle, treasury, cityEconomy, utilities, runState, saved, simSeconds);
    },
    writeAutosave,
    () => showRefusal("Autosave could not be written. Browser storage may be full or disabled."),
  );

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
  const fpsMeasurements = new Map<number, { stop(): void; resolve(fps: number): void }>();
  const measureFps = (ms: number): Promise<number> => {
    const stop = fps.watch();
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        fpsMeasurements.delete(timer);
        const measured = fps.display;
        stop();
        resolve(measured);
      }, ms);
      fpsMeasurements.set(timer, { stop, resolve });
    });
  };
  const startWave = (seed = String(Math.round(waveClock.elapsedSeconds))): void => {
    const planned = createWavePlan(seed, currentParcels);
    kaijuPlan = planned.plan;
    pendingMissiles = [];
    kaijuAssault = null;
    nextSalvoAt = 0;
    waveVerdict = null;
    waveVerdictUntil = 0;
  };
  const finishWave = (verdict: WaveVerdict): void => {
    waveVerdict = verdict;
    waveVerdictUntil = waveClock.elapsedSeconds + 3;
    const next = settleWaveOutcome(runState, waveClock, verdict, waveCalledEarly, cityEconomy.resources.population);
    runState = next.run;
    waveClock = next.clock;
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
    pendingMissiles = [];
    clearWaveVisuals({ kaiju, missiles, markers: waveMarkers });
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
    clearWaveVisuals({ kaiju, missiles, markers: waveMarkers });
  };
  /**
   * The island a run opens on, as data rather than as code.
   *
   * It used to be built here: one street, three district rectangles and six utilities. A layout
   * worth playing needs a roundabout, avenues, pedestrian paths and a thousand lots zoned block by
   * block, and none of that is worth expressing as coordinates in a source file. So the operator
   * designs it by playing, exports the city, and drops it in as `public/starter-kit.json`.
   *
   * Only the design is read. Money, resources, the run, the clock, rubble and building state all
   * come from `emptyCity()`, so an export taken mid-session cannot smuggle its treasury or the
   * gravel a kaiju left into a fresh island -- the fields simply are not looked at.
   */
  const readStarterKit = async (): Promise<CitySave | null> => {
    try {
      const response = await fetch(STARTER_KIT_URL, { cache: "no-cache" });
      if (!response.ok) return null;
      return parseCity(await response.text());
    } catch {
      return null;
    }
  };
  /** The design fields only, over a fresh island. A missing or unreadable kit leaves bare ground. */
  const starterCity = (kit: CitySave | null): CitySave =>
    kit
      ? { ...emptyCity(), terrain: kit.terrain, nodes: kit.nodes, segments: kit.segments, zones: kit.zones, planted: kit.planted, ...(kit.camera ? { camera: kit.camera } : {}) }
      : emptyCity();
  /**
   * Power and water for the lots the kit opens with, spread over the roads it actually drew.
   *
   * Kept in code rather than in the asset because it is a rule about playability, not part of the
   * layout: a building without power does not work, a city where nothing works grows no food, and
   * utilities are a system to extend rather than a first lesson to fail. Derived from the kit's own
   * geometry so a redesigned layout is still served without anyone editing coordinates.
   */
  const addStarterUtilities = (): void => {
    const zoned = zones.toJSON();
    if (!zoned.length) return;
    const centre = { x: zoned.reduce((sum, z) => sum + z[0], 0) / zoned.length, z: zoned.reduce((sum, z) => sum + z[1], 0) / zoned.length };
    // Midpoints, so every candidate is on a road by construction and `place` has something to snap to.
    const midpoints = graph
      .allSegments()
      .filter((segment) => !segment.elevated && !roadType(segment.type).tunnelDepth)
      .map((segment) => graph.pointAt(segment.id, segment.length / 2).position)
      .sort((a, b) => distXZ(a, v3(centre.x, a.y, centre.z)) - distXZ(b, v3(centre.x, b.y, centre.z)));
    // Surface roads only -- a power plant does not belong on a bridge deck -- but never nothing:
    // a kit drawn entirely of elevated road would otherwise open with no utilities at all.
    if (!midpoints.length) return;
    // One producer at the heart of the zoning, then diffusers pushed apart so their discs tile the
    // district instead of stacking on the same block.
    const spread = UTILITY_CATALOG.power.diffuser.radius * 1.4;
    const chosen: typeof midpoints = [];
    for (const point of midpoints) {
      if (chosen.length >= 4) break;
      if (chosen.every((taken) => distXZ(taken, point) >= spread)) chosen.push(point);
    }
    for (const kind of ["power", "water"] as const) {
      utilities.place(graph, "producer", kind, midpoints[0]!.x, midpoints[0]!.z);
      for (const point of chosen) utilities.place(graph, "diffuser", kind, point.x, point.z);
    }
  };
  const updateWave = (dt: number): void => {
    // A finished run is finished. Without this the clock kept running over a dead city, gathered
    // the next wave and sent the kaiju back in -- and evacuating did nothing a player could see.
    if (runState.ended) {
      kaijuPlan = null;
      kaijuAssault = null;
      pendingMissiles = [];
      clearWaveVisuals({ kaiju, missiles, markers: waveMarkers });
      showWaveBanner(runState.ended === "evacuated" ? `Evacuated with ${Math.floor(runState.science)} science` : runState.ended === "population_zero" ? "The island emptied" : "The city fell", runState.ended === "evacuated" ? "held" : "breached");
      return;
    }
    if (!runState.rules.kaijuSpawns) {
      kaijuPlan = null;
      kaijuAssault = null;
      pendingMissiles = [];
      clearWaveVisuals({ kaiju, missiles, markers: waveMarkers });
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
      clearWaveVisuals({ kaiju, missiles, markers: waveMarkers });
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
    const batteries = batteriesForParcels(livingBuildings.map((status) => status.parcel), cityEconomy.resources.population, (parcel) => buildingLifecycle.staffedOf(parcel));
    if (seconds >= nextSalvoAt) {
      pendingMissiles.push(...batteriesInRange(batteries, position).map((battery, index) => {
        const launchedAt = seconds + index * 0.22;
        return {
          from: battery.position,
          launchedAt,
          impactAt: launchedAt + missileTravelSeconds(distXZ(battery.position, position)),
          damage: battery.damage,
        };
      }));
      nextSalvoAt = seconds + WAVE_STARTING_VALUES.reloadSeconds;
    }
    const hits = pendingMissiles.filter((missile) => missile.impactAt <= seconds);
    if (hits.length) waveClock = damageWaveClock(waveClock, hits.reduce((sum, missile) => sum + missile.damage, 0));
    pendingMissiles = pendingMissiles.filter((missile) => missile.impactAt > seconds);
    rebuildMissileTrails(missiles, pendingMissiles, hits, position, seconds);
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
    destructionEffects.explode(hit.position, performance.now() / 1000);
    detail.invalidate();
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
    setClockHour(sunHour, true);
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
  const drawController = createDrawController(graph, {
    roadCost: roadBuildCost,
    spend(cost, allowDebt) {
      const spent = spendBuild(cost, allowDebt);
      updateMoneyHud();
      return spent;
    },
    refund(amount) {
      treasury.earn(amount);
      updateMoneyHud();
    },
    onCommitted: rebuild,
  });

  const tool = createDrawTool(
    scene,
    graph,
    ground.mesh,
    (x, z) => heightmap.heightAt(x, z),
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
        plantings.clear(tree.x, tree.z, true);
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
        const removed = utilities.removeNear(graph, x, z, 10);
        if (removed) rebuild();
        return removed;
      },
      nearest: (x, z, within) => utilities.nearest(x, z, within),
      refresh: refreshUtilities,
    },
    drawController,
  );

  await seedDefaultDemoSave();
  let runPanel: RunPanel;
  const applyRunRuleEffects = (): void => {
    syncBuildings();
    buildings.updateStates(currentBuildingStatuses);
    scheduleAutosave();
  };
  /**
   * A new island: the same path a save takes, since the kit now is one.
   *
   * `loadCity` restores the roads and the zoning, re-lays them onto the lots the replay actually
   * cut, joins the bridge to whatever reaches the landfall and frames the camera the kit was
   * exported with. The utilities go on afterwards, over the roads it just drew, and need the
   * second rebuild to be seen.
   */
  const startFreshRun = async (): Promise<void> => {
    loadCity(starterCity(await readStarterKit()));
    addStarterUtilities();
    rebuild();
    // The run panel and the banner both remember the run that just ended, and neither is refreshed
    // by loading a city. Without this, a new island opened still reading "The island emptied".
    runPanel.renderUpgradeWeb();
    updateWave(0);
  };
  const endRun = (): void => {
    setTimeRate(0);
    updateWave(0);
    updateRunHud();
    runPanel.renderUpgradeWeb();
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
  runPanel = bindRunPanel({
    getRun: () => runState,
    setRun: (run) => {
      runState = run;
    },
    getProfile: () => profile,
    setProfile: (next) => {
      profile = next;
      writeProfile(profile);
    },
    updateRunHud,
    onRulesChanged: applyRunRuleEffects,
    onNewRun: startFreshRun,
    onEvacuate: finishByEvacuation,
    onCallWave() {
      if (waveClock.active || runState.ended) return;
      if (!runState.rules.kaijuSpawns) return showRefusal("Pacifist mode pauses waves, science and prestige.");
      waveClock = callWaveNow(waveClock, waveThreat(runState.wave, cityEconomy.resources.population, currentParcels.length));
      waveCalledEarly = true;
      updateWave(0);
    },
    setToolEnabled: (tool, enabled) => controls?.setToolEnabled(tool, enabled),
    showRefusal,
  });

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
      setClockHour(hour, true);
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
    runPanel.renderGameplayRules();
    runPanel.renderUpgradeWeb();
    // The replay does not cut the city into exactly the same lots, so both the zoning and the
    // buildings standing on it are moved onto the ones it did cut, before anything is drawn from
    // them. See `Zones.snapTo` and `BuildingLifecycle.snapTo`.
    const relaid = zones.snapTo(solveBuildableCells());
    const carried = buildingLifecycle.snapTo(
      admittedParcels(solveBuildableCells(), zones, city.resources?.population ?? 0, city.elapsed ?? 0, (parcel) => buildingLifecycle.stateOf(parcel) !== undefined),
    );
    if (relaid || carried) showAlert(`${relaid} zoned lots and ${carried} buildings were re-laid onto the city as it came back.`);
    simSeconds = city.elapsed ?? 0;
    simDay = 1;
    setClockHour(city.hour, true);
    addOffshoreBridge();
    chargeConstructionStarts = false;
    rebuild();
    chargeConstructionStarts = true;
    if (city.camera) applyCamera(city.camera);
    updateUndoRedo();
    return true;
  }

  // Pick up where the last session stopped. A city the player never named is still their work; only
  // when there is nothing to resume does the island open fresh, which is also what spares the
  // starter-kit fetch on every reload of a city already in progress.
  const resumed = readAutosave();
  if (resumed && loadCity(resumed)) controls!.applyCity(resumed);
  else await startFreshRun();
  updateRunHud();

  // Resumes wherever the camera was left, instead of snapping back to the default framing on
  // every reload -- a source edit already forces one of those more often than is comfortable.
  // Restored after the city loads: loading one reframes the camera on the fresh terrain, which
  // would otherwise overwrite this right back to the default.
  const savedCamera = readCameraState();
  if (savedCamera) applyCamera(savedCamera);
  showCompass(camera.alpha);
  const appFrameObserver = scene.onBeforeRenderObservable.add(() => {
    const dt = frameDelta() / 1000;
    const simDt = dt * timeRate;
    advanceClock(simDt);
    if (simDt > 0 && currentParcels.length) {
      // Only a working building produces or houses anyone. A lot that is rising, unstaffed or cut
      // off from power or water is a building the city paid for and does not yet have.
      lastTerms = cityEconomy.advance(currentBuildingStatuses, simDt);
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
        if (selected) {
          selectedInfo = { ...selectedInfo, state: selected.state, reason: selected.reason, progress: selected.progress, remainingSeconds: selected.remainingSeconds, staffed: selected.staffed };
          showSelection(selectedInfo);
        }
      }
    }
    updateWave(simDt);
    destructionEffects.step(performance.now() / 1000);
    detail.update();
    postFx.update();
    if (fps.active && fps.frame(performance.now()) && stopFpsHud) showFps(fps.display);
    showCompass(camera.alpha);
    const selectedTarget = selectedInfo?.kind === "vehicle" ? selectedInfo.target() : null;
    if (selectedInfo?.kind === "vehicle" && selectedTarget) {
      const street = streetForSegment(graph, selectedTarget.segment.id).name;
      if (street !== selectedInfo.street) {
        selectedInfo = { ...selectedInfo, street };
        showSelection(selectedInfo);
      }
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
  const keydown = (event: KeyboardEvent): void => {
    if (!(event.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']") && event.code === "Space") {
      event.preventDefault();
      setPaused(!simPaused);
      return;
    }
    if (cameraMode !== "free" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) setCameraMode("free");
  };
  window.addEventListener("keydown", keydown, true);
  let cameraSaveTimer = 0;
  const cameraSaveObserver = camera.onViewMatrixChangedObservable.add(() => {
    if (cameraMode !== "free") return;
    window.clearTimeout(cameraSaveTimer);
    cameraSaveTimer = window.setTimeout(
      () =>
        writeCameraState(cameraSnapshot()),
      800,
    );
  });

  const debugApi = installDebugApi(scene, graph, rebuild, startedAt, () => ({
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
  }), { controller: drawController, setWorldGridVisible: worldGrid.setVisible, measureFps, extra: (debugApi) => ({
    reset() {
      resetWave();
      runState = createRun();
      updateRunHud();
      runPanel.renderGameplayRules();
      debugApi.reset();
    },
    /** Paint a zone from a script, so zoning can be checked without driving the pointer. */
    zone(x: number, z: number, radius: number, kind: ZoneKind | null) {
      // The toolbar turns its "clear" button into a null before it gets here; a script calling
      // this directly should not be able to paint a zone kind the overlay has no colour for.
      if (kind !== null && !(kind in BUILDING_KIND_COLOR)) throw new Error(`unknown zone kind: ${kind}`);
      tool.paintZoneAt(x, z, radius, kind);
      return currentBuildableCells.filter((cell) => cell.zone).length;
    },
    zonePoints(kind: ZoneKind) {
      const centreOf = (cell: (typeof currentBuildableCells)[number]) => {
        const sum = cell.corners.reduce((point, corner) => ({ x: point.x + corner.x, y: point.y + corner.y, z: point.z + corner.z }), v3(0, 0, 0));
        return { x: sum.x / cell.corners.length, y: sum.y / cell.corners.length, z: sum.z / cell.corners.length };
      };
      return currentBuildableCells.filter((cell) => cell.zone === kind).map(centreOf);
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
      runPanel.renderGameplayRules();
      applyRunRuleEffects();
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
  }) });

  function surfaceJunctions(): number {
    return graph
      .allNodes()
      .filter((node) => [...node.segments].filter((id) => !roadType(graph.segment(id).type).tunnelDepth).length >= 3).length;
  }

  return {
    dispose(): void {
      scene.onBeforeRenderObservable.remove(appFrameObserver);
      window.removeEventListener("keydown", keydown, true);
      camera.onViewMatrixChangedObservable.remove(cameraSaveObserver);
      window.clearTimeout(cameraSaveTimer);
      window.clearTimeout(buildingRebuildTimer);
      for (const [timer, measurement] of fpsMeasurements) {
        window.clearTimeout(timer);
        measurement.stop();
        measurement.resolve(fps.display);
      }
      fpsMeasurements.clear();
      scheduleAutosave.dispose();
      debugApi.dispose();
      controls?.dispose();
      runPanel.dispose();
      tool.dispose();
      buildings.dispose();
      waveMarkers.dispose();
      missiles.dispose();
      kaiju.dispose();
      destructionEffects.dispose();
      rubbleRenderer.dispose();
      utilityOverlay.dispose();
      zoneOverlay.dispose();
      trees.dispose();
      streetlights.dispose();
      signals.dispose();
      traffic.dispose();
      roads.dispose();
      worldGrid.dispose();
      ground.dispose();
      ocean.dispose();
      postFx.dispose();
      detail.dispose();
      renderScene.dispose();
    },
  };
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
