import { createBuildingRenderer } from "../render/buildings";
import { installDebugApi } from "../render/debugApi";
import { createDrawTool, TREE_REACH } from "../render/drawTool";
import { createGround, createOcean, createWorldGrid, GROUND_CELL, GROUND_SIZE, OFFSHORE_ISLAND_RADIUS, OFFSHORE_ISLAND_Z, offshoreIslandHeight } from "../render/ground";
import { createRoadRenderer } from "../render/roadMesh";
import { createScene } from "../render/scene";
import { createFpsMeter } from "../render/fps";
import { createStreetlightRenderer } from "../render/streetlights";
import { createTrafficRenderer } from "../render/traffic";
import { createSignalRenderer } from "../render/signals";
import { createTreeRenderer } from "../render/trees";
import { createZoneRenderer } from "../render/zones";
import { RoadGraph } from "../sim/graph";
import { Plantings } from "../sim/plantings";
import { Zones } from "../sim/zones";
import { buildingNeeds, population } from "../sim/buildingKinds";
import { Heightmap, rollingHills, SEA_LEVEL, type TerrainBounds } from "../sim/heightmap";
import { createCityHistory } from "../sim/history";
import { allJunctions } from "../sim/junction";
import { baseRoadTypeId, roadType } from "../sim/roadTypes";
import { buildableCellCentre, buildingParcels, buildableCells, GRID, type BuildableCell, type BuildingParcel } from "../sim/slots";
import { parseCity, serializeCity, restoreCity, type CitySave, type SavedCamera } from "../sim/save";
import { streetForSegment } from "../sim/streets";
import { setTerrain } from "../sim/terrain";
import { approachAngle } from "../sim/transfers";
import { v3 } from "../sim/vec";
import type { FollowTarget, SelectionInfo } from "../render/drawTool";
import { bindControls } from "../ui/controls";
import { readAutosave, readSave, writeAutosave, writeCameraState, writeSave, readCameraState } from "../ui/saves";
import { createDetailCuller } from "../render/detail";
import { createPostFx } from "../render/postFx";
import { streetlightsOnAt } from "../render/streetlights";
import { showCityStats, showCompass, showFps, showRefusal, showSelection } from "../ui/hud";

type CameraMode = "free" | "orbit" | "follow";

