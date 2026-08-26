import { createScene } from "./render/scene";
import { createGround } from "./render/ground";
import { createRoadRenderer } from "./render/roadMesh";
import { createBuildingRenderer } from "./render/buildings";
import { createDrawTool } from "./render/drawTool";
import { installDebugApi } from "./render/debugApi";
import { setHud } from "./render/hud";
import { RoadGraph } from "./sim/graph";

const canvas = document.getElementById("app") as HTMLCanvasElement;
const { scene } = createScene(canvas);
const ground = createGround(scene);

const graph = new RoadGraph();
const roads = createRoadRenderer(scene, graph);
const buildings = await createBuildingRenderer(scene, graph);

let buildingCount = 0;

function rebuild(): void {
  roads.rebuild();
  buildingCount = buildings.rebuild();
  refreshHud();
}

const tool = createDrawTool(scene, graph, ground, rebuild);

function refreshHud(): void {
  setHud(
    [
      `roads      ${graph.allSegments().length}`,
      `junctions  ${graph.allNodes().filter((n) => n.segments.size >= 3).length}`,
      `buildings  ${buildingCount}`,
      "",
      tool.stageLabel(),
      "right-click or Esc: cancel",
    ].join("\n"),
  );
}

scene.onPointerObservable.add(refreshHud);
refreshHud();

installDebugApi(scene, graph, rebuild, () => ({
  segments: graph.allSegments().length,
  junctions: graph.allNodes().filter((n) => n.segments.size >= 3).length,
  buildings: buildingCount,
  models: buildings.modelCount,
  activeMeshes: scene.getActiveMeshes().length,
}));
