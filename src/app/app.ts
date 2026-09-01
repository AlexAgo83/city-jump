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
import { createZoneRenderer } from "../render/zones";
import { RoadGraph } from "../sim/graph";
import { BUILDING_STAGE_SECONDS, BuildingLifecycle, type BuildingStatus } from "../sim/buildingLifecycle";
import { CityEconomy, STARTING_MONEY, Treasury, incomePerSecond, roadBuildCost, type CityTerms } from "../sim/economy";
import { Plantings } from "../sim/plantings";
import { Rubble } from "../sim/rubble";
import { Zones } from "../sim/zones";
import { batteriesForParcels, batteriesInRange, firepowerPerMinute } from "../sim/batteries";
import { buildingNeeds } from "../sim/buildingKinds";
import { Heightmap, rollingHills, SEA_LEVEL, type TerrainBounds } from "../sim/heightmap";
import { createCityHistory } from "../sim/history";
import { allJunctions } from "../sim/junction";
import { kaijuPositionAt, planKaiju, type KaijuPlan } from "../sim/kaiju";
import { baseRoadTypeId, roadType } from "../sim/roadTypes";
import { missingUtility, suppliedDiffusers, Utilities } from "../sim/utilities";
import { buildableCellCentre, buildingParcels, buildableCells, parcelsForDemand, GRID, type BuildableCell, type BuildingParcel } from "../sim/slots";
import { parseCity, serializeCity, restoreCity, SAVE_VERSION, type CitySave, type SavedCamera } from "../sim/save";
import { streetForSegment } from "../sim/streets";
import { setTerrain } from "../sim/terrain";
import { approachAngle } from "../sim/transfers";
import { distXZ, v3 } from "../sim/vec";
import { advanceWaveClock, createWaveClock, damageWaveClock, waveCountdownSeconds, WAVE_STARTING_VALUES } from "../sim/wave";
import type { FollowTarget, SelectionInfo } from "../render/drawTool";
import { bindControls } from "../ui/controls";
import { readAutosave, readSave, writeAutosave, writeCameraState, writeSave, readCameraState, readSettings } from "../ui/saves";
import { createDetailCuller } from "../render/detail";
import { createPostFx } from "../render/postFx";
import { DEFAULT_HOUR, streetlightsOnAt } from "../render/streetlights";
import { showCityStats, showCompass, showFps, showMoney, showRefusal, showSelection, showWaveBanner } from "../ui/hud";

