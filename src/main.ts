import { createScene } from "./render/scene";
import { createGround, createWorldGrid, GROUND_SIZE, GROUND_CELL } from "./render/ground";
import { createRoadRenderer } from "./render/roadMesh";
import { createBuildingRenderer } from "./render/buildings";
import { createDrawTool } from "./render/drawTool";
import { installDebugApi } from "./render/debugApi";
import { setHud } from "./render/hud";
import { RoadGraph } from "./sim/graph";
import { Heightmap, rollingHills } from "./sim/heightmap";
import { setTerrain } from "./sim/terrain";

const canvas = document.getElementById("app") as HTMLCanvasElement;
const { scene, setSunHour } = createScene(canvas);

// The ground stops being flat here and nowhere else: everything that needs an elevation
// already goes through `terrainHeight`.
const heightmap = new Heightmap({ size: GROUND_SIZE, cell: GROUND_CELL, generator: rollingHills() });
setTerrain(heightmap);

const graph = new RoadGraph();
const ground = createGround(scene, heightmap);
const worldGrid = createWorldGrid(scene, heightmap);
const roads = createRoadRenderer(scene, graph);
const buildings = await createBuildingRenderer(scene, graph);

let buildingCount = 0;

function rebuild(): void {
  // Cut the roads into the ground first: the road surface and the buildings are drawn at
  // the elevations their nodes were placed at, and the ground has to come up to meet them.
  heightmap.conformToRoads(graph);
  ground.refresh();
  worldGrid.rebuild();
  roads.rebuild();
  buildingCount = buildings.rebuild();
  refreshHud();
}

const tool = createDrawTool(scene, graph, ground.mesh, rebuild);

for (const input of document.querySelectorAll<HTMLInputElement>('input[name="road-mode"]')) {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    tool.setMode(input.value === "straight" ? "straight" : "curve");
    refreshHud();
  });
}

document.getElementById("show-grid")!.addEventListener("change", (event) => {
  worldGrid.setVisible((event.currentTarget as HTMLInputElement).checked);
});

document.getElementById("grid-snap")!.addEventListener("change", (event) => {
  tool.setGridSnap((event.currentTarget as HTMLInputElement).checked);
  refreshHud();
});

let terrainPreset = "rolling";
document.getElementById("terrain")!.addEventListener("change", (event) => {
  const select = event.currentTarget as HTMLSelectElement;
  if (graph.allSegments().length && !window.confirm("Changing terrain clears the current city. Continue?")) {
    select.value = terrainPreset;
    return;
  }
  terrainPreset = select.value;
  tool.cancel();
  for (const segment of graph.allSegments()) graph.removeSegment(segment.id);
  heightmap.regenerate(terrainPreset === "rugged" ? rollingHills(18, 450) : rollingHills());
  rebuild();
});

const sunHour = document.getElementById("sun-hour") as HTMLInputElement;
const sunTime = document.getElementById("sun-time") as HTMLOutputElement;
function updateSun(): void {
  const hour = Number(sunHour.value);
  setSunHour(hour);
  const whole = Math.floor(hour) % 24;
  const minutes = Math.round((hour - Math.floor(hour)) * 60);
  sunTime.value = `${String(whole).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
sunHour.addEventListener("input", updateSun);
updateSun();

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
