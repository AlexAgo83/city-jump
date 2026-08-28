import { createBuildingRenderer } from "../render/buildings";
import { installDebugApi } from "../render/debugApi";
import { createDrawTool } from "../render/drawTool";
import { createGround, createOcean, createWorldGrid, GROUND_CELL, GROUND_SIZE } from "../render/ground";
import { createRoadRenderer } from "../render/roadMesh";
import { createScene } from "../render/scene";
import { createTrafficRenderer } from "../render/traffic";
import { RoadGraph } from "../sim/graph";
import { Heightmap, rollingHills } from "../sim/heightmap";
import { roadType } from "../sim/roadTypes";
import { setTerrain } from "../sim/terrain";
import { bindControls } from "../ui/controls";
import { setHud, showRefusal } from "../ui/hud";

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
  const buildings = await createBuildingRenderer(scene, graph, shadows);
  let buildingCount = 0;

  const refreshHud = (): void => {
    setHud(
      [
        `roads      ${graph.allSegments().length}`,
        `junctions  ${surfaceJunctions()}`,
        `buildings  ${buildingCount}`,
        "",
        tool.stageLabel(),
        "Esc: cancel",
      ].join("\n"),
    );
  };

  const rebuild = (): void => {
    heightmap.conformToRoads(graph);
    ground.refresh();
    worldGrid.rebuild();
    roads.rebuild();
    traffic.rebuild();
    buildingCount = buildings.rebuild();
    refreshHud();
  };

  const tool = createDrawTool(scene, graph, ground.mesh, rebuild, showRefusal);

  bindControls({
    onRoadMode(mode) {
      tool.setMode(mode);
      refreshHud();
    },
    onRoadType(type) {
      tool.setRoadType(type);
      refreshHud();
    },
    onWorldGrid: worldGrid.setVisible,
    onGridSnap(enabled) {
      tool.setGridSnap(enabled);
      refreshHud();
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
      heightmap.regenerate(preset === "rugged" ? rollingHills(18, 450) : rollingHills());
      frameTerrain();
      rebuild();
      return true;
    },
    onSunHour: setSunHour,
  });

  scene.onPointerObservable.add(refreshHud);
  rebuild();

  installDebugApi(scene, graph, rebuild, () => ({
    segments: graph.allSegments().length,
    junctions: surfaceJunctions(),
    buildings: buildingCount,
    avenues: graph.allSegments().filter((segment) => segment.type === "avenue").length,
    tunnels: graph.allSegments().filter((segment) => segment.type === "tunnel").length,
    cars: traffic.count(),
    models: buildings.modelCount,
    activeMeshes: scene.getActiveMeshes().length,
  }));

  function surfaceJunctions(): number {
    return graph
      .allNodes()
      .filter((node) => [...node.segments].filter((id) => !roadType(graph.segment(id).type).tunnelDepth).length >= 3).length;
  }
}
