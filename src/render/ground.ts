import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import type { Heightmap } from "../sim/heightmap";

export const GROUND_SIZE = 2000;
export const GROUND_CELL = 8;

/**
 * The pickable ground, one vertex per heightmap cell. `refresh` re-uploads the positions
 * in place after roads have been cut into the map, rather than rebuilding the mesh.
 */
export function createGround(scene: Scene, heightmap: Heightmap) {
  const material = new StandardMaterial("ground", scene);
  material.diffuseColor = new Color3(0.34, 0.42, 0.29);
  material.specularColor = Color3.Black();

  const mesh = new Mesh("ground", scene);
  mesh.material = material;

  const n = heightmap.count;
  const positions = new Float32Array(n * n * 3);
  const normals = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
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
  data.applyToMesh(mesh, true);

  function refresh(): void {
    const current = mesh.getVerticesData(VertexBuffer.PositionKind) as Float32Array;
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        current[(iz * n + ix) * 3 + 1] = heightmap.at(ix, iz);
      }
    }
    mesh.updateVerticesData(VertexBuffer.PositionKind, current);

    const recomputed: number[] = [];
    VertexData.ComputeNormals(current, indices, recomputed);
    mesh.updateVerticesData(VertexBuffer.NormalKind, recomputed);
    mesh.refreshBoundingInfo();
  }

  refresh();
  return { mesh, refresh };
}
