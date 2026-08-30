import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3, Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import type { Scene } from "@babylonjs/core/scene";

import type { RoadGraph } from "../sim/graph";
import { SEA_LEVEL, type Heightmap } from "../sim/heightmap";
import type { Plantings } from "../sim/plantings";
import { roadType } from "../sim/roadTypes";
import { GRID, SLOT } from "../sim/slots";
import { GROUND_SIZE } from "./ground";
import { createGroundShadow } from "./groundShadow";
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
const ROAD_MASK_CELL = 32;

/** Species differ only in geometry and colour; everything else about a tree is shared. */
const SPECIES = {
  fir: {
    trunk: { height: 5, diameter: 0.8 },
    trunkLift: 2.5,
    canopy: (scene: Scene, name: string) =>
      MeshBuilder.CreateCylinder(name, { height: 8, diameterTop: 0.4, diameterBottom: 5.6, tessellation: 7 }, scene),
    canopyLift: 8.3,
    trunkColor: new Color3(0.25, 0.14, 0.08),
    canopyColor: new Color3(0.12, 0.42, 0.14),
    spread: 1,
  },
  oak: {
    trunk: { height: 5, diameter: 1.3 },
    trunkLift: 2.5,
    // A squashed sphere: baked into the vertices so thin instances inherit the shape.
    canopy: (scene: Scene, name: string) => {
      const mesh = MeshBuilder.CreateSphere(name, { diameter: 8, segments: 5 }, scene);
      mesh.scaling.y = 0.72;
      mesh.bakeCurrentTransformIntoVertices();
      return mesh;
    },
    canopyLift: 6.5,
    trunkColor: new Color3(0.3, 0.19, 0.1),
    canopyColor: new Color3(0.2, 0.44, 0.16),
    spread: 1.5,
  },
  apple: {
    trunk: { height: 3.6, diameter: 0.7 },
    trunkLift: 1.8,
    canopy: (scene: Scene, name: string) => MeshBuilder.CreateSphere(name, { diameter: 5.4, segments: 5 }, scene),
    canopyLift: 4.8,
    trunkColor: new Color3(0.28, 0.17, 0.09),
    canopyColor: new Color3(0.34, 0.56, 0.22),
    spread: 1.05,
  },
  palm: {
    trunk: { height: 10, diameter: 0.6 },
    trunkLift: 5,
    canopy: palmCrown,
    canopyLift: 10,
    trunkColor: new Color3(0.42, 0.32, 0.18),
    canopyColor: new Color3(0.26, 0.5, 0.2),
    spread: 1.7,
  },
} as const;

/**
 * Eight tapered blades swung out and down from a crown. Any single cone reads as a parasol,
 * whatever its proportions; separate fronds with sky between them is what makes it a palm.
 * ponytail: baked transforms merged into one mesh, so the whole crown is still one draw call
 * and one thin-instance buffer, like every other species here.
 */
function palmCrown(scene: Scene, name: string): Mesh {
  const FRONDS = 8;
  const parts = Array.from({ length: FRONDS }, (_, i) => {
    const blade = MeshBuilder.CreateCylinder(
      `${name}_frond_${i}`,
      { height: 5.4, diameterTop: 0.25, diameterBottom: 1.5, tessellation: 3 },
      scene,
    );
    // Stand the blade on the origin, then swing it out past horizontal so its tip hangs.
    blade.bakeTransformIntoVertices(Matrix.Translation(0, 2.7, 0));
    // Three angles in rotation: one rising, one near horizontal, one hanging past it. A single
    // angle makes a wheel; the mix gives the crown some depth.
    const droop = 1.4 + (i % 3) * 0.3;
    blade.bakeTransformIntoVertices(Matrix.RotationX(droop).multiply(Matrix.RotationY((i / FRONDS) * Math.PI * 2)));
    return blade;
  });
  const heart = MeshBuilder.CreateSphere(`${name}_heart`, { diameter: 1.3, segments: 4 }, scene);
  const merged = Mesh.MergeMeshes([...parts, heart], true, true, undefined, false, false);
  if (!merged) throw new Error("palm crown failed to merge");
  merged.name = name;
  return merged;
}

