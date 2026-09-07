import type { Heightmap } from "../sim/heightmap";

export interface PickRay {
  readonly origin: { readonly x: number; readonly y: number; readonly z: number };
  readonly direction: { readonly x: number; readonly y: number; readonly z: number };
}

/**
 * The ground is one mesh of 911,250 triangles, and `scene.pick` walks every one of them. That is
 * what a pointer move in the road, zone, nature or bulldoze tools used to cost: 18-19 ms per pick,
 * 42 fps while drawing against 75 stationary.
 *
 * The triangles are a heightfield on a regular grid, so the ray only has to visit the cells it
 * actually crosses. This walks them in order, nearest first, and tests the two triangles of each
 * -- the same two the mesh is built from, so the hit position is the one `scene.pick` returned,
 * not an approximation of it. The first cell that yields a hit holds the nearest one: a cell's
 * triangles cover exactly that cell's footprint, so nothing further along the ray can be closer.
 */
export function pickHeightmap(heightmap: Heightmap, ray: PickRay, maxCells = 4096): { x: number; y: number; z: number } | null {
  const cells = heightmap.count - 1;
  const cell = heightmap.cell;
  const originX = heightmap.worldX(0);
  const originZ = heightmap.worldZ(0);
  const { origin, direction } = ray;

  // Where the ray is over the map at all, in grid coordinates: outside it there is no ground to
  // hit, and starting the walk from the far edge is what keeps a grazing ray bounded.
  let tEnter = 0;
  let tExit = Number.POSITIVE_INFINITY;
  for (const axis of [
    { from: (origin.x - originX) / cell, along: direction.x / cell },
    { from: (origin.z - originZ) / cell, along: direction.z / cell },
  ]) {
    if (Math.abs(axis.along) < 1e-9) {
      if (axis.from < 0 || axis.from > cells) return null;
      continue;
    }
    const near = (0 - axis.from) / axis.along;
    const far = (cells - axis.from) / axis.along;
    tEnter = Math.max(tEnter, Math.min(near, far));
    tExit = Math.min(tExit, Math.max(near, far));
  }
  if (tEnter > tExit) return null;

  const gridX = (origin.x - originX) / cell + tEnter * (direction.x / cell);
  const gridZ = (origin.z - originZ) / cell + tEnter * (direction.z / cell);
  let ix = Math.min(cells - 1, Math.max(0, Math.floor(gridX)));
  let iz = Math.min(cells - 1, Math.max(0, Math.floor(gridZ)));

  const stepX = direction.x > 0 ? 1 : -1;
  const stepZ = direction.z > 0 ? 1 : -1;
  const deltaX = Math.abs(direction.x) < 1e-9 ? Number.POSITIVE_INFINITY : Math.abs(cell / direction.x);
  const deltaZ = Math.abs(direction.z) < 1e-9 ? Number.POSITIVE_INFINITY : Math.abs(cell / direction.z);
  let nextX = deltaX === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : tEnter + (stepX > 0 ? ix + 1 - gridX : gridX - ix) * deltaX;
  let nextZ = deltaZ === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : tEnter + (stepZ > 0 ? iz + 1 - gridZ : gridZ - iz) * deltaZ;

  for (let visited = 0; visited < maxCells; visited++) {
    const hit = pickCell(heightmap, ray, ix, iz);
    if (hit) return hit;
    if (nextX < nextZ) {
      ix += stepX;
      nextX += deltaX;
      if (ix < 0 || ix >= cells) return null;
    } else {
      iz += stepZ;
      nextZ += deltaZ;
      if (iz < 0 || iz >= cells) return null;
    }
    if (Math.min(nextX, nextZ) === Number.POSITIVE_INFINITY) return null;
  }
  return null;
}

/** The two triangles the ground mesh builds from a cell's four corners, in the mesh's own order. */
function pickCell(heightmap: Heightmap, ray: PickRay, ix: number, iz: number): { x: number; y: number; z: number } | null {
  const x0 = heightmap.worldX(ix);
  const x1 = heightmap.worldX(ix + 1);
  const z0 = heightmap.worldZ(iz);
  const z1 = heightmap.worldZ(iz + 1);
  const a = { x: x0, y: heightmap.at(ix, iz), z: z0 };
  const b = { x: x1, y: heightmap.at(ix + 1, iz), z: z0 };
  const c = { x: x0, y: heightmap.at(ix, iz + 1), z: z1 };
  const d = { x: x1, y: heightmap.at(ix + 1, iz + 1), z: z1 };
  const first = intersectTriangle(ray, a, b, c);
  const second = intersectTriangle(ray, b, d, c);
  const t = first === null ? second : second === null ? first : Math.min(first, second);
  if (t === null) return null;
  return { x: ray.origin.x + ray.direction.x * t, y: ray.origin.y + ray.direction.y * t, z: ray.origin.z + ray.direction.z * t };
}

type Point = { x: number; y: number; z: number };

/** Möller-Trumbore, without back-face culling: the ground is picked from either side. */
function intersectTriangle(ray: PickRay, a: Point, b: Point, c: Point): number | null {
  const e1x = b.x - a.x;
  const e1y = b.y - a.y;
  const e1z = b.z - a.z;
  const e2x = c.x - a.x;
  const e2y = c.y - a.y;
  const e2z = c.z - a.z;
  const { direction: r, origin } = ray;
  const px = r.y * e2z - r.z * e2y;
  const py = r.z * e2x - r.x * e2z;
  const pz = r.x * e2y - r.y * e2x;
  const determinant = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(determinant) < 1e-12) return null;
  const inverse = 1 / determinant;
  const tx = origin.x - a.x;
  const ty = origin.y - a.y;
  const tz = origin.z - a.z;
  const u = (tx * px + ty * py + tz * pz) * inverse;
  if (u < 0 || u > 1) return null;
  const qx = ty * e1z - tz * e1y;
  const qy = tz * e1x - tx * e1z;
  const qz = tx * e1y - ty * e1x;
  const v = (r.x * qx + r.y * qy + r.z * qz) * inverse;
  if (v < 0 || u + v > 1) return null;
  const t = (e2x * qx + e2y * qy + e2z * qz) * inverse;
  return t >= 0 ? t : null;
}
