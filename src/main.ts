import { createScene } from "./render/scene";
import { createGround } from "./render/ground";
import { createNetworkRenderer } from "./render/network";
import { createDrawTool } from "./render/drawTool";
import { setHud } from "./render/hud";
import { RoadGraph } from "./sim/graph";

const canvas = document.getElementById("app") as HTMLCanvasElement;
const { scene } = createScene(canvas);
const ground = createGround(scene);

const graph = new RoadGraph();
const network = createNetworkRenderer(scene, graph);
const tool = createDrawTool(scene, graph, ground, () => {
  network.rebuild();
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
