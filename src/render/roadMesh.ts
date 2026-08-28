import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Mesh as MeshClass } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";

import type { RoadGraph } from "../sim/graph";
import { roadType } from "../sim/roadTypes";
import { terrainHeight } from "../sim/terrain";
import { allJunctions, segmentTrims, type JunctionGeometry } from "../sim/junction";
import { normalizeXZ, perpXZ, sub } from "../sim/vec";

/** Lifted off the ground so the road wins the depth fight with it. */
export const ROAD_LIFT = 0.06;
const MARK_LIFT = ROAD_LIFT + 0.05;

/**
 * Turns the graph into road surface. Every mesh here is derived: `rebuild` disposes what
 * it made and builds again from the graph, and nothing else ever touches these meshes.
 */
export function createRoadRenderer(scene: Scene, graph: RoadGraph) {
  const material = new StandardMaterial("road", scene);
  material.diffuseColor = new Color3(0.18, 0.18, 0.19);
  material.specularColor = Color3.Black();
  const portalMaterial = new StandardMaterial("tunnel_portal", scene);
  portalMaterial.diffuseColor = new Color3(0.07, 0.08, 0.08);
  portalMaterial.specularColor = Color3.Black();
  const tubeMaterial = new StandardMaterial("tunnel_tube", scene);
  tubeMaterial.diffuseColor = new Color3(0.08, 0.52, 0.58);
  tubeMaterial.emissiveColor = new Color3(0.02, 0.18, 0.2);
  tubeMaterial.specularColor = Color3.Black();
  tubeMaterial.alpha = 0.45;
  const curb = new Color3(0.52, 0.55, 0.53);
  const lane = new Color3(0.86, 0.78, 0.48);
  const tunnel = new Color3(0.36, 0.9, 0.95);

  let meshes: (Mesh | LinesMesh)[] = [];

  function rebuild(): void {
    for (const mesh of meshes) mesh.dispose();
    meshes = [];

    const junctions = allJunctions(graph);

    for (const seg of graph.allSegments()) {
      const type = roadType(seg.type);
      if (type.tunnelDepth) {
        const points = pointsBetween(graph, seg.id, 0, seg.length, Math.max(4, Math.ceil(seg.length / 8)), 1.2);
        const tube = MeshBuilder.CreateTube(`tunnel_${seg.id}`, { path: points, radius: type.width * 0.28, tessellation: 8 }, scene);
        tube.material = tubeMaterial;
        tube.isPickable = false;
        meshes.push(tube);
        meshes.push(...tunnelPortals(scene, graph, seg.id, type.width, portalMaterial, tunnel));
        continue;
      }

      const half = type.width / 2;
      const isAvenue = seg.type === "avenue";
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
      meshes.push(styledLine(scene, `curb_l_${seg.id}`, left, curb), styledLine(scene, `curb_r_${seg.id}`, right, curb));
      if (isAvenue) {
        const center = pointsBetween(graph, seg.id, from, to, steps, MARK_LIFT);
        meshes.push(styledLine(scene, `lane_${seg.id}`, center, lane));
      }
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

function styledLine(scene: Scene, name: string, points: Vector3[], color: Color3, close = false): LinesMesh {
  const mesh = MeshBuilder.CreateLines(name, { points: close ? [...points, points[0]!] : points }, scene);
  mesh.color = color;
  mesh.isPickable = false;
  return mesh;
}

function pointsBetween(graph: RoadGraph, id: number, from: number, to: number, steps: number, lift: number): Vector3[] {
  const points: Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const d = from + ((to - from) * i) / steps;
    const { position } = graph.pointAt(id, d);
    points.push(new Vector3(position.x, Math.max(position.y, terrainHeight(position.x, position.z)) + lift, position.z));
  }
  return points;
}

function tunnelPortals(
  scene: Scene,
  graph: RoadGraph,
  id: number,
  width: number,
  material: StandardMaterial,
  color: Color3,
): (Mesh | LinesMesh)[] {
  const seg = graph.segment(id);
  return [
    ...tunnelPortal(scene, graph, id, 0, width, 1, material, color),
    ...tunnelPortal(scene, graph, id, seg.length, width, -1, material, color),
  ];
}

function tunnelPortal(
  scene: Scene,
  graph: RoadGraph,
  id: number,
  distance: number,
  width: number,
  direction: 1 | -1,
  material: StandardMaterial,
  color: Color3,
): (Mesh | LinesMesh)[] {
  const { position, tangent } = graph.pointAt(id, distance);
  const y = terrainHeight(position.x, position.z) + 1.8;
  const approach = MeshBuilder.CreateBox(`tunnel_mouth_${id}_${distance}`, { width: width + 10, height: 0.25, depth: 28 }, scene);
  approach.position.set(position.x, y - 1.75, position.z);
  approach.rotation.y = Math.atan2(tangent.x * direction, tangent.z * direction);
  approach.material = material;
  approach.isPickable = false;

  const portal = MeshBuilder.CreateBox(`tunnel_portal_${id}_${distance}`, { width: width + 8, height: 8, depth: 1.6 }, scene);
  portal.position.set(position.x, y + 1.5, position.z);
  portal.rotation.y = Math.atan2(tangent.x * direction, tangent.z * direction);
  portal.material = material;
  portal.isPickable = false;

  const n = perpXZ(normalizeXZ(tangent));
  const half = width / 2;
  const lip = [
    new Vector3(position.x - n.x * half, y - 1.1, position.z - n.z * half),
    new Vector3(position.x - n.x * half, y + 4.8, position.z - n.z * half),
    new Vector3(position.x + n.x * half, y + 4.8, position.z + n.z * half),
    new Vector3(position.x + n.x * half, y - 1.1, position.z + n.z * half),
  ];
  const mouth = flatRect(position, tangent, width + 10, 28, terrainHeight(position.x, position.z) + MARK_LIFT);
  return [approach, styledLine(scene, `tunnel_mouth_lip_${id}_${distance}`, mouth, color, true), portal, styledLine(scene, `tunnel_lip_${id}_${distance}`, lip, color, true)];
}

function flatRect(center: { x: number; z: number }, tangent: { x: number; z: number }, width: number, depth: number, y: number): Vector3[] {
  const t = normalizeXZ({ x: tangent.x, y: 0, z: tangent.z });
  const n = perpXZ(t);
  return [
    new Vector3(center.x - n.x * width / 2 - t.x * depth / 2, y, center.z - n.z * width / 2 - t.z * depth / 2),
    new Vector3(center.x + n.x * width / 2 - t.x * depth / 2, y, center.z + n.z * width / 2 - t.z * depth / 2),
    new Vector3(center.x + n.x * width / 2 + t.x * depth / 2, y, center.z + n.z * width / 2 + t.z * depth / 2),
    new Vector3(center.x - n.x * width / 2 + t.x * depth / 2, y, center.z - n.z * width / 2 + t.z * depth / 2),
  ];
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
