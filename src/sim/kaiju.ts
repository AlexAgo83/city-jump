import { distXZ, lerp, type Vec3 } from "./vec.js";
import { WAVE_STARTING_VALUES } from "./wave.js";

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

export interface KaijuAssaultState {
  readonly position: Vec3;
  readonly target: Vec3 | null;
  readonly mode: "walking" | "attacking" | "idle";
  readonly attackSeconds: number;
  readonly destroyed: Vec3 | null;
}

export const KAIJU_ATTACK_SECONDS = 5;

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

export function createKaijuAssault(position: Vec3): KaijuAssaultState {
  return { position, target: null, mode: "idle", attackSeconds: 0, destroyed: null };
}

export function advanceKaijuAssault(state: KaijuAssaultState, buildings: readonly Vec3[], dtSeconds: number, speed: number = WAVE_STARTING_VALUES.kaijuSpeedMps, attackDuration = KAIJU_ATTACK_SECONDS): KaijuAssaultState {
  let targets = state.destroyed ? buildings.filter((building) => !sameXZ(building, state.destroyed!)) : [...buildings];
  let position = state.position;
  let target = state.target && targets.some((building) => sameXZ(building, state.target!)) ? state.target : nearest(targets, state.position);
  let mode: KaijuAssaultState["mode"] = !target ? "idle" : state.mode === "attacking" && sameXZ(target, state.position) ? "attacking" : "walking";
  let attackSeconds = mode === "attacking" ? state.attackSeconds : 0;
  let remaining = Math.max(0, dtSeconds);
  let destroyed: Vec3 | null = null;

  // Drain large ticks too: tests and future callers are not all locked to the 0.25 s combat step.
  while (target && remaining > 0) {
    const distance = distXZ(position, target);
    if (distance > 0) {
      const travel = Math.min(distance, remaining * speed);
      position = lerp(position, target, travel / distance);
      remaining -= travel / speed;
      mode = distance === travel ? "attacking" : "walking";
      if (mode === "walking") break;
    }
    const attack = Math.min(remaining, attackDuration - attackSeconds);
    attackSeconds += attack;
    remaining -= attack;
    if (attackSeconds >= attackDuration) {
      destroyed = target;
      targets = targets.filter((building) => !sameXZ(building, destroyed!));
      target = nearest(targets, position);
      mode = target ? "walking" : "idle";
      attackSeconds = 0;
    }
  }

  return { position, target, mode, attackSeconds, destroyed };
}

export function landingPoint(seed: string, bounds: MapBounds, bridge: Vec3): Vec3 {
  const edges: Edge[] = [
    { side: "west", x: bounds.minX, z0: bounds.minZ, z1: bounds.maxZ },
    { side: "east", x: bounds.maxX, z0: bounds.minZ, z1: bounds.maxZ },
    { side: "north", z: bounds.minZ, x0: bounds.minX, x1: bounds.maxX },
    { side: "south", z: bounds.maxZ, x0: bounds.minX, x1: bounds.maxX },
  ];
  const weighted = edges.map((edge) => ({ edge, weight: Math.max(1, edgeDistance(edge, bridge)) }));
  const roll = random(`${seed}:edge`) * weighted.reduce((sum, edge) => sum + edge.weight, 0);
  let total = 0;
  const chosen = weighted.find((edge) => {
    total += edge.weight;
    return roll < total;
  }) ?? weighted[weighted.length - 1]!;
  const t = random(`${seed}:t`);
  return "x" in chosen.edge
    ? { x: chosen.edge.x, y: 0, z: chosen.edge.z0 + (chosen.edge.z1 - chosen.edge.z0) * t }
    : { x: chosen.edge.x0 + (chosen.edge.x1 - chosen.edge.x0) * t, y: 0, z: chosen.edge.z };
}

function nearest(points: readonly Vec3[], from: Vec3): Vec3 | null {
  return points.reduce<Vec3 | null>((best, point) => (!best || distXZ(point, from) < distXZ(best, from) ? point : best), null);
}

function sameXZ(a: Vec3, b: Vec3): boolean {
  return Math.abs(a.x - b.x) < 0.01 && Math.abs(a.z - b.z) < 0.01;
}

function edgeDistance(edge: Edge, point: Vec3): number {
  return "x" in edge ? Math.abs(point.x - edge.x) : Math.abs(point.z - edge.z);
}

function random(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return ((hash >>> 0) % 1_000_000) / 1_000_000;
}