export type TreeSpeciesId = keyof typeof SPECIES;
export const TREE_SPECIES = Object.keys(SPECIES) as TreeSpeciesId[];
/** What the landscape grows on its own, and what a save without a species means. */
export const DEFAULT_SPECIES: TreeSpeciesId = "fir";

/** Saves carry a plain string, so an id from another build falls back rather than crashing. */
function speciesOf(id: string): TreeSpeciesId {
  return (TREE_SPECIES as string[]).includes(id) ? (id as TreeSpeciesId) : DEFAULT_SPECIES;
}

export function createTreeRenderer(
  scene: Scene,
  heightmap: Heightmap,
  graph: RoadGraph,
  shadows: ShadowGenerator,
  plantings: Plantings,
) {
  const groundShadows = MeshBuilder.CreateCylinder("tree_ground_shadows", { height: 0.02, diameter: 1, tessellation: 14 }, scene);
  const shadowMaterial = new StandardMaterial("tree_ground_shadow", scene);
  shadowMaterial.diffuseColor = Color3.Black();
  shadowMaterial.specularColor = Color3.Black();
  shadowMaterial.alpha = 0.18;
  shadowMaterial.disableLighting = true;
  shadowMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
  groundShadows.material = shadowMaterial;
  groundShadows.isPickable = false;
  groundShadows.alwaysSelectAsActiveMesh = true;
  groundShadows.setEnabled(false);
  // Static, always-on: the sun-tracking shadow above goes flat and vanishes at night, which
  // otherwise leaves every tree looking pasted onto the ground until sunrise.
  const contactShadow = createGroundShadow(scene, "tree_contact_shadows", 0.26);

  const built = TREE_SPECIES.map((id) => {
    const look = SPECIES[id];
    const trunk = MeshBuilder.CreateCylinder(
      `tree_trunks_${id}`,
      { height: look.trunk.height, diameter: look.trunk.diameter, tessellation: 6 },
      scene,
    );
    const canopy = look.canopy(scene, `tree_canopies_${id}`);

    const trunkMaterial = new StandardMaterial(`tree_trunk_${id}`, scene);
    trunkMaterial.diffuseColor = look.trunkColor;
    trunkMaterial.specularColor = Color3.Black();
    trunk.material = trunkMaterial;

    const canopyMaterial = new StandardMaterial(`tree_canopy_${id}`, scene);
    canopyMaterial.diffuseColor = look.canopyColor;
    canopyMaterial.specularColor = Color3.Black();
    canopy.material = canopyMaterial;

    for (const mesh of [trunk, canopy]) {
      mesh.isPickable = false;
      mesh.alwaysSelectAsActiveMesh = true;
      mesh.setEnabled(false);
      shadows.addShadowCaster(mesh);
    }
    return { id, look, trunk, canopy };
  });

  let treeCount = 0;
  let treeBases: { x: number; y: number; z: number; scale: number; spread: number }[] = [];
  let sunHour = 14;

  function rebuild(): number {
    const matrices = new Map<TreeSpeciesId, { trunks: Matrix[]; canopies: Matrix[] }>(
      TREE_SPECIES.map((id) => [id, { trunks: [], canopies: [] }]),
    );
    const bases: typeof treeBases = [];
    const occupied = new Set<string>();
    const roads = roadMask(graph);
    const step = 58;
    let i = 0;

    const put = (px: number, pz: number, seed: number, h: number, id: TreeSpeciesId): void => {
      const look = SPECIES[id];
      const into = matrices.get(id)!;
      const scale = 0.75 + randomish(seed, 4) * 0.55;
      const size = new Vector3(scale, scale, scale);
      const rotation = Quaternion.FromEulerAngles(0, randomish(seed, 5) * Math.PI * 2, 0);
      into.trunks.push(Matrix.Compose(size, rotation, new Vector3(px, h + look.trunkLift * scale, pz)));
      into.canopies.push(Matrix.Compose(size, rotation, new Vector3(px, h + look.canopyLift * scale, pz)));
      bases.push({ x: px, y: h, z: pz, scale, spread: look.spread });
    };

    /** Scenery: skips water, peaks, roads, its own neighbours, and anything cleared by hand. */
    const plant = (px: number, pz: number, seed: number): void => {
      const h = heightmap.heightAt(px, pz);
      const bucket = `${Math.round(px / 10)}:${Math.round(pz / 10)}`;
      if (h <= SEA_LEVEL + 5 || h > 86 || occupied.has(bucket) || nearRoad(roads, px, pz)) return;
      if (plantings.isCleared(px, pz)) return;
      occupied.add(bucket);
      put(px, pz, seed, h, DEFAULT_SPECIES);
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

    // Hand-planted trees go in last and answer to none of the scenery rules: the player put them
    // there deliberately. Only the sea is off limits, and the tool refuses that before we get here.
    for (const [index, tree] of plantings.plantedTrees.entries()) {
      put(tree.x, tree.z, index + 7919, heightmap.heightAt(tree.x, tree.z), speciesOf(tree.species));
    }

    for (const { id, trunk, canopy } of built) {
      const set = matrices.get(id)!;
      applyInstances(trunk, set.trunks);
      applyInstances(canopy, set.canopies);
    }
    treeBases = bases;
    contactShadow.setInstances(bases.map(({ x, y, z, scale, spread }) => ({ x, y, z, radius: scale * spread * 1.6 })));
    updateGroundShadows();
    treeCount = bases.length;
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
      treeBases.map(({ x, y, z, scale, spread }) =>
        Matrix.Compose(
          new Vector3(length * scale, 1, 1.8 * scale * spread),
          rotation,
          new Vector3(x + directionX * length * scale * 0.45, y + 0.04, z + directionZ * length * scale * 0.45),
        ),
      ),
    );
  }

  /** The nearest tree base to a point, for the bulldozer. Null if nothing is close enough. */
  function nearestTree(x: number, z: number, within: number): { x: number; z: number } | null {
    let best: { x: number; z: number } | null = null;
    let bestDistance = within;
    for (const base of treeBases) {
      const distance = Math.hypot(base.x - x, base.z - z);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x: base.x, z: base.z };
      }
    }
    return best;
  }

  return { rebuild, setSunHour, nearestTree, count: () => treeCount };
}

