import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4, Vector3 } from "@babylonjs/core/Maths/math";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { SEA_LEVEL, type Heightmap } from "../sim/heightmap";

export const GROUND_SIZE = 2000;
export const GROUND_CELL = 8;

/**
 * The pickable ground, one vertex per heightmap cell. `refresh` re-uploads the positions
 * in place after roads have been cut into the map, rather than rebuilding the mesh.
 */
export function createGround(scene: Scene, heightmap: Heightmap) {
  const material = new StandardMaterial("ground", scene);
  material.diffuseColor = Color3.White();
  material.specularColor = Color3.Black();

  const mesh = new Mesh("ground", scene);
  mesh.material = material;
  mesh.receiveShadows = true;

  const n = heightmap.count;
  const positions = new Float32Array(n * n * 3);
  const normals = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
  const colors = new Float32Array(n * n * 4);
  const indices: number[] = [];

  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const i = iz * n + ix;
      positions[i * 3] = heightmap.worldX(ix);
      positions[i * 3 + 2] = heightmap.worldZ(iz);
      uvs[i * 2] = ix / (n - 1);
      uvs[i * 2 + 1] = iz / (n - 1);
      if (ix < n - 1 && iz < n - 1) {
        indices.push(i, i + 1, i + n, i + 1, i + n + 1, i + n);
      }
    }
  }

  const data = new VertexData();
  data.positions = positions as unknown as number[];
  data.indices = indices;
  data.normals = normals as unknown as number[];
  data.uvs = uvs as unknown as number[];
  data.colors = colors as unknown as number[];
  data.applyToMesh(mesh, true);

  function refresh(): void {
    const current = mesh.getVerticesData(VertexBuffer.PositionKind) as Float32Array;
    const colorData = mesh.getVerticesData(VertexBuffer.ColorKind) as Float32Array;
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const h = heightmap.at(ix, iz);
        const i = iz * n + ix;
        current[i * 3 + 1] = h;
        terrainColor(h).toArray(colorData, i * 4);
      }
    }
    mesh.updateVerticesData(VertexBuffer.PositionKind, current);
    mesh.updateVerticesData(VertexBuffer.ColorKind, colorData);

    const recomputed: number[] = [];
    VertexData.ComputeNormals(current, indices, recomputed);
    mesh.updateVerticesData(VertexBuffer.NormalKind, recomputed);
    mesh.refreshBoundingInfo();
  }

  refresh();
  return { mesh, refresh };
}

export function createOcean(scene: Scene) {
  const material = new StandardMaterial("ocean", scene);
  material.diffuseColor = Color3.White();
  material.emissiveColor = new Color3(0.01, 0.04, 0.055);
  material.specularColor = new Color3(0.35, 0.55, 0.62);

  const size = GROUND_SIZE * 1.35;
  const cells = 72;
  const positions = new Float32Array((cells + 1) * (cells + 1) * 3);
  const normals = new Float32Array((cells + 1) * (cells + 1) * 3);
  const colors = new Float32Array((cells + 1) * (cells + 1) * 4);
  const indices: number[] = [];
  for (let z = 0; z <= cells; z++) {
    for (let x = 0; x <= cells; x++) {
      const i = z * (cells + 1) + x;
      const wx = -size / 2 + (x / cells) * size;
      const wz = -size / 2 + (z / cells) * size;
      const depth = smoothstep((Math.hypot(wx, wz) - 720) / 520);
      positions[i * 3] = wx;
      positions[i * 3 + 2] = wz;
      Color4.Lerp(new Color4(0.09, 0.36, 0.42, 0.34), new Color4(0.02, 0.14, 0.22, 0.97), depth * 0.75 + waveNoise(wx, wz) * 0.25).toArray(colors, i * 4);
      if (x < cells && z < cells && Math.hypot(wx + size / cells / 2, wz + size / cells / 2) > 700) {
        indices.push(i, i + 1, i + cells + 1, i + 1, i + cells + 2, i + cells + 1);
      }
    }
  }

  const mesh = new Mesh("ocean", scene);
  const data = new VertexData();
  data.positions = positions as unknown as number[];
  data.indices = indices;
  VertexData.ComputeNormals(positions, indices, normals as unknown as number[]);
  data.normals = normals as unknown as number[];
  data.colors = colors as unknown as number[];
  data.applyToMesh(mesh, true);
  mesh.hasVertexAlpha = true;
  mesh.position.y = SEA_LEVEL - 0.2;
  mesh.material = material;
  mesh.isPickable = false;
  scene.registerBeforeRender(() => {
    const t = performance.now() / 1000;
    const current = mesh.getVerticesData(VertexBuffer.PositionKind) as Float32Array;
    for (let i = 0; i < current.length; i += 3) {
      current[i + 1] = Math.sin(current[i]! * 0.015 + t) * 0.65 + Math.cos(current[i + 2]! * 0.012 + t * 0.7) * 0.4;
    }
    mesh.updateVerticesData(VertexBuffer.PositionKind, current);
    VertexData.ComputeNormals(current, indices, normals as unknown as number[]);
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
  });
  return mesh;
}

function waveNoise(x: number, z: number): number {
  return (Math.sin(x * 0.017 + z * 0.031) + Math.sin(x * 0.043 - z * 0.019)) * 0.25 + 0.5;
}

function terrainColor(h: number): Color4 {
  const sand = new Color4(0.46, 0.43, 0.27, 1);
  const grass = new Color4(0.39, 0.51, 0.34, 1);
  const rock = new Color4(0.43, 0.43, 0.4, 1);
  const snow = new Color4(0.78, 0.8, 0.76, 1);
  if (h < SEA_LEVEL + 3) return Color4.Lerp(sand, grass, smoothstep((h - SEA_LEVEL) / 3));
  if (h < 52) return Color4.Lerp(grass, rock, smoothstep((h - 28) / 24));
  return Color4.Lerp(rock, snow, smoothstep((h - 72) / 24));
}

const smoothstep = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export function createWorldGrid(scene: Scene, heightmap: Heightmap) {
  let visible = false;
  let mesh: LinesMesh | null = null;

  function rebuild(): void {
    mesh?.dispose();
    mesh = null;
    if (!visible) return;

    const lines: Vector3[][] = [];
    for (let i = 0; i < heightmap.count; i++) {
      const row: Vector3[] = [];
      const column: Vector3[] = [];
      for (let j = 0; j < heightmap.count; j++) {
        row.push(new Vector3(heightmap.worldX(j), heightmap.at(j, i) + 0.04, heightmap.worldZ(i)));
        column.push(new Vector3(heightmap.worldX(i), heightmap.at(i, j) + 0.04, heightmap.worldZ(j)));
      }
      lines.push(row, column);
    }

    mesh = MeshBuilder.CreateLineSystem("world-grid", { lines }, scene);
    mesh.color = new Color3(0.36, 0.42, 0.45);
    mesh.alpha = 0.2;
    mesh.isPickable = false;
  }

  return {
    rebuild,
    setVisible(next: boolean): void {
      visible = next;
      rebuild();
    },
  };
}
