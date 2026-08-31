import { distXZ, lerp, type Vec3 } from "./vec";
import { WAVE_STARTING_VALUES } from "./wave";

export interface MapBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface KaijuPlan {
  readonly landing: Vec3;
  readonly coast: Vec3;
  readonly target: Vec3 | null;
  readonly path: readonly Vec3[];
}

type Edge =
  | { readonly side: "west" | "east"; readonly x: number; readonly z0: number; readonly z1: number }
  | { readonly side: "north" | "south"; readonly z: number; readonly x0: number; readonly x1: number };

export function planKaiju(seed: string, bounds: MapBounds, coast: readonly Vec3[], buildings: readonly Vec3[], bridge: Vec3): KaijuPlan {
  const landing = landingPoint(seed, bounds, bridge);
  const coastPoint = nearest(coast, landing) ?? landing;
  const target = nearest(buildings, coastPoint);
  const path = target ? [landing, coastPoint, target] : [landing, coastPoint];
  return { landing, coast: coastPoint, target, path };
}

export function kaijuPositionAt(plan: KaijuPlan, seconds: number, speed = WAVE_STARTING_VALUES.kaijuSpeedMps): Vec3 {
  let remaining = Math.max(0, seconds) * speed;
  for (let i = 1; i < plan.path.length; i++) {
    const from = plan.path[i - 1]!;
    const to = plan.path[i]!;
    const length = distXZ(from, to);
    if (remaining <= length) return lerp(from, to, length === 0 ? 1 : remaining / length);
    remaining -= length;
  }
  return plan.path[plan.path.length - 1]!;
}

export function landingPoint(seed: string, bounds: MapBounds, bridge: Vec3): Vec3 {
  const edges: Edge[] = [
    { side: "west", x: bounds.minX, z0: bounds.minZ, z1: bounds.maxZ },
    { side: "east", x: bounds.maxX, z0: bounds.minZ, z1: bounds.maxZ },
    { side: "north", z: bounds.minZ, x0: bounds.minX, x1: bounds.maxX },
    { side: "south", z: bounds.maxZ, x0: bounds.minX, x1: bounds.maxX },
  ];
  const ranked = edges
    .map((edge, index) => ({ edge, index, distance: edgeDistance(edge, bridge) }))
    .sort((a, b) => b.distance - a.distance);
  const chosen = ranked[Math.floor(random(`${seed}:edge`) * 2)]!;
  const t = random(`${seed}:t`);
  return "x" in chosen.edge
    ? { x: chosen.edge.x, y: 0, z: chosen.edge.z0 + (chosen.edge.z1 - chosen.edge.z0) * t }
    : { x: chosen.edge.x0 + (chosen.edge.x1 - chosen.edge.x0) * t, y: 0, z: chosen.edge.z };
}

function nearest(points: readonly Vec3[], from: Vec3): Vec3 | null {
  return points.reduce<Vec3 | null>((best, point) => (!best || distXZ(point, from) < distXZ(best, from) ? point : best), null);
}

function edgeDistance(edge: Edge, point: Vec3): number {
  return "x" in edge ? Math.abs(point.x - edge.x) : Math.abs(point.z - edge.z);
}

function random(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return ((hash >>> 0) % 1_000_000) / 1_000_000;
}
