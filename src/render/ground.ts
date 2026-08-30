import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { Material } from "@babylonjs/core/Materials/material";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3, Color4, Vector3 } from "@babylonjs/core/Maths/math";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { SEA_LEVEL, type Heightmap, type TerrainBounds } from "../sim/heightmap";

export const GROUND_SIZE = 5400;
export const GROUND_CELL = 8;

/**
 * The pickable ground, one vertex per heightmap cell. `refresh` re-uploads the positions
 * in place after roads have been cut into the map, rather than rebuilding the mesh.
 */
export function createGround(scene: Scene, heightmap: Heightmap) {
  const material = new StandardMaterial("ground", scene);
  material.diffuseColor = new Color3(0.94, 0.94, 0.9);
  material.specularColor = new Color3(0.018, 0.017, 0.014);
  material.specularPower = 10;
  material.bumpTexture = terrainBumpTexture(scene);
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

  function refresh(dirty?: TerrainBounds): void {
    const bounds = dirty ? groundGridBounds(heightmap, dirty) : { minIx: 0, maxIx: n - 1, minIz: 0, maxIz: n - 1 };
    for (let iz = bounds.minIz; iz <= bounds.maxIz; iz++) {
      for (let ix = bounds.minIx; ix <= bounds.maxIx; ix++) {
        const h = heightmap.at(ix, iz);
        const i = iz * n + ix;
        positions[i * 3 + 1] = h;
        writeTerrainColor(colors, i * 4, h, heightmap.baseAt(ix, iz), terrainSlope(heightmap, ix, iz), heightmap.worldX(ix), heightmap.worldZ(iz));
      }
    }
    if (dirty) {
      uploadRows(mesh, VertexBuffer.PositionKind, positions, n, 3, bounds);
      uploadRows(mesh, VertexBuffer.ColorKind, colors, n, 4, bounds);
    } else {
      mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
      mesh.updateVerticesData(VertexBuffer.ColorKind, colors);
    }

    VertexData.ComputeNormals(positions, indices, normals as unknown as number[]);
    if (dirty) uploadRows(mesh, VertexBuffer.NormalKind, normals, n, 3, expandGridBounds(bounds, n, 1));
    else mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
    mesh.refreshBoundingInfo();
  }

  refresh();
  return { mesh, refresh };
}

function terrainBumpTexture(scene: Scene): DynamicTexture {
  const size = 128;
  const texture = new DynamicTexture("ground-bump", { width: size, height: size }, scene, false);
  const context = texture.getContext();
  const image = context.getImageData(0, 0, size, size);
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const coarse = valueNoise(x, z, 24);
      const fine = valueNoise(x + 200, z - 90, 7);
      const grain = hash(x, z);
      const v = Math.round(108 + coarse * 78 + fine * 42 + grain * 18);
      const i = (z * size + x) * 4;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  texture.update(false);
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.uScale = GROUND_SIZE / 28;
  texture.vScale = GROUND_SIZE / 28;
  texture.level = 0.13;
  return texture;
}

function terrainSlope(heightmap: Heightmap, ix: number, iz: number): number {
  const dx = (heightmap.at(ix + 1, iz) - heightmap.at(ix - 1, iz)) / (heightmap.cell * 2);
  const dz = (heightmap.at(ix, iz + 1) - heightmap.at(ix, iz - 1)) / (heightmap.cell * 2);
  return Math.hypot(dx, dz);
}

function uploadRows(
  mesh: Mesh,
  kind: string,
  data: Float32Array,
  rowWidth: number,
  stride: number,
  bounds: { minIx: number; maxIx: number; minIz: number; maxIz: number },
): void {
  const buffer = mesh.getVertexBuffer(kind);
  if (!buffer) return;
  const width = bounds.maxIx - bounds.minIx + 1;
  for (let iz = bounds.minIz; iz <= bounds.maxIz; iz++) {
    const start = (iz * rowWidth + bounds.minIx) * stride;
    buffer.updateDirectly(data.subarray(start, start + width * stride), start);
  }
}

function expandGridBounds(
  bounds: { minIx: number; maxIx: number; minIz: number; maxIz: number },
  count: number,
  by: number,
): { minIx: number; maxIx: number; minIz: number; maxIz: number } {
  return {
    minIx: Math.max(0, bounds.minIx - by),
    maxIx: Math.min(count - 1, bounds.maxIx + by),
    minIz: Math.max(0, bounds.minIz - by),
    maxIz: Math.min(count - 1, bounds.maxIz + by),
  };
}

