import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3 } from "@babylonjs/core/Maths/math";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import type { RoadGraph } from "../sim/graph";
import { toBabylon } from "./convert";

const LINE_COLOR = new Color3(0.85, 0.85, 0.9);

/**
 * Renders the graph as bare centre lines. Regenerated from the graph after every edit --
 * the meshes are derived and disposable, the graph is the state.
 */
export function createNetworkRenderer(scene: Scene, graph: RoadGraph) {
  let lines: LinesMesh[] = [];

  function rebuild(): void {
    for (const line of lines) line.dispose();
    lines = graph.allSegments().map((seg) => {
      const mesh = MeshBuilder.CreateLines(
        `seg_${seg.id}`,
        { points: seg.samples.map((p) => toBabylon(p).addInPlaceFromFloats(0, 0.2, 0)) },
        scene,
      );
      mesh.color = LINE_COLOR;
      mesh.isPickable = false;
      return mesh;
    });
  }

  return { rebuild };
}
