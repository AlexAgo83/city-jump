import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import type { Scene } from "@babylonjs/core/scene";
import type { TreeSpeciesId } from "./trees";

/** Grounded geometry, shared by every tree of a species: one wood mesh and one crown. */
export function createTreeModel(scene: Scene, species: TreeSpeciesId, bark: Color3, foliage: Color3): { trunk: Mesh; canopy: Mesh } {
  const wood: Mesh[] = [];
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  const vertex = (point: Vector3, color: Color3): number => {
    const index = positions.length / 3;
    positions.push(point.x, point.y, point.z);
    colors.push(color.r, color.g, color.b, 1);
    return index;
  };
  const branch = (path: Vector3[], radius: number, tip: number): void => {
    wood.push(
      MeshBuilder.CreateTube(
        "tree_branch",
        {
          path,
          tessellation: 5,
          cap: Mesh.CAP_ALL,
          radiusFunction: (i) => radius + ((tip - radius) * i) / (path.length - 1),
        },
        scene,
      ),
    );
  };
  const leaf = (center: Vector3, along: Vector3, across: Vector3, length: number, width: number, color: Color3): void => {
    const a = vertex(center.add(new Vector3(0, width * 0.18, 0)), color.scale(1.06));
    const b = vertex(center.add(along.scale(length)), color);
    const c = vertex(center.add(across.scale(width)), color.scale(0.82));
    const d = vertex(center.subtract(along.scale(length * 0.65)), color.scale(0.72));
    const e = vertex(center.subtract(across.scale(width)), color);
    indices.push(a, b, c, a, c, d, a, d, e, a, e, b);
  };

  if (species === "fir") {
    branch([new Vector3(0, 0.1, 0), new Vector3(0.12, 4, 0), new Vector3(-0.12, 8, 0.15), new Vector3(0.08, 12.3, 0.05)], 0.42, 0.025);
    for (let tier = 0; tier < 7; tier++) {
      const y = 2.8 + tier * 1.25;
      const radius = 3.0 - tier * 0.36;
      const centre = new Vector3(Math.sin(tier) * 0.16, y, Math.cos(tier) * 0.13);
      const rings: number[][] = [];
      for (let ring = 0; ring < 3; ring++) {
        rings.push(
          Array.from({ length: 18 }, (_, i) => {
            const angle = (i / 18) * Math.PI * 2 + tier * 0.73;
            const spread = radius * [1, 0.63, 0.06][ring]! * (0.72 + noise(tier * 31 + i) * 0.28);
            const height = [0, 0.75, 2.1][ring]! + (ring === 0 ? (i % 2 ? 0.3 : -0.3) : 0);
            return vertex(
              centre.add(new Vector3(Math.cos(angle) * spread, height, Math.sin(angle) * spread)),
              foliage.scale(0.63 + ring * 0.12 + noise(i + tier * 97) * 0.23),
            );
          }),
        );
      }
      for (let i = 0; i < 18; i++) {
        const next = (i + 1) % 18;
        for (let ring = 0; ring < 2; ring++) {
          const lower = rings[ring]!,
            upper = rings[ring + 1]!;
          indices.push(lower[i]!, upper[i]!, lower[next]!, lower[next]!, upper[i]!, upper[next]!);
        }
      }
      const bottom = vertex(centre.add(new Vector3(0, 0.3, 0)), foliage.scale(0.5));
      for (let i = 0; i < 18; i++) indices.push(bottom, rings[0]![(i + 1) % 18]!, rings[0]![i]!);
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + tier * 0.73;
        branch(
          [
            centre,
            centre.add(new Vector3(Math.cos(angle) * radius * 0.45, -0.2, Math.sin(angle) * radius * 0.45)),
            centre.add(new Vector3(Math.cos(angle) * radius * 0.85, -0.1, Math.sin(angle) * radius * 0.85)),
          ],
          0.08,
          0.012,
        );
      }
    }
  } else if (species === "palm") {
    const crown = new Vector3(0.95, 10, 0.3);
    branch([new Vector3(0, 0.1, 0), new Vector3(-0.2, 2, 0), new Vector3(0.1, 5, 0.1), new Vector3(0.7, 8, 0.2), crown], 0.34, 0.2);
    for (let i = 0; i < 11; i++) {
      const angle = (i * Math.PI * 2) / 11;
      const radial = new Vector3(Math.cos(angle), 0, Math.sin(angle));
      const across = new Vector3(-Math.sin(angle), 0, Math.cos(angle));
      const length = 4.1 + noise(i) * 1.1;
      const at = (t: number) =>
        crown.add(radial.scale(length * t)).add(new Vector3(0, Math.sin(t * Math.PI) * 1.8 - t * t * (1.1 + noise(i + 17)), 0));
      branch([at(0), at(0.3), at(0.65), at(1)], 0.055, 0.009);
      for (let j = 1; j < 12; j++) {
        const t = j / 12;
        const width = Math.sin(t * Math.PI) * 0.95;
        for (const side of [-1, 1]) {
          const direction = across
            .scale(side)
            .add(radial.scale(0.48))
            .add(new Vector3(0, -0.22, 0))
            .normalize();
          leaf(at(t).add(direction.scale(width * 0.5)), direction, radial, width * 0.75, 0.2, foliage.scale(0.7 + noise(i * 31 + j) * 0.4));
        }
      }
    }
  } else {
    const oak = species === "oak";
    const height = oak ? 6.3 : 4;
    const crownRadius = oak ? 2.8 : 1.8;
    branch(
      [
        new Vector3(0, 0.12, 0),
        new Vector3(0.15, height * 0.28, -0.12),
        new Vector3(-0.22, height * 0.62, 0.18),
        new Vector3(0.12, height, 0),
      ],
      oak ? 0.62 : 0.35,
      0.12,
    );
    for (let i = 0; i < 12; i++) {
      const angle = i * 2.39996;
      const radius = crownRadius * (0.6 + noise(i) * 0.4);
      const centre = new Vector3(Math.cos(angle) * radius, height - 0.5 + noise(i + 12) * 1.6, Math.sin(angle) * radius);
      const fork = new Vector3(centre.x * 0.5, height * 0.67, centre.z * 0.5);
      branch([new Vector3(0, height * 0.4, 0), fork, centre], oak ? 0.2 : 0.12, 0.025);
      branch([fork, centre.add(new Vector3(0.5, 0.5, -0.4))], 0.07, 0.012);
      for (let j = 0; j < 30; j++) {
        const seed = i * 37 + j;
        const a = noise(seed + 41) * Math.PI * 2;
        const r = Math.sqrt(noise(seed + 73)) * (oak ? 1.7 : 1.25);
        const point = centre.add(new Vector3(Math.cos(a) * r, (noise(seed + 123) - 0.5) * 2, Math.sin(a) * r));
        const along = new Vector3(Math.cos(a), 0.1 + noise(seed + 7) * 0.4, Math.sin(a)).normalize();
        const across = new Vector3(-Math.sin(a), 0, Math.cos(a));
        const size = (oak ? 0.55 : 0.4) + noise(seed + 81) * 0.3;
        leaf(point, along, across, size, size * 0.65, foliage.scale(0.66 + noise(seed + 19) * 0.5));
      }
      if (!oak) {
        const centreFruit = centre.add(new Vector3(0.45, -0.8, 0.25));
        const top = vertex(centreFruit.add(new Vector3(0, 0.16, 0)), new Color3(0.58, 0.15, 0.055));
        const bottom = vertex(centreFruit.add(new Vector3(0, -0.16, 0)), new Color3(0.32, 0.045, 0.018));
        const ring = Array.from({ length: 6 }, (_, j) =>
          vertex(
            centreFruit.add(new Vector3(Math.cos((j * Math.PI) / 3) * 0.16, 0, Math.sin((j * Math.PI) / 3) * 0.16)),
            new Color3(0.65, 0.08, 0.025),
          ),
        );
        for (let j = 0; j < 6; j++) indices.push(top, ring[(j + 1) % 6]!, ring[j]!, bottom, ring[j]!, ring[(j + 1) % 6]!);
      }
    }
  }
  if (species !== "palm")
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      branch([new Vector3(0, 0.55, 0), new Vector3(Math.cos(angle) * 0.75, 0.12, Math.sin(angle) * 0.75)], 0.16, 0.035);
    }

  const trunk = Mesh.MergeMeshes(wood, true, true, undefined, false, false)!;
  trunk.name = `tree_trunks_${species}`;
  const trunkPositions = trunk.getVerticesData(VertexBuffer.PositionKind)!;
  const barkColors = [];
  for (let i = 0; i < trunkPositions.length; i += 3) {
    const variation = 0.72 + noise(i * 0.13) * 0.3 + (species === "palm" ? Math.sin(trunkPositions[i + 1]! * 28) * 0.13 : 0);
    barkColors.push(bark.r * variation, bark.g * variation, bark.b * variation, 1);
  }
  trunk.setVerticesData(VertexBuffer.ColorKind, barkColors);
  const canopy = new Mesh(`tree_canopies_${species}`, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.colors = colors;
  data.normals = [];
  VertexData.ComputeNormals(positions, indices, data.normals);
  data.applyToMesh(canopy);
  return { trunk, canopy };
}

function noise(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}