function groundGridBounds(heightmap: Heightmap, bounds: TerrainBounds): { minIx: number; maxIx: number; minIz: number; maxIz: number } {
  const lo = (v: number) => Math.min(heightmap.count - 1, Math.max(0, Math.floor((v + heightmap.size / 2) / heightmap.cell)));
  const hi = (v: number) => Math.min(heightmap.count - 1, Math.max(0, Math.ceil((v + heightmap.size / 2) / heightmap.cell)));
  return { minIx: lo(bounds.minX), maxIx: hi(bounds.maxX), minIz: lo(bounds.minZ), maxIz: hi(bounds.maxZ) };
}

/**
 * Water seen edge-on mirrors the sky, seen from above stays deep blue. This is what makes water
 * shine — a sun glint can't reach a grazing camera on a flat plane. Both water surfaces share it:
 * if only one reacts to the view angle, the seam between them lights up.
 * ponytail: Fresnel term, not a mirror/reflection probe — there is nothing out there to mirror.
 */
function waterFresnel(): FresnelParameters {
  return new FresnelParameters({
    bias: 0.05,
    power: 2,
    leftColor: new Color3(0.42, 0.62, 0.78), // grazing: the sky
    rightColor: new Color3(0.01, 0.09, 0.22), // top-down: the deep
  });
}

/**
 * The water past the detailed ocean tile: one big opaque disc, so the square edge of the
 * animated mesh always sits on more water. Fog turns it into sky at the horizon.
 * ponytail: a disc, not a projected grid — nothing here needs waves you can't see.
 */
/**
 * Half an island's worth of extra seabed past the terrain mesh, so its edge can never show even
 * if the water above it is clear. Sits just under the terrain's own floor (-140 out past the
 * coast). ponytail: a flat ring at the floor height, not an extended heightmap — growing the
 * heightmap 50% would quadruple `refresh`'s cost on every road edit for scenery nobody builds on.
 */
function createSeafloorSkirt(scene: Scene): Mesh {
  const material = new StandardMaterial("seafloor-skirt", scene);
  material.diffuseColor = new Color3(0.05, 0.1, 0.15); // the deep end of terrainColor's seafloor
  material.specularColor = Color3.Black();
  const mesh = MeshBuilder.CreateLathe(
    "seafloor-skirt",
    {
      shape: [new Vector3(GROUND_SIZE / 2, 0, 0), new Vector3(GROUND_SIZE / 2 + 1500, 0, 0)],
      tessellation: 64,
      sideOrientation: Mesh.DOUBLESIDE,
    },
    scene,
  );
  mesh.material = material;
  mesh.isPickable = false;
  mesh.position.y = -145; // just below the terrain's own deep floor, so the corners win any overlap
  mesh.alwaysSelectAsActiveMesh = true;
  return mesh;
}

function createFarOcean(scene: Scene): Mesh {
  const material = new StandardMaterial("ocean-far", scene);
  material.diffuseColor = Color3.Black();
  material.emissiveColor = Color3.White(); // modulated by the Fresnel term below
  material.specularColor = new Color3(0.45, 0.68, 0.72);
  material.specularPower = 32;
  material.emissiveFresnelParameters = waterFresnel();
  // A ring, not a disc: the terrain mesh (and its seafloor) reaches GROUND_SIZE / 2, and a disc
  // would sit on top of it, hiding the sand under the shallows behind a flat turquoise slab.
  // ponytail: start where the terrain ends, rather than fading a disc out over the shore.
  const mesh = MeshBuilder.CreateLathe(
    "ocean-far",
    {
      shape: [new Vector3(GROUND_SIZE / 2, 0, 0), new Vector3(50_000, 0, 0)],
      tessellation: 64,
      sideOrientation: Mesh.DOUBLESIDE,
    },
    scene,
  );
  mesh.material = material;
  mesh.isPickable = false;
  mesh.receiveShadows = false;
  // Below the deepest wave trough (amplitude peaks near 2.4), or it pokes through the animated
  // ocean as bright patches. ponytail: one constant, not a depth-sorted render pass.
  mesh.position.y = SEA_LEVEL - 4;
  mesh.alwaysSelectAsActiveMesh = true;
  return mesh;
}

