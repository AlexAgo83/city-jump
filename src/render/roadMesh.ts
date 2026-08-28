import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Mesh as MeshClass } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";

import type { RoadGraph } from "../sim/graph";
import { roadType } from "../sim/roadTypes";
import { allJunctions, segmentTrims, type JunctionGeometry } from "../sim/junction";
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

    const junctions = allJunctions(graph);

    for (const seg of graph.allSegments()) {
      const half = roadType(seg.type).width / 2;
      // The surface stops short of each junction; the junction polygon closes the gap.
      const { start, end } = segmentTrims(junctions, graph, seg.id);
      const from = start;
      const to = seg.length - end;
      if (to - from < 0.25) continue; // wholly inside its junctions

      const left: Vector3[] = [];
      const right: Vector3[] = [];
      const steps = Math.max(2, Math.ceil((to - from) / 2));
      for (let i = 0; i <= steps; i++) {
        const d = from + ((to - from) * i) / steps;
        const { position, tangent } = graph.pointAt(seg.id, d);
        const n = perpXZ(normalizeXZ(tangent));
        left.push(new Vector3(position.x + n.x * half, position.y + ROAD_LIFT, position.z + n.z * half));
        right.push(new Vector3(position.x - n.x * half, position.y + ROAD_LIFT, position.z - n.z * half));
      }

      const ribbon = roadStripMesh(scene, `road_${seg.id}`, left, right);
      ribbon.material = material;
      ribbon.isPickable = false;
      meshes.push(ribbon);
    }

    for (const junction of junctions.values()) {
      const mesh = junctionMesh(scene, junction);
      if (!mesh) continue;
      mesh.material = material;
      mesh.isPickable = false;
      meshes.push(mesh);
    }
  }

  return { rebuild, material };
}

function roadStripMesh(scene: Scene, name: string, left: Vector3[], right: Vector3[]): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < left.length; i++) positions.push(left[i]!.x, left[i]!.y, left[i]!.z, right[i]!.x, right[i]!.y, right[i]!.z);
  for (let i = 0; i < left.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const mesh = new MeshClass(name, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = Array.from({ length: positions.length / 3 }, () => [0, 1, 0]).flat();
  data.applyToMesh(mesh);
  return mesh;
}

/**
 * A triangle fan from the ring's centroid. The ring is convex, so a fan tessellates it
 * exactly -- no earcut, no dependency.
 */
function junctionMesh(scene: Scene, junction: JunctionGeometry): Mesh | null {
  const ring = junction.ring;
  if (ring.length < 3) return null;

  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (const p of ring) {
    cx += p.x;
    cy += p.y;
    cz += p.z;
  }
  cx /= ring.length;
  cy /= ring.length;
  cz /= ring.length;

  const positions: number[] = [cx, cy + ROAD_LIFT, cz];
  for (const p of ring) positions.push(p.x, p.y + ROAD_LIFT, p.z);

  const indices: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    indices.push(0, 1 + i, 1 + ((i + 1) % ring.length));
  }

  const mesh = new MeshClass(`junction_${junction.node}`, scene);
  const data = new VertexData();
  data.positions = positions;
  // Wound both ways, because the hull's winding can come out either way and a junction
  // culled from above is a hole. The normals are set explicitly rather than derived: a
  // horizontal polygon's normal is known, and deriving it from two windings cancels out.
  data.indices = [...indices, ...indices.slice().reverse()];
  data.normals = Array.from({ length: positions.length / 3 }, () => [0, 1, 0]).flat();
  data.applyToMesh(mesh);
  return mesh;
}