function applyInstances(mesh: Mesh, matrices: Matrix[]): void {
  mesh.thinInstanceCount = 0;
  mesh.setEnabled(matrices.length > 0);
  if (matrices.length === 0) return;

  const buffer = new Float32Array(matrices.length * 16);
  for (const [i, matrix] of matrices.entries()) matrix.copyToArray(buffer, i * 16);
  mesh.thinInstanceSetBuffer("matrix", buffer, 16, false); // non-static: count changes every rebuild
  mesh.thinInstanceCount = matrices.length;
}

function roadMask(graph: RoadGraph): Map<string, { x: number; z: number; reserve: number }[]> {
  const buckets = new Map<string, { x: number; z: number; reserve: number }[]>();
  for (const segment of graph.allSegments()) {
    const type = roadType(segment.type);
    if (type.tunnelDepth) continue;
    const reserve = type.width / 2 + SLOT.setback + GRID.depth * GRID.cellSize + 4;
    for (let i = 0; i < segment.samples.length; i += 8) {
      const p = segment.samples[i]!;
      const key = maskKey(p.x, p.z);
      const bucket = buckets.get(key) ?? [];
      bucket.push({ x: p.x, z: p.z, reserve });
      buckets.set(key, bucket);
    }
  }
  return buckets;
}

function nearRoad(roads: Map<string, { x: number; z: number; reserve: number }[]>, x: number, z: number): boolean {
  // ponytail: fixed grid buckets; replace with a real spatial index only if local bucket density profiles badly.
  for (let iz = Math.floor(z / ROAD_MASK_CELL) - 2; iz <= Math.floor(z / ROAD_MASK_CELL) + 2; iz++) {
    for (let ix = Math.floor(x / ROAD_MASK_CELL) - 2; ix <= Math.floor(x / ROAD_MASK_CELL) + 2; ix++) {
      for (const p of roads.get(`${ix}:${iz}`) ?? []) {
        if (Math.hypot(p.x - x, p.z - z) < p.reserve) return true;
      }
    }
  }
  return false;
}

function maskKey(x: number, z: number): string {
  return `${Math.floor(x / ROAD_MASK_CELL)}:${Math.floor(z / ROAD_MASK_CELL)}`;
}

function randomish(index: number, salt: number): number {
  return fract(Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453);
}

function fract(value: number): number {
  return value - Math.floor(value);
}
