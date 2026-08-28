import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3, Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import type { Scene } from "@babylonjs/core/scene";

import type { RoadGraph } from "../sim/graph";
import { SEA_LEVEL, type Heightmap } from "../sim/heightmap";
import { roadType } from "../sim/roadTypes";
import { GRID, SLOT } from "../sim/slots";
import { GROUND_SIZE } from "./ground";
import { daylightAt, sunAzimuthAt } from "./scene";

const FOREST_PATCHES = Array.from({ length: 12 }, (_, i) => {
  const angle = randomish(i, 20) * Math.PI * 2;
  const distance = 260 + randomish(i, 21) * 1050;
  return {
    x: Math.cos(angle) * distance,
    z: Math.sin(angle) * distance,
    radius: 130 + randomish(i, 22) * 190,
    density: 0.45 + randomish(i, 23) * 0.35,
  };
});

export function createTreeRenderer(scene: Scene, heightmap: Heightmap, graph: RoadGraph, shadows: ShadowGenerator) {
  const trunk = MeshBuilder.CreateCylinder("tree_trunks", { height: 5, diameter: 0.8, tessellation: 6 }, scene);
  const leaves = MeshBuilder.CreateCylinder(
    "tree_canopies",
    { height: 8, diameterTop: 0.4, diameterBottom: 5.6, tessellation: 7 },
    scene,
  );
  const groundShadows = MeshBuilder.CreateCylinder("tree_ground_shadows", { height: 0.02, diameter: 1, tessellation: 14 }, scene);

  const trunkMaterial = new StandardMaterial("tree_trunk", scene);
  trunkMaterial.diffuseColor = new Color3(0.25, 0.14, 0.08);
  trunkMaterial.specularColor = Color3.Black();
  trunk.material = trunkMaterial;

  const leafMaterial = new StandardMaterial("tree_canopy", scene);
  leafMaterial.diffuseColor = new Color3(0.12, 0.42, 0.14);
  leafMaterial.specularColor = Color3.Black();
  leaves.material = leafMaterial;

  const shadowMaterial = new StandardMaterial("tree_ground_shadow", scene);
  shadowMaterial.diffuseColor = Color3.Black();
  shadowMaterial.specularColor = Color3.Black();
  shadowMaterial.alpha = 0.18;
  shadowMaterial.disableLighting = true;
  shadowMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
  groundShadows.material = shadowMaterial;

  for (const mesh of [trunk, leaves, groundShadows]) {
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.setEnabled(false);
  }
  for (const mesh of [trunk, leaves]) {
    shadows.addShadowCaster(mesh);
  }

  let treeCount = 0;
  let treeBases: { x: number; y: number; z: number; scale: number }[] = [];
  let sunHour = 14;

  function rebuild(): number {
    const trunkMatrices: Matrix[] = [];
    const leafMatrices: Matrix[] = [];
    const bases: typeof treeBases = [];
    const occupied = new Set<string>();
    const step = 58;
    let i = 0;

    const plant = (px: number, pz: number, seed: number): void => {
      const h = heightmap.heightAt(px, pz);
      const bucket = `${Math.round(px / 10)}:${Math.round(pz / 10)}`;
      if (h <= SEA_LEVEL + 5 || h > 86 || occupied.has(bucket) || nearRoad(graph, px, pz)) return;

      const scale = 0.75 + randomish(seed, 4) * 0.55;
      const yaw = randomish(seed, 5) * Math.PI * 2;
      const rotation = Quaternion.FromEulerAngles(0, yaw, 0);
      trunkMatrices.push(Matrix.Compose(new Vector3(scale, scale, scale), rotation, new Vector3(px, h + 2.5 * scale, pz)));
      leafMatrices.push(Matrix.Compose(new Vector3(scale, scale, scale), rotation, new Vector3(px, h + 8.3 * scale, pz)));
      bases.push({ x: px, y: h, z: pz, scale });
      occupied.add(bucket);
    };

    for (let z = -GROUND_SIZE / 2 + step; z < GROUND_SIZE / 2; z += step) {
      for (let x = -GROUND_SIZE / 2 + step; x < GROUND_SIZE / 2; x += step) {
        const jx = (randomish(i, 1) - 0.5) * step * 0.75;
        const jz = (randomish(i, 2) - 0.5) * step * 0.75;
        const px = x + jx;
        const pz = z + jz;
        if (randomish(i, 3) <= 0.36) plant(px, pz, i);
        i++;
      }
    }

    const forestStep = 16;
    for (const patch of FOREST_PATCHES) {
      for (let z = patch.z - patch.radius; z <= patch.z + patch.radius; z += forestStep) {
        for (let x = patch.x - patch.radius; x <= patch.x + patch.radius; x += forestStep) {
          const seed = i++;
          const px = x + (randomish(seed, 6) - 0.5) * forestStep * 0.65;
          const pz = z + (randomish(seed, 7) - 0.5) * forestStep * 0.65;
          const distance = Math.hypot(px - patch.x, pz - patch.z) / patch.radius;
          const density = patch.density * Math.max(0, 1 - distance * distance);
          if (randomish(seed, 8) <= density) plant(px, pz, seed);
        }
      }
    }

    applyInstances(trunk, trunkMatrices);
    applyInstances(leaves, leafMatrices);
    treeBases = bases;
    updateGroundShadows();
    treeCount = trunkMatrices.length;
    return treeCount;
  }

  function setSunHour(hour: number): void {
    sunHour = hour;
    updateGroundShadows();
  }

  function updateGroundShadows(): void {
    const daylight = daylightAt(sunHour);
    const azimuth = sunAzimuthAt(sunHour);
    if (daylight <= 0.03) {
      applyInstances(groundShadows, []);
      return;
    }

    shadowMaterial.alpha = 0.1 + daylight * 0.16;
    const directionX = Math.cos(azimuth);
    const directionZ = Math.sin(azimuth);
    const length = 2.6 + (1 - daylight) * 6.8;
    const yaw = Math.atan2(-directionZ, directionX);
    const rotation = Quaternion.FromEulerAngles(0, yaw, 0);
    applyInstances(
      groundShadows,
      treeBases.map(({ x, y, z, scale }) =>
        Matrix.Compose(
          new Vector3(length * scale, 1, 1.8 * scale),
          rotation,
          new Vector3(x + directionX * length * scale * 0.45, y + 0.04, z + directionZ * length * scale * 0.45),
        ),
      ),
    );
  }

  return { rebuild, setSunHour, count: () => treeCount };
}

function applyInstances(mesh: Mesh, matrices: Matrix[]): void {
  mesh.thinInstanceCount = 0;
  mesh.setEnabled(matrices.length > 0);
  if (matrices.length === 0) return;

  const buffer = new Float32Array(matrices.length * 16);
  for (const [i, matrix] of matrices.entries()) matrix.copyToArray(buffer, i * 16);
  mesh.thinInstanceSetBuffer("matrix", buffer, 16);
}

function nearRoad(graph: RoadGraph, x: number, z: number): boolean {
  for (const segment of graph.allSegments()) {
    const type = roadType(segment.type);
    if (type.tunnelDepth) continue;
    const reserve = type.width / 2 + SLOT.setback + GRID.depth * GRID.cellSize + 4;
    for (let i = 0; i < segment.samples.length; i += 8) {
      const p = segment.samples[i]!;
      if (Math.hypot(p.x - x, p.z - z) < reserve) return true;
    }
  }
  return false;
}

function randomish(index: number, salt: number): number {
  return fract(Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453);
}

function fract(value: number): number {
  return value - Math.floor(value);
}
