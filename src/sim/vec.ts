/** Plain 3D vector. The simulation never imports Babylon; the renderer converts. */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export const add = (a: Vec3, b: Vec3): Vec3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: Vec3, b: Vec3): Vec3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a: Vec3, k: number): Vec3 => v3(a.x * k, a.y * k, a.z * k);
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 =>
  v3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);

/** Ground distance, ignoring elevation. Road lengths and slot spacing are planimetric. */
export const distXZ = (a: Vec3, b: Vec3): number => Math.hypot(b.x - a.x, b.z - a.z);

export function normalizeXZ(a: Vec3): Vec3 {
  const l = Math.hypot(a.x, a.z);
  return l < 1e-9 ? v3(0, 0, 0) : v3(a.x / l, 0, a.z / l);
}

/** Rotate a ground direction a quarter turn: the road's left-hand normal. */
export const perpXZ = (a: Vec3): Vec3 => v3(-a.z, 0, a.x);
