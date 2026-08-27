import { createBuildingRenderer } from "../render/buildings";
import { installDebugApi } from "../render/debugApi";
import { createDrawTool } from "../render/drawTool";
import { createGround, createWorldGrid, GROUND_CELL, GROUND_SIZE } from "../render/ground";
import { createRoadRenderer } from "../render/roadMesh";
import { createScene } from "../render/scene";
import { RoadGraph } from "../sim/graph";
import { Heightmap, rollingHills } from "../sim/heightmap";
import { setTerrain } from "../sim/terrain";
import { bindControls } from "../ui/controls";
import { setHud, showRefusal } from "../ui/hud";

export async function startApp(): Promise<void> {
  const canvas = document.getElementById("app") as HTMLCanvasElement;
  const { scene, setSunHour } = createScene(canvas);
  const heightmap = new Heightmap({ size: GROUND_SIZE, cell: GROUND_CELL, generator: rollingHills() });
  setTerrain(heightmap);

  const graph = new RoadGraph();
  const ground = createGround(scene, heightmap);
  const worldGrid = createWorldGrid(scene, heightmap);
  const roads = createRoadRenderer(scene, graph);
  const buildings = await createBuildingRenderer(scene, graph);
  let buildingCount = 0;

  const refreshHud = (): void => {
    setHud(
      [
        `roads      ${graph.allSegments().length}`,
        `junctions  ${graph.allNodes().filter((node) => node.segments.size >= 3).length}`,
        `buildings  ${buildingCount}`,
        "",
        tool.stageLabel(),
        "right-click or Esc: cancel",
      ].join("\n"),
    );
  };

  const rebuild = (): void => {
    heightmap.conformToRoads(graph);
    ground.refresh();
    worldGrid.rebuild();
    roads.rebuild();
    buildingCount = buildings.rebuild();
    refreshHud();
  };

  const tool = createDrawTool(scene, graph, ground.mesh, rebuild, showRefusal);

  bindControls({
    onRoadMode(mode) {
      tool.setMode(mode);
      refreshHud();
    },
    onWorldGrid: worldGrid.setVisible,
    onGridSnap(enabled) {
      tool.setGridSnap(enabled);
      refreshHud();
    },
    onTerrain(preset) {
      if (graph.allSegments().length && !window.confirm("Changing terrain clears the current city. Continue?")) {
        return false;
      }
      tool.cancel();
      for (const segment of graph.allSegments()) graph.removeSegment(segment.id);
      heightmap.regenerate(preset === "rugged" ? rollingHills(18, 450) : rollingHills());
      rebuild();
      return true;
    },
    onSunHour: setSunHour,
  });

  scene.onPointerObservable.add(refreshHud);
  rebuild();

  installDebugApi(scene, graph, rebuild, () => ({
    segments: graph.allSegments().length,
    junctions: graph.allNodes().filter((node) => node.segments.size >= 3).length,
    buildings: buildingCount,
    models: buildings.modelCount,
    activeMeshes: scene.getActiveMeshes().length,
  }));
}
