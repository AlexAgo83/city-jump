import { createScene } from "./render/scene";
import { createGround } from "./render/ground";
import { createRoadRenderer } from "./render/roadMesh";
import { createDrawTool } from "./render/drawTool";
import { setHud } from "./render/hud";
import { installDebugApi } from "./render/debugApi";
import { RoadGraph } from "./sim/graph";

const canvas = document.getElementById("app") as HTMLCanvasElement;
const { scene } = createScene(canvas);
const ground = createGround(scene);

const graph = new RoadGraph();
const roads = createRoadRenderer(scene, graph);
const tool = createDrawTool(scene, graph, ground, () => {
  roads.rebuild();
  refreshHud();
});

function refreshHud(): void {
  setHud(
    [
      `roads     ${graph.allSegments().length}`,
      `junctions ${graph.allNodes().filter((n) => n.segments.size >= 3).length}`,
      "",
      tool.stageLabel(),
      "right-click or Esc: cancel",
    ].join("\n"),
  );
}

scene.onPointerObservable.add(refreshHud);
refreshHud();

installDebugApi(scene, graph, () => {
  roads.rebuild();
  refreshHud();
}, () => ({
  segments: graph.allSegments().length,
  junctions: graph.allNodes().filter((n) => n.segments.size >= 3).length,
  drawCalls: scene.getActiveMeshes().length,
}));