export function createOcean(scene: Scene) {
  createSeafloorSkirt(scene);
  createFarOcean(scene);
  const material = new StandardMaterial("ocean", scene);
  material.diffuseColor = Color3.White();
  material.emissiveColor = Color3.White();
  material.emissiveFresnelParameters = waterFresnel();
  material.specularColor = new Color3(0.45, 0.68, 0.72);
  material.transparencyMode = Material.MATERIAL_ALPHABLEND;

  const size = GROUND_SIZE;
  const cells = 72;
  const positions = new Float32Array((cells + 1) * (cells + 1) * 3);
  const normals = new Float32Array((cells + 1) * (cells + 1) * 3);
  const colors = new Float32Array((cells + 1) * (cells + 1) * 4);
  const indices: number[] = [];
  for (let z = 0; z <= cells; z++) {
    for (let x = 0; x <= cells; x++) {
      const i = z * (cells + 1) + x;
      const wx = stretch((x / cells) * 2 - 1, size / 2);
      const wz = stretch((z / cells) * 2 - 1, size / 2);
      const depth = oceanDepth(wx, wz);
      positions[i * 3] = wx;
      positions[i * 3 + 2] = wz;
      oceanColor(depth, waveNoise(wx, wz)).toArray(colors, i * 4);
      const nextX = stretch(((x + 1) / cells) * 2 - 1, size / 2);
      const nextZ = stretch(((z + 1) / cells) * 2 - 1, size / 2);
      if (x < cells && z < cells && Math.hypot((wx + nextX) / 2, (wz + nextZ) / 2) > 1400) {
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
      const depth = oceanDepth(current[i]!, current[i + 2]!);
      // Cells grow with distance, so waves out there are undersampled — fade them out instead of
      // letting them alias. ponytail: one fade, not a LOD system.
      const reach = 1 - smoothstep((Math.hypot(current[i]!, current[i + 2]!) - 3000) / 5000);
      const amplitude = (0.25 + depth * 1.25) * reach;
      current[i + 1] =
        Math.sin(current[i]! * 0.015 + t) * amplitude + Math.cos(current[i + 2]! * 0.012 + t * 0.7) * amplitude * 0.6;
    }
    mesh.updateVerticesData(VertexBuffer.PositionKind, current);
    VertexData.ComputeNormals(current, indices, normals as unknown as number[]);
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
  });
  return mesh;
}

/**
 * Maps a [-1,1] grid coordinate onto the world so cells keep their spacing near the island and
 * stretch outwards: the animated water now reaches ~20k instead of 2.7k for the same vertex count,
 * pushing the seam with the flat far ocean past where anyone can see it.
 * ponytail: cubic stretch on the existing grid, not a second LOD mesh.
 */
function stretch(t: number, half: number): number {
  return t * (1 + 6.4 * t * t) * half;
}

function oceanDepth(x: number, z: number): number {
  return smoothstep((Math.hypot(x, z) - 1440) / 1040);
}

function oceanColor(depth: number, noise: number): Color4 {
  const color = Color4.Lerp(new Color4(0.08, 0.5, 0.48, 1), new Color4(0.01, 0.09, 0.22, 1), depth * 0.85 + noise * 0.15);
  // Clear over the sand, fully opaque by the time the seabed drops away (~2480 out), which also
  // hides the far ocean ring starting at 2700. ponytail: one alpha ramp, no depth-fade shader.
  color.a = 0.05 + smoothstep(depth) * 0.95;
  return color;
}

function distanceFromIsland(x: number, z: number): number {
  return smoothstep((Math.hypot(x, z) - 1520) / 1000);
}

function waveNoise(x: number, z: number): number {
  return (Math.sin(x * 0.017 + z * 0.031) + Math.sin(x * 0.043 - z * 0.019)) * 0.25 + 0.5;
}

type Rgba = readonly [number, number, number, number];

const SAND: Rgba = [0.58, 0.5, 0.29, 1];
const GRASS: Rgba = [0.31, 0.5, 0.27, 1];
const ROCK: Rgba = [0.34, 0.35, 0.31, 1];
const SNOW: Rgba = [0.86, 0.87, 0.8, 1];
const SEAFLOOR_NEAR: Rgba = [0.19, 0.36, 0.32, 1];
const SEAFLOOR_FAR: Rgba = [0.05, 0.1, 0.15, 1];

