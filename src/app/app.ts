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
import { setTerrain } from "../sim/terrain";
import { bindControls } from "../ui/controls";
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
  };

  const tool = createDrawTool(scene, graph, ground.mesh, rebuild, showRefusal);

  bindControls({
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
      heightmap.regenerate(preset === "rugged" ? rollingHills(18, 450, 18) : rollingHills());
      frameTerrain();
      rebuild();
      return true;
    },
    onSunHour: setSun,
  });

  rebuild();

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