export async function startApp(startedAt = performance.now()): Promise<void> {
  const canvas = document.getElementById("app") as HTMLCanvasElement;
  const { scene, camera, shadows, setSunHour, setShadowsEnabled, invalidateShadows } = createScene(canvas);
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
  const history = createCityHistory<CitySave>(20);
  createOcean(scene);
  const ground = createGround(scene, heightmap);
  const worldGrid = createWorldGrid(scene, heightmap);
  const roads = createRoadRenderer(scene, graph);
  const traffic = createTrafficRenderer(scene, graph);
  const fps = createFpsMeter();
  const signals = createSignalRenderer(scene, graph);
  const streetlights = createStreetlightRenderer(scene, graph);
  const trees = createTreeRenderer(scene, heightmap, graph, shadows, plantings);
  const zoneOverlay = createZoneRenderer(scene);
  const buildings = await createBuildingRenderer(scene, graph, shadows);
  // What the World > Buildings checkbox itself says -- the select-tool view can hide buildings
  // on top of that, but flipping back to "All" has to restore this, not just force them on.
  let buildingsVisible = true;
  let cameraMode: CameraMode = "free";
  let followTarget: FollowTarget | null = null;
  let simPaused = false;
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
      currentParcels = buildingParcels(currentBuildableCells, zones);
      showCityStats(population(currentParcels), buildingNeeds(currentParcels));
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
    if (dirty) scheduleBuildingRebuild();
    else measure("buildings", () => buildings.rebuild(currentBuildableCells, currentParcels));
    invalidateShadows(); // the casters just changed, so the frozen shadow map is out of date
    detail.invalidate(); // and the new meshes have not been through the zoom rules yet
    scheduleAutosave();
  };

  // No longer chosen in the UI, but still carried by saves and honoured on load, so a city built
  // on the rugged map comes back on the rugged map.
  let terrainPreset = "rolling";
  let currentBuildableCells: readonly BuildableCell[] = [];
  let currentParcels: readonly BuildingParcel[] = [];
  let buildingRebuildTimer = 0;
  const scheduleBuildingRebuild = (): void => {
    window.clearTimeout(buildingRebuildTimer);
    // ponytail: debounce global parcel packing; replace with dirty parcel packing if this delay is visible.
    buildingRebuildTimer = window.setTimeout(() => rebuild(), 250);
  };
  let sunHour = 14;
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
      if (writeAutosave(serializeCity(graph, plantings, zones, terrainPreset, sunHour, cameraSnapshot())) || autosaveRefusedShown) return;
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
    serializeCity(graph, plantings, zones, terrainPreset, sunHour, withCamera ? cameraSnapshot() : undefined);
  const restoreSnapshot = (city: CitySave): void => {
    tool.cancel();
    followTarget = null;
    restoreCity(graph, plantings, zones, city);
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

  // Set once bindControls runs, just below -- createDrawTool needs a selection callback before
  // that exists, but the callback itself only ever fires later, once the player actually clicks.
  let controls: ReturnType<typeof bindControls> | undefined;
  let selectedInfo: SelectionInfo | null = null;
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
    },
    onSelect,
    "street",
    { beforeChange, afterChange },
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
    onWorldGrid: worldGrid.setVisible,
    onFps: setFpsVisible,
    onShadows: setShadowsEnabled,
    onLights(visible) {
      streetlights.setLightsEnabled(visible);
      traffic.setLightsEnabled(visible);
    },
    onLook: postFx.setLook,
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
      buildings.setVisible(view === "all" ? buildingsVisible : false);
      buildings.setGridVisible(view === "no-buildings");
      zoneOverlay.setVisible(view === "no-buildings");
      roads.setShowTraffic(view === "traffic");
      // The road surface, sidewalks and the streetlights standing on them fade back so the lane
      // overlay is the thing that actually reads.
      roads.setFaded(view === "traffic");
      streetlights.setFaded(view === "traffic");
    },
    onSunHour(hour) {
      sunHour = hour;
      setSun(hour);
    },
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
  });
  updateUndoRedo = controls.updateUndoRedo;
  updateUndoRedo();

  function loadCity(city: CitySave): boolean {
    tool.cancel();
    try {
      // The terrain has to be pristine before the replay: node elevations were recorded against
      // the raw heightmap, and `rebuild` conforms it to the roads afterwards.
      applyTerrain(city.terrain === "rugged" ? "rugged" : "rolling");
      restoreCity(graph, plantings, zones, city);
    } catch (error) {
      showRefusal(`This city could not be loaded: ${(error as Error).message}`);
      return false;
    }
    history.clear();
    pendingHistorySnapshot = null;
    sunHour = city.hour;
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
      camera.alpha += (scene.getEngine().getDeltaTime() / 1000) * 0.22;
      return;
    }
    if (cameraMode !== "follow") return;
    const target = selectedTarget ?? followTarget?.();
    if (!target) {
      showRefusal("Follow ended because the vehicle is gone.");
      setCameraMode("free");
      return;
    }
    const dt = scene.getEngine().getDeltaTime() / 1000;
    camera.target.x += (target.x - camera.target.x) * 0.14;
    camera.target.y += (target.y - camera.target.y) * 0.14;
    camera.target.z += (target.z - camera.target.z) * 0.14;
    camera.alpha = approachAngle(camera.alpha, -target.heading - Math.PI / 2, dt * 3);
  });
  const setPaused = (paused: boolean): void => {
    simPaused = paused;
    traffic.setPaused(paused);
    signals.setPaused(paused);
    controls?.setPaused(paused);
  };
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
    population: population(currentParcels),
    needs: buildingNeeds(currentParcels),
    avenues: graph.allSegments().filter((segment) => baseRoadTypeId(segment.type) === "avenue").length,
    tunnels: graph.allSegments().filter((segment) => roadType(segment.type).tunnelDepth !== undefined).length,
    cars: traffic.count(),
    signals: signals.count(),
    pedestrians: traffic.pedestrians(),
    streetlights: streetlights.count(),
    realStreetlights: streetlights.realLightCount(),
    trees: trees.count(),
    zones: zones.count(),
    models: buildings.modelCount,
    startupModels: buildings.startupModelCount,
    activeMeshes: scene.getActiveMeshes().length,
  }), { setWorldGridVisible: worldGrid.setVisible, measureFps });
  Object.assign((window as unknown as { cityjump?: Record<string, unknown> }).cityjump ?? {}, {
    buildingPoint: () => buildings.buildingPoint(),
    vehiclePoint: () => traffic.vehiclePoint(),
    paused: () => simPaused,
  });

  function surfaceJunctions(): number {
    return graph
      .allNodes()
      .filter((node) => [...node.segments].filter((id) => !roadType(graph.segment(id).type).tunnelDepth).length >= 3).length;
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
