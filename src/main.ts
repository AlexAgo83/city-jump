import { createScene } from "./render/scene";
import { createGround, GROUND_SIZE, GROUND_CELL } from "./render/ground";
import { createRoadRenderer } from "./render/roadMesh";
import { createBuildingRenderer } from "./render/buildings";
import { createDrawTool } from "./render/drawTool";
import { installDebugApi } from "./render/debugApi";
import { setHud } from "./render/hud";
import { RoadGraph } from "./sim/graph";
import { Heightmap, rollingHills } from "./sim/heightmap";
import { setTerrain } from "./sim/terrain";

const canvas = document.getElementById("app") as HTMLCanvasElement;
const { scene } = createScene(canvas);

// The ground stops being flat here and nowhere else: everything that needs an elevation
// already goes through `terrainHeight`.
const heightmap = new Heightmap({ size: GROUND_SIZE, cell: GROUND_CELL, generator: rollingHills() });
setTerrain(heightmap);

const graph = new RoadGraph();
const ground = createGround(scene, heightmap);
const roads = createRoadRenderer(scene, graph);
const buildings = await createBuildingRenderer(scene, graph);

let buildingCount = 0;

function rebuild(): void {
  // Cut the roads into the ground first: the road surface and the buildings are drawn at
  // the elevations their nodes were placed at, and the ground has to come up to meet them.
  heightmap.conformToRoads(graph);
  ground.refresh();
  roads.rebuild();
  buildingCount = buildings.rebuild();
  refreshHud();
}

const tool = createDrawTool(scene, graph, ground.mesh, rebuild);

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
rebuild();

installDebugApi(scene, graph, rebuild, () => ({
  segments: graph.allSegments().length,
  junctions: graph.allNodes().filter((n) => n.segments.size >= 3).length,
  buildings: buildingCount,
  models: buildings.modelCount,
  activeMeshes: scene.getActiveMeshes().length,
}));
