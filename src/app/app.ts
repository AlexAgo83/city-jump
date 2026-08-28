import { createBuildingRenderer } from "../render/buildings";
import { installDebugApi } from "../render/debugApi";
import { createDrawTool } from "../render/drawTool";
import { createGround, createOcean, createWorldGrid, GROUND_CELL, GROUND_SIZE } from "../render/ground";
import { createRoadRenderer } from "../render/roadMesh";
import { createScene } from "../render/scene";
import { createStreetlightRenderer } from "../render/streetlights";
import { createTrafficRenderer } from "../render/traffic";
import { createTreeRenderer } from "../render/trees";
import { RoadGraph } from "../sim/graph";
import { Heightmap, rollingHills } from "../sim/heightmap";
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
  createOcean(scene);
  const ground = createGround(scene, heightmap);
  const worldGrid = createWorldGrid(scene, heightmap);
  const roads = createRoadRenderer(scene, graph);
  const traffic = createTrafficRenderer(scene, graph);
  const streetlights = createStreetlightRenderer(scene, graph);
  const trees = createTreeRenderer(scene, heightmap, graph, shadows);
  const buildings = await createBuildingRenderer(scene, graph, shadows);
  let buildingCount = 0;
  const setSun = (hour: number): void => {
    setSunHour(hour);
    streetlights.setSunHour(hour);
    trees.setSunHour(hour);
  };

  const rebuild = (): void => {
    heightmap.conformToRoads(graph);
    heightmap.conformToRoads(graph, buildingParcels(buildableCells(graph)));
    ground.refresh();
    trees.rebuild();
    worldGrid.rebuild();
    roads.rebuild();
    streetlights.rebuild();
    traffic.rebuild();
    buildingCount = buildings.rebuild();
    scheduleAutosave();
  };

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
    autosaveTimer = window.setTimeout(() => writeAutosave(serializeCity(graph, terrainPreset, sunHour)), 2000);
  };

  const tool = createDrawTool(scene, graph, ground.mesh, rebuild, showRefusal);

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
    onBuildings(visible) {
      buildings.setVisible(visible);
      rebuild();
    },
    onTerrain(preset) {
      if (graph.allSegments().length && !window.confirm("Changing terrain clears the current city. Continue?")) {
        return false;
      }
      tool.cancel();
      for (const segment of graph.allSegments()) graph.removeSegment(segment.id);
      applyTerrain(preset);
      rebuild();
      return true;
    },
    onSunHour(hour) {
      sunHour = hour;
      setSun(hour);
    },
    onSave: () => serializeCity(graph, terrainPreset, sunHour),
    onLoad: loadCity,
  });

  function loadCity(city: CitySave): boolean {
    tool.cancel();
    try {
      // The terrain has to be pristine before the replay: node elevations were recorded against
      // the raw heightmap, and `rebuild` conforms it to the roads afterwards.
      applyTerrain(city.terrain === "rugged" ? "rugged" : "rolling");
      restoreCity(graph, city);
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