type CameraMode = "free" | "orbit" | "follow";
type WaveVerdict = "held" | "breached";
type TimeRate = 0 | 1 | 2 | 4;
type PendingMissile = MissileTrail & { readonly impactAt: number; readonly damage: number };

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
  const treasury = new Treasury();
  const cityEconomy = new CityEconomy();
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
      currentBuildableCells = buildableCells(graph, zones);
      currentParcels = parcelsForDemand(buildingParcels(currentBuildableCells, zones), cityEconomy.resources.population, simSeconds).filter((parcel) => !rubble.blocks(parcel) || buildingLifecycle.stateOf(parcel) === "rebuilding");
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
    measure("zones", () => zoneOverlay.rebuild(zones));
    measure("rubble", () => rubbleRenderer.rebuild(rubble.toJSON()));
    measure("utilities", () => utilityOverlay.rebuild(currentSuppliedUtilities()));
    if (dirty) scheduleBuildingRebuild();
    else measure("buildings", () => buildings.rebuild(currentBuildableCells, currentBuildingStatuses));
    invalidateShadows(); // the casters just changed, so the frozen shadow map is out of date
    detail.invalidate(); // and the new meshes have not been through the zoom rules yet
    scheduleAutosave();
  };

  // No longer chosen in the UI, but still carried by saves and honoured on load, so a city built
  // on the rugged map comes back on the rugged map.
  let terrainPreset = "rolling";
  let currentBuildableCells: readonly BuildableCell[] = [];
  let currentParcels: readonly BuildingParcel[] = [];
  let currentBuildingStatuses: readonly BuildingStatus[] = [];
  let waveClock = createWaveClock();
  let kaijuPlan: KaijuPlan | null = null;
  let pendingMissiles: PendingMissile[] = [];
  let nextSalvoAt = 0;
  let waveVerdict: WaveVerdict | null = null;
  let buildingRebuildTimer = 0;
  let lastTerms: CityTerms | undefined;
  const scheduleBuildingRebuild = (): void => {
    window.clearTimeout(buildingRebuildTimer);
    // ponytail: debounce global parcel packing; replace with dirty parcel packing if this delay is visible.
    buildingRebuildTimer = window.setTimeout(() => rebuild(), 250);
  };
  let simSeconds = 0;
  let demandStep = 0;
  const stateCounts = (): Record<string, number> =>
    currentBuildingStatuses.reduce((counts, status) => {
      counts[status.state] = (counts[status.state] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  const updateMoneyHud = (): void => showMoney(treasury.money, incomePerSecond(cityEconomy.resources.population, currentBuildingStatuses), stateCounts());
  const currentSuppliedUtilities = (): Set<string> => suppliedDiffusers(graph, utilities.producers(), utilities.diffusers());
  const syncBuildings = (): void => {
    const residents = cityEconomy.resources.population;
    const supplied = currentSuppliedUtilities();
    const diffusers = utilities.diffusers();
    currentBuildingStatuses = buildingLifecycle.sync(currentParcels, residents, simSeconds).map((status) => {
      if (status.state === "rising" || status.state === "waiting" || status.state === "rebuilding") return status;
      const missing = missingUtility(status.parcel.kind, status.parcel.position, supplied, diffusers);
      return missing ? { ...status, state: "idle" as const, reason: missing } : status;
    });
    let clearedRubble = false;
    for (const status of currentBuildingStatuses) {
      if (status.state === "rebuilding" || !rubble.blocks(status.parcel)) continue;
      rubble.clear(status.parcel);
      clearedRubble = true;
    }
    if (clearedRubble) rubbleRenderer.rebuild(rubble.toJSON());
    showCityStats(residents, buildingNeeds(currentParcels, residents), cityEconomy.resources, lastTerms);
    showMoney(treasury.money, incomePerSecond(residents, currentBuildingStatuses), stateCounts());
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
      rebuild();
    }
    const next = sunHour + dt * 0.25;
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
      if (writeAutosave(serializeCity(graph, plantings, zones, terrainPreset, sunHour, cameraSnapshot(), rubble, buildingLifecycle, treasury, cityEconomy, utilities)) || autosaveRefusedShown) return;
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
    serializeCity(graph, plantings, zones, terrainPreset, sunHour, withCamera ? cameraSnapshot() : undefined, rubble, buildingLifecycle, treasury, cityEconomy, utilities);
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
    nextSalvoAt = 0;
    waveVerdict = null;
  };
  const finishWave = (verdict: WaveVerdict): void => {
    waveVerdict = verdict;
    kaiju.hide();
    waveMarkers.hide();
    pendingMissiles = [];
    missiles.rebuild([]);
    showWaveBanner(verdict === "held" ? "Wave held" : "Wave breached", verdict);
  };
  const resetWave = (): void => {
    waveClock = createWaveClock();
    kaijuPlan = null;
    pendingMissiles = [];
    waveVerdict = null;
    kaiju.hide();
    waveMarkers.hide();
    missiles.rebuild([]);
  };
  const updateWave = (dt: number): void => {
    if (dt > 0) waveClock = advanceWaveClock(waveClock, dt);
    if (waveVerdict) {
      showWaveBanner(waveVerdict === "held" ? "Wave held" : "Wave breached", waveVerdict);
      return;
    }
    if (waveClock.active && !kaijuPlan) startWave();
    if (!waveClock.active || !kaijuPlan) {
      kaiju.hide();
      waveMarkers.hide();
      missiles.rebuild([]);
      showWaveBanner(`Wave in ${Math.ceil(waveCountdownSeconds(waveClock))}s`, "waiting");
      return;
    }
    const seconds = waveClock.elapsedSeconds - waveClock.active.startedAtSeconds;
    const position = kaijuPositionAt(kaijuPlan, seconds);
    const next = kaijuPositionAt(kaijuPlan, seconds + 0.1);
    waveMarkers.show(kaijuPlan);
    kaiju.show(v3(position.x, heightmap.heightAt(position.x, position.z), position.z), Math.atan2(next.x - position.x, next.z - position.z), seconds);
    const batteries = batteriesForParcels(currentParcels);
    if (seconds >= nextSalvoAt) {
      pendingMissiles.push(...batteriesInRange(batteries, position).map((battery) => ({
        from: battery.position,
        to: position,
        impactAt: seconds + WAVE_STARTING_VALUES.missileTravelSecondsAtRange * Math.min(1, distXZ(battery.position, position) / battery.range),
        damage: battery.damage,
      })));
      nextSalvoAt = seconds + WAVE_STARTING_VALUES.reloadSeconds;
    }
    const hits = pendingMissiles.filter((missile) => missile.impactAt <= seconds);
    if (hits.length) waveClock = damageWaveClock(waveClock, hits.reduce((sum, missile) => sum + missile.damage, 0));
    pendingMissiles = pendingMissiles.filter((missile) => missile.impactAt > seconds);
    missiles.rebuild(pendingMissiles);
    const active = waveClock.active;
    if (!active) return;
    showWaveBanner(`Kaiju ${Math.ceil(active.hitPoints)}/${active.threat} HP - ${Math.round(firepowerPerMinute(batteries))} dmg/min`, "active");
    if (active.hitPoints <= 0) {
      finishWave("held");
      return;
    }
    const hit = currentParcels.find((parcel) => distXZ(parcel.position, position) <= WAVE_STARTING_VALUES.destructionRadiusM);
    if (!hit) return;
    rubble.destroy(hit);
    buildingLifecycle.rebuild(hit, simSeconds);
    syncBuildings();
    history.clear();
    rebuild(parcelBounds(hit));
    finishWave("breached");
  };

  // Set once bindControls runs, just below -- createDrawTool needs a selection callback before
  // that exists, but the callback itself only ever fires later, once the player actually clicks.
  let controls: ReturnType<typeof bindControls> | undefined;
  let selectedInfo: SelectionInfo | null = null;
  const setTimeRate = (rate: TimeRate): void => {
    timeRate = rate;
    if (rate === 1 || rate === 2 || rate === 4) lastRunRate = rate;
    simPaused = rate === 0;
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
      paint(x, z, radius, kind) {
        for (const cell of currentBuildableCells) {
          const centre = buildableCellCentre(cell);
          if (Math.hypot(centre.x - x, centre.z - z) <= radius) zones.paint(centre.x, centre.z, GRID.cellSize / Math.SQRT2, kind);
        }
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
      spend(cost) {
        const spent = treasury.spend(cost);
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
    onNew() {
      // Through the same path a save takes: pristine terrain, cleared history, one rebuild.
      loadCity({ v: SAVE_VERSION, terrain: "rolling", hour: DEFAULT_HOUR, money: STARTING_MONEY, resources: new CityEconomy().resources, nodes: [], segments: [], planted: [], cleared: [], zones: [], rubble: [], buildingStates: [], utilities: [] });
      // And framed the way the game opens: an empty city carries no camera, and leaving the last
      // one is leaving the player looking at a patch of grass where their city used to be.
      // Far enough out to see the island rather than the patch of grass in front of it: a new
      // city is a place to choose, and the choice is where the coast is.
      applyCamera({ targetX: 0, targetY: 0, targetZ: 0, alpha: -Math.PI / 2, beta: Math.PI / 3.4, radius: 800 });
      frameTerrain();
    },
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
    simSeconds = 0;
    simDay = 1;
    setClockHour(city.hour);
    addOffshoreBridge();
    rebuild();
    if (city.camera) applyCamera(city.camera);
    updateUndoRedo();
    return true;
  }

  addOffshoreBridge();
  rebuild();

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
      lastTerms = cityEconomy.advance(currentParcels, simDt);
      syncBuildings();
      const income = incomePerSecond(cityEconomy.resources.population, currentBuildingStatuses);
      treasury.earn(income * simDt);
      updateMoneyHud();
      buildings.updateStates(currentBuildingStatuses);
    }
    updateWave(simDt);
    detail.update();
    // Above this the models are indistinguishable from the boxes that stand in for them.
    buildings.setDistant(camera.radius > 1100);
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
    needs: buildingNeeds(currentParcels, cityEconomy.resources.population),
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
    money: treasury.money,
    income: incomePerSecond(cityEconomy.resources.population, currentBuildingStatuses),
    models: buildings.modelCount,
    startupModels: buildings.startupModelCount,
    activeMeshes: scene.getActiveMeshes().length,
    kaiju: kaiju.visible(),
    missiles: pendingMissiles.length,
    wave: waveVerdict ?? (waveClock.active ? "active" : "waiting"),
    waveHp: waveClock.active?.hitPoints ?? null,
    timeRate,
    simDay,
    simHour: sunHour,
  }), { setWorldGridVisible: worldGrid.setVisible, measureFps });
  const debugApi = (window as unknown as { cityjump?: Record<string, unknown> }).cityjump ?? {};
  const debugReset = debugApi.reset as (() => void) | undefined;
  Object.assign(debugApi, {
    reset() {
      resetWave();
      debugReset?.();
    },
    buildingPoint: () => buildings.buildingPoint(),
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
    measureBuildingStateChange() {
      const started = performance.now();
      simSeconds += BUILDING_STAGE_SECONDS;
      syncBuildings();
      buildings.updateStates(currentBuildingStatuses);
      return { buildings: currentParcels.length, ms: performance.now() - started, states: stateCounts() };
    },
    forceWave(seconds = 0) {
      waveClock = advanceWaveClock({ ...waveClock, elapsedSeconds: waveClock.nextWaveAtSeconds }, 0);
      startWave("debug");
      waveClock = { ...waveClock, elapsedSeconds: waveClock.active ? waveClock.active.startedAtSeconds + seconds : waveClock.elapsedSeconds };
    },
    forceHeldWave() {
      if (!waveClock.active) {
        waveClock = advanceWaveClock({ ...waveClock, elapsedSeconds: waveClock.nextWaveAtSeconds }, 0);
        startWave("debug");
      }
      waveClock = damageWaveClock(waveClock, WAVE_STARTING_VALUES.kaijuHitPoints);
      finishWave("held");
    },
  });

  function surfaceJunctions(): number {
    return graph
      .allNodes()
      .filter((node) => [...node.segments].filter((id) => !roadType(graph.segment(id).type).tunnelDepth).length >= 3).length;
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
