import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { Mesh as MeshClass } from "@babylonjs/core/Meshes/mesh";

import type { RoadGraph } from "../sim/graph";
import { roadType } from "../sim/roadTypes";
import { junctionRadius } from "../sim/junction";
import { normalizeXZ, perpXZ, sub } from "../sim/vec";

/** Lifted off the ground so the road wins the depth fight with it. */
export const ROAD_LIFT = 0.06;

/**
 * Turns the graph into road surface. Every mesh here is derived: `rebuild` disposes what
 * it made and builds again from the graph, and nothing else ever touches these meshes.
 */
export function createRoadRenderer(scene: Scene, graph: RoadGraph) {
  const material = new StandardMaterial("road", scene);
  material.diffuseColor = new Color3(0.22, 0.22, 0.24);
  material.specularColor = Color3.Black();

  let meshes: Mesh[] = [];

  function rebuild(): void {
    for (const mesh of meshes) mesh.dispose();
    meshes = [];

    for (const seg of graph.allSegments()) {
      const half = roadType(seg.type).width / 2;
      const left: Vector3[] = [];
      const right: Vector3[] = [];

      for (let i = 0; i < seg.samples.length; i++) {
        const p = seg.samples[i]!;
        const prev = seg.samples[Math.max(0, i - 1)]!;
        const next = seg.samples[Math.min(seg.samples.length - 1, i + 1)]!;
        const n = perpXZ(normalizeXZ(sub(next, prev)));
        left.push(new Vector3(p.x + n.x * half, p.y + ROAD_LIFT, p.z + n.z * half));
        right.push(new Vector3(p.x - n.x * half, p.y + ROAD_LIFT, p.z - n.z * half));
      }

      const ribbon = MeshBuilder.CreateRibbon(
        `road_${seg.id}`,
        { pathArray: [left, right], sideOrientation: MeshClass.DOUBLESIDE },
        scene,
      );
      ribbon.material = material;
      ribbon.isPickable = false;
      meshes.push(ribbon);
    }

    // ponytail: a flat disc over each junction hides the segment ends. It overlaps the
    // roads and ignores their arrival angles -- the trimmed-polygon slice replaces it.
    for (const node of graph.allNodes()) {
      if (node.segments.size < 2) continue;
      const disc = MeshBuilder.CreateDisc(
        `junction_${node.id}`,
        { radius: junctionRadius(graph, node.id), tessellation: 24, sideOrientation: MeshClass.DOUBLESIDE },
        scene,
      );
      disc.rotation.x = Math.PI / 2;
      disc.position.set(node.pos.x, node.pos.y + ROAD_LIFT * 1.5, node.pos.z);
      disc.material = material;
      disc.isPickable = false;
      meshes.push(disc);
    }
  }

  return { rebuild, material };
}