export function writeTerrainColor(out: Float32Array, offset: number, h: number, baseH: number, slope: number, x: number, z: number): void {
  const sea = distanceFromIsland(x, z);
  const seaR = mix(SEAFLOOR_NEAR[0], SEAFLOOR_FAR[0], sea);
  const seaG = mix(SEAFLOOR_NEAR[1], SEAFLOOR_FAR[1], sea);
  const seaB = mix(SEAFLOOR_NEAR[2], SEAFLOOR_FAR[2], sea);
  let r: number;
  let g: number;
  let b: number;
  if (h < SEA_LEVEL + 4) {
    const shore = smoothstep((h - SEA_LEVEL) / 8);
    const shoreR = mix(SAND[0], GRASS[0], shore);
    const shoreG = mix(SAND[1], GRASS[1], shore);
    const shoreB = mix(SAND[2], GRASS[2], shore);
    const beach = smoothstep((h - (SEA_LEVEL - 10)) / 14);
    r = mix(seaR, shoreR, beach);
    g = mix(seaG, shoreG, beach);
    b = mix(seaB, shoreB, beach);
  } else if (h < 88) {
    const t = smoothstep((h - 38) / 50);
    r = mix(GRASS[0], ROCK[0], t);
    g = mix(GRASS[1], ROCK[1], t);
    b = mix(GRASS[2], ROCK[2], t);
  } else {
    const t = smoothstep((h - 118) / 36);
    r = mix(ROCK[0], SNOW[0], t);
    g = mix(ROCK[1], SNOW[1], t);
    b = mix(ROCK[2], SNOW[2], t);
  }

  const dryPatch = valueNoise(x - 900, z + 300, 380);
  const lushPatch = valueNoise(x + 1200, z - 850, 520);
  const roadWear = smoothstep((baseH - h - 0.08) / 0.7);
  if (h > SEA_LEVEL + 2 && h < 44) {
    const dry = smoothstep((dryPatch - 0.45) / 0.35) * 0.22;
    const lush = smoothstep((lushPatch - 0.58) / 0.22) * 0.12;
    r = mix(r, 0.46, dry);
    g = mix(g, 0.43, dry);
    b = mix(b, 0.25, dry);
    r = mix(r, 0.24, lush);
    g = mix(g, 0.55, lush);
    b = mix(b, 0.25, lush);
  }
  if (h > SEA_LEVEL + 4) {
    const wetPocket = smoothstep((26 - h) / 18) * (1 - smoothstep(slope / 0.28)) * (0.55 + valueNoise(x - 140, z + 680, 180) * 0.45);
    const rockFace = smoothstep((slope - 0.18) / 0.5) * (0.65 + valueNoise(x + 540, z + 210, 70) * 0.35);
    r = mix(r, 0.2, wetPocket * 0.32);
    g = mix(g, 0.38, wetPocket * 0.28);
    b = mix(b, 0.22, wetPocket * 0.24);
    r = mix(r, 0.38, rockFace * 0.36);
    g = mix(g, 0.37, rockFace * 0.34);
    b = mix(b, 0.32, rockFace * 0.32);
  }
  if (roadWear > 0) {
    const dust = valueNoise(x + 300, z - 1200, 36) * 0.16;
    r = mix(r, 0.42 + dust, roadWear * 0.42);
    g = mix(g, 0.39 + dust, roadWear * 0.38);
    b = mix(b, 0.30 + dust * 0.5, roadWear * 0.34);
  }

  // Rotated/noisy octaves break the mesh grid; sparse flecks stand in for grass clumps, stones
  // and leaf litter without owning thousands of detail meshes.
  const fine = valueNoise(x * SIN45 + z * SIN45, z * SIN45 - x * SIN45, 52);
  const speck = valueNoise(x + 17, z - 31, 13);
  const shade = 0.82 + valueNoise(x, z, 150) * 0.16 + fine * 0.24 + (speck > 0.82 && h > SEA_LEVEL + 4 ? (speck - 0.82) * 0.5 : 0);
  const tint = (valueNoise(x + 700, z - 400, 90) - 0.5) * 0.08;
  out[offset] = r * shade * (1 - tint);
  out[offset + 1] = g * shade * (1 + tint * 0.6);
  out[offset + 2] = b * shade * (1 - tint * 0.4);
  out[offset + 3] = 1;
}

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** cos/sin of 45 degrees: turns a noise octave off the mesh axes. */
const SIN45 = Math.SQRT1_2;

function valueNoise(x: number, z: number, scale: number): number {
  const sx = x / scale;
  const sz = z / scale;
  const x0 = Math.floor(sx);
  const z0 = Math.floor(sz);
  const tx = smoothstep(sx - x0);
  const tz = smoothstep(sz - z0);
  const top = hash(x0, z0) * (1 - tx) + hash(x0 + 1, z0) * tx;
  const bottom = hash(x0, z0 + 1) * (1 - tx) + hash(x0 + 1, z0 + 1) * tx;
  return top * (1 - tz) + bottom * tz;
}

function hash(x: number, z: number): number {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

const smoothstep = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export function createWorldGrid(scene: Scene, heightmap: Heightmap) {
  let visible = false;
  let mesh: LinesMesh | null = null;
  const stride = 8;

  function rebuild(dirty?: TerrainBounds): void {
    // ponytail: measured at 0 ms hidden and ~2 ms visible on the demo city; bound it if that stops holding.
    if (dirty) return;
    mesh?.dispose();
    mesh = null;
    if (!visible) return;

    const lines: Vector3[][] = [];
    const indices = gridIndices(heightmap.count, stride);
    for (const i of indices) {
      const row: Vector3[] = [];
      const column: Vector3[] = [];
      for (const j of indices) {
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

function gridIndices(count: number, stride: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < count; i += stride) indices.push(i);
  if (indices.at(-1) !== count - 1) indices.push(count - 1);
  return indices;
}
