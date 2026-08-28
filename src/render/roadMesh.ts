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
  portalMaterial.diffuseColor = new Color3(0.26, 0.25, 0.23);
  portalMaterial.specularColor = Color3.Black();
  const tubeMaterial = new StandardMaterial("tunnel_tube", scene);
  tubeMaterial.diffuseColor = new Color3(0.06, 0.06, 0.055);
  tubeMaterial.emissiveColor = new Color3(0.01, 0.008, 0.006);
  tubeMaterial.specularColor = Color3.Black();
  const curb = new Color3(0.52, 0.55, 0.53);
  const lane = new Color3(0.86, 0.78, 0.48);
  const tunnel = new Color3(0.58, 0.55, 0.49);

  let meshes: (Mesh | LinesMesh)[] = [];

  function rebuild(): void {
    for (const mesh of meshes) mesh.dispose();
    meshes = [];

    const junctions = allJunctions(graph);

    for (const seg of graph.allSegments()) {
      const type = roadType(seg.type);
      if (type.tunnelDepth) {
        const steps = Math.max(4, Math.ceil(seg.length / 8));
        const trace = pointsBetween(graph, seg.id, 0, seg.length, steps, MARK_LIFT);
        const line = MeshBuilder.CreateDashedLines(`tunnel_trace_${seg.id}`, { points: trace, dashSize: 8, gapSize: 5 }, scene);
        line.color = tunnel;
        line.isPickable = false;

        const tube = tunnelMesh(scene, `tunnel_${seg.id}`, graph, seg.id, steps, type.width);
        tube.shell.material = portalMaterial;
        tube.interior.material = tubeMaterial;
        tube.shell.isPickable = false;
        tube.interior.isPickable = false;
        meshes.push(line, tube.shell, tube.interior);
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

function tunnelMesh(scene: Scene, name: string, graph: RoadGraph, id: number, steps: number, width: number): { shell: Mesh; interior: Mesh } {
  const seg = graph.segment(id);
  const inner = tunnelSection(width);
  const outer = tunnelSection(width + 8).map((p) => ({ x: p.x, y: p.y + 1.5 }));
  const shellPositions: number[] = [];
  const interiorPositions: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const { position, tangent } = graph.pointAt(id, (seg.length * i) / steps);
    const n = perpXZ(normalizeXZ(tangent));
    const y = terrainHeight(position.x, position.z) + MARK_LIFT;
    for (const p of outer) shellPositions.push(position.x + n.x * p.x, y + p.y, position.z + n.z * p.x);
    for (const p of inner) interiorPositions.push(position.x + n.x * p.x, y + p.y, position.z + n.z * p.x);
  }
  const shellIndices = tunnelStripIndices(outer.length, steps, false);
  const interiorIndices = tunnelStripIndices(inner.length, steps, true);
  return {
    shell: vertexMesh(scene, `${name}_shell`, shellPositions, shellIndices),
    interior: vertexMesh(scene, `${name}_interior`, interiorPositions, interiorIndices),
  };
}

function tunnelStripIndices(count: number, steps: number, flip: boolean): number[] {
  const indices: number[] = [];
  for (let i = 0; i < steps; i++) {
    const a = i * count;
    const b = a + count;
    for (let j = 0; j < count - 1; j++) {
      if (flip) indices.push(a + j, a + j + 1, b + j, a + j + 1, b + j + 1, b + j);
      else indices.push(a + j, b + j, a + j + 1, a + j + 1, b + j, b + j + 1);
    }
  }
  return indices;
}

function vertexMesh(scene: Scene, name: string, positions: number[], indices: number[]): Mesh {
  const mesh = new MeshClass(name, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  data.normals = normals;
  data.applyToMesh(mesh);
  return mesh;
}

function tunnelSection(width: number): { x: number; y: number }[] {
  const gateWidth = width + 8;
  const wall = 3;
  const arch = 5;
  const half = gateWidth / 2;
  return [
    { x: -half, y: 0 },
    { x: -half, y: wall },
    ...Array.from({ length: 7 }, (_, i) => {
      const x = -half + (gateWidth * i) / 6;
      return { x, y: wall + arch * Math.sqrt(1 - (x / half) ** 2) };
    }),
    { x: half, y: wall },
    { x: half, y: 0 },
  ];
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
  const y = terrainHeight(position.x, position.z) + MARK_LIFT;
  const exterior = portalExterior(scene, `tunnel_headwall_${id}_${distance}`, position, tangent, width, direction, y);
  for (const mesh of exterior) {
    mesh.material = material;
    mesh.isPickable = false;
  }

  const portal = portalMesh(scene, `tunnel_portal_${id}_${distance}`, position, tangent, width, direction, y);
  portal.material = material;
  portal.isPickable = false;

  const lip = portalOutline(position, tangent, width, y);
  return [...exterior, portal, styledLine(scene, `tunnel_lip_${id}_${distance}`, lip, color)];
}

function portalExterior(
  scene: Scene,
  name: string,
  center: { x: number; z: number },
  tangent: { x: number; z: number },
  width: number,
  direction: 1 | -1,
  y: number,
): Mesh[] {
  const gate = width + 8;
  const side = 5;
  const height = 9;
  const top = 3;
  const depth = 5;
  const rotation = Math.atan2(tangent.x * direction, tangent.z * direction);
  const n = perpXZ(normalizeXZ({ x: tangent.x, y: 0, z: tangent.z }));
  const block = (label: string, x: number, boxWidth: number, boxHeight: number, cy: number) => {
    const mesh = MeshBuilder.CreateBox(`${name}_${label}`, { width: boxWidth, height: boxHeight, depth }, scene);
    mesh.position.set(center.x + n.x * x, cy, center.z + n.z * x);
    mesh.rotation.y = rotation;
    return mesh;
  };
  return [
    block("left", -gate / 2 - side / 2, side, height, y + height / 2),
    block("right", gate / 2 + side / 2, side, height, y + height / 2),
    block("top", 0, gate + side * 2, top, y + height + top / 2),
  ];
}

function portalMesh(
  scene: Scene,
  name: string,
  center: { x: number; z: number },
  tangent: { x: number; z: number },
  width: number,
  direction: 1 | -1,
  y: number,
): Mesh {
  const t = normalizeXZ({ x: tangent.x * direction, y: 0, z: tangent.z * direction });
  const n = perpXZ(t);
  const inner = tunnelSection(width);
  const outer = tunnelSection(width + 8).map((p) => ({ x: p.x, y: p.y + 1.5 }));
  const positions: number[] = [];
  for (const d of [-1.4, 1.4]) {
    for (const section of [outer, inner]) {
      for (const p of section) positions.push(center.x + n.x * p.x + t.x * d, y + p.y, center.z + n.z * p.x + t.z * d);
    }
  }
  const indices: number[] = [];
  const count = inner.length;
  const frontOuter = 0;
  const frontInner = count;
  const backOuter = count * 2;
  const backInner = count * 3;
  for (let i = 0; i < count - 1; i++) {
    indices.push(frontOuter + i, frontOuter + i + 1, frontInner + i, frontOuter + i + 1, frontInner + i + 1, frontInner + i);
    indices.push(backOuter + i, backInner + i, backOuter + i + 1, backOuter + i + 1, backInner + i, backInner + i + 1);
    indices.push(frontOuter + i, backOuter + i, frontOuter + i + 1, frontOuter + i + 1, backOuter + i, backOuter + i + 1);
    indices.push(frontInner + i, frontInner + i + 1, backInner + i, frontInner + i + 1, backInner + i + 1, backInner + i);
  }
  const mesh = new MeshClass(name, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  data.normals = normals;
  data.applyToMesh(mesh);
  return mesh;
}

function portalOutline(center: { x: number; z: number }, tangent: { x: number; z: number }, width: number, y: number): Vector3[] {
  const n = perpXZ(normalizeXZ({ x: tangent.x, y: 0, z: tangent.z }));
  return tunnelSection(width).map((p) => new Vector3(center.x + n.x * p.x, y + p.y, center.z + n.z * p.x));
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
