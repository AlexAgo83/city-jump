import { createBuildingRenderer } from "../render/buildings";
import { installDebugApi } from "../render/debugApi";
import { createDrawTool, TREE_REACH } from "../render/drawTool";
import { createGround, createOcean, createWorldGrid, GROUND_CELL, GROUND_SIZE } from "../render/ground";
import { createRoadRenderer } from "../render/roadMesh";
import { createScene } from "../render/scene";
import { createStreetlightRenderer } from "../render/streetlights";
import { createTrafficRenderer } from "../render/traffic";
import { createTreeRenderer } from "../render/trees";
import { RoadGraph } from "../sim/graph";
import { Plantings } from "../sim/plantings";
import { Heightmap, rollingHills, SEA_LEVEL } from "../sim/heightmap";
import { roadType } from "../sim/roadTypes";
import { buildingParcels, buildableCells } from "../sim/slots";
import { serializeCity, restoreCity, type CitySave } from "../sim/save";
import { setTerrain } from "../sim/terrain";
import { bindControls } from "../ui/controls";
import { readAutosave, writeAutosave } from "../ui/saves";
import { showRefusal } from "../ui/hud";

export async function startApp(): Promise<void> {
  const canvas = document.getElementById("app") as HTMLCanvasElement;
  const { scene, camera, shadows, setSunHour } = createScene(canvas);
  const heightmap = new Heightmap({ size: GROUND_SIZE, cell: GROUND_CELL, generator: rollingHills() });
  setTerrain(heightmap);
  const frameTerrain = (): void => {
    camera.target.y = heightmap.heightAt(0, 0);
  };
  frameTerrain();

  const graph = new RoadGraph();
  const plantings = new Plantings();
  createOcean(scene);
  const ground = createGround(scene, heightmap);
  const worldGrid = createWorldGrid(scene, heightmap);
  const roads = createRoadRenderer(scene, graph);
  const traffic = createTrafficRenderer(scene, graph);
  const streetlights = createStreetlightRenderer(scene, graph);
  const trees = createTreeRenderer(scene, heightmap, graph, shadows, plantings);
  const buildings = await createBuildingRenderer(scene, graph, shadows);
  let buildingCount = 0;
  const setSun = (hour: number): void => {
    setSunHour(hour);
    streetlights.setSunHour(hour);
    trees.setSunHour(hour);
  };

  const rebuild = (): void => {
    // Solving the parcel layout is the most expensive step in here, so it happens once and both
    // the terrain flattening and the building renderer work from the same answer.
    const cells = buildableCells(graph);
    const parcels = buildingParcels(cells);
    heightmap.conformToRoads(graph);
    heightmap.conformToRoads(graph, parcels);
    ground.refresh();
    trees.rebuild();
    worldGrid.rebuild();
    roads.rebuild();
    streetlights.rebuild();
    traffic.rebuild();
    buildingCount = buildings.rebuild(cells, parcels);
    scheduleAutosave();
  };

  // No longer chosen in the UI, but still carried by saves and honoured on load, so a city built
  // on the rugged map comes back on the rugged map.
  let terrainPreset = "rolling";
  let sunHour = 14;
  const applyTerrain = (preset: string): void => {
    terrainPreset = preset;
    heightmap.regenerate(preset === "rugged" ? rollingHills(18, 450, 18) : rollingHills());
    frameTerrain();
  };

  // Debounced, so dragging a long road writes once rather than on every rebuild.
  // ponytail: a timer, not a dirty-flag scheduler.
  let autosaveTimer = 0;
  const scheduleAutosave = (): void => {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => writeAutosave(serializeCity(graph, plantings, terrainPreset, sunHour)), 2000);
  };

  /** A tree changes no road, so only the scenery is rebuilt. */
  const refreshTrees = (): void => {
    trees.rebuild();
    scheduleAutosave();
  };

  const tool = createDrawTool(scene, graph, ground.mesh, rebuild, showRefusal, {
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
  });

  const controls = bindControls({
    onRoadMode(mode) {
      tool.setMode(mode);
      buildings.setGridVisible(mode === "straight" || mode === "curve");
    },
    onRoadType(type) {
      tool.setRoadType(type);
    },
    onWorldGrid: worldGrid.setVisible,
    onGridSnap(enabled) {
      tool.setGridSnap(enabled);
    },
    onTreeSpecies(species) {
      tool.setTreeSpecies(species);
    },
    onBuildings(visible) {
      buildings.setVisible(visible);
      rebuild();
    },
    onSunHour(hour) {
      sunHour = hour;
      setSun(hour);
    },
    onSave: () => serializeCity(graph, plantings, terrainPreset, sunHour),
    onLoad: loadCity,
  });

  function loadCity(city: CitySave): boolean {
    tool.cancel();
    try {
      // The terrain has to be pristine before the replay: node elevations were recorded against
      // the raw heightmap, and `rebuild` conforms it to the roads afterwards.
      applyTerrain(city.terrain === "rugged" ? "rugged" : "rolling");
      restoreCity(graph, plantings, city);
    } catch (error) {
      showRefusal(`This city could not be loaded: ${(error as Error).message}`);
      return false;
    }
    sunHour = city.hour;
    rebuild();
    return true;
  }

  rebuild();

  // Pick up where the last session stopped. A city the player never named is still their work.
  const resumed = readAutosave();
  if (resumed && loadCity(resumed)) controls.applyCity(resumed);

  installDebugApi(scene, graph, rebuild, () => ({
    segments: graph.allSegments().length,
    junctions: surfaceJunctions(),
    buildings: buildingCount,
    avenues: graph.allSegments().filter((segment) => segment.type === "avenue").length,
    tunnels: graph.allSegments().filter((segment) => segment.type === "tunnel").length,
    cars: traffic.count(),
    pedestrians: traffic.pedestrians(),
    streetlights: streetlights.count(),
    realStreetlights: streetlights.realLightCount(),
    trees: trees.count(),
    models: buildings.modelCount,
    activeMeshes: scene.getActiveMeshes().length,
  }));

  function surfaceJunctions(): number {
    return graph
      .allNodes()
      .filter((node) => [...node.segments].filter((id) => !roadType(graph.segment(id).type).tunnelDepth).length >= 3).length;
  }
}
