import type { RoadGraph, SegmentId } from "./graph";
import type { BuildingKind } from "./buildingKinds";
import { distXZ, type Vec3 } from "./vec";

export type UtilityKind = "power" | "water";
export const UTILITY_BITS: Record<UtilityKind, number> = { power: 1, water: 2 };

export interface UtilityProducer {
  readonly id: string;
  readonly kind: UtilityKind;
  readonly segmentId: SegmentId;
}

export interface UtilityDiffuser {
  readonly id: string;
  readonly kind: UtilityKind;
  readonly segmentId: SegmentId;
  readonly position: Vec3;
  readonly radius: number;
}

export type UtilityRole = "producer" | "diffuser";
export type SavedUtility = [role: UtilityRole, kind: UtilityKind, x: number, z: number, radius?: number];

export const UTILITY_CATALOG: Record<UtilityKind, Record<UtilityRole, { readonly cost: number; readonly staff: number; readonly radius: number }>> = {
  power: {
    producer: { cost: 3200, staff: 6, radius: 0 },
    diffuser: { cost: 900, staff: 2, radius: 120 },
  },
  water: {
    producer: { cost: 2400, staff: 4, radius: 0 },
    diffuser: { cost: 750, staff: 2, radius: 120 },
  },
};

export class Utilities {
  private items: AttachedUtility[] = [];

  place(graph: RoadGraph, role: UtilityRole, kind: UtilityKind, x: number, z: number): SavedUtility | null {
    const hit = graph.nearestOnSegment(x, z, 24);
    if (!hit) return null;
    const radius = role === "diffuser" ? UTILITY_CATALOG[kind].diffuser.radius : undefined;
    const saved: SavedUtility = radius ? [role, kind, hit.position.x, hit.position.z, radius] : [role, kind, hit.position.x, hit.position.z];
    this.items.push(attach(saved, hit.segment.id));
    this.restake(graph);
    return saved;
  }

  removeNear(graph: RoadGraph, x: number, z: number, within: number): SavedUtility | null {
    const index = this.items.findIndex((item) => distXZ({ x: item[2], y: 0, z: item[3] }, { x, y: 0, z }) <= within);
    if (index < 0) return null;
    const removed = this.items.splice(index, 1)[0]!;
    this.restake(graph);
    return removed;
  }

  producers(): UtilityProducer[] {
    return this.items
      .filter((item) => item[0] === "producer")
      .map((item) => ({ id: itemId(item), kind: item[1], segmentId: item.segmentId }));
  }

  diffusers(): UtilityDiffuser[] {
    return this.items
      .filter((item) => item[0] === "diffuser")
      .map((item) => ({ id: itemId(item), kind: item[1], segmentId: item.segmentId, position: { x: item[2], y: 0, z: item[3] }, radius: item[4] ?? UTILITY_CATALOG[item[1]].diffuser.radius }));
  }

  nearest(x: number, z: number, within: number): AttachedUtility | null {
    let best: AttachedUtility | null = null;
    let bestDistance = within;
    for (const item of this.items) {
      const distance = distXZ({ x: item[2], y: 0, z: item[3] }, { x, y: 0, z });
      if (distance <= bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }
    return best;
  }

  replaceWith(saved: readonly SavedUtility[], graph: RoadGraph): void {
    this.items = [];
    for (const item of saved) {
      const hit = graph.nearestOnSegment(item[2], item[3], 32);
      if (hit) this.items.push(attach(item, hit.segment.id));
    }
    this.restake(graph);
  }

  toJSON(): SavedUtility[] {
    return this.items.map((item) => [item[0], item[1], item[2], item[3], ...(item[4] ? [item[4]] : [])] as SavedUtility);
  }

  private restake(graph: RoadGraph): void {
    for (const segment of graph.allSegments()) graph.setSegmentUtilities(segment.id, 0);
    for (const item of this.items) if (item[0] === "producer" && graph.hasSegment(item.segmentId)) graph.setSegmentUtilities(item.segmentId, withUtility(graph.segment(item.segmentId).utilities, item[1]));
    for (const diffuser of this.diffusers()) {
      const goals = this.producers().filter((producer) => producer.kind === diffuser.kind).map((producer) => producer.segmentId);
      for (const segmentId of pathToProducer(graph, diffuser.segmentId, goals)) graph.setSegmentUtilities(segmentId, withUtility(graph.segment(segmentId).utilities, diffuser.kind));
    }
  }
}

export function carriesUtility(segment: { readonly utilities?: number }, kind: UtilityKind): boolean {
  return Boolean((segment.utilities ?? 0) & UTILITY_BITS[kind]);
}

export function withUtility(mask: number, kind: UtilityKind, on = true): number {
  return on ? mask | UTILITY_BITS[kind] : mask & ~UTILITY_BITS[kind];
}

export function suppliedDiffusers(graph: RoadGraph, producers: readonly UtilityProducer[], diffusers: readonly UtilityDiffuser[]): Set<string> {
  const supplied = new Set<string>();
  for (const kind of ["power", "water"] as const) {
    const liveSegments = connectedUtilitySegments(graph, kind, producers.filter((producer) => producer.kind === kind).map((producer) => producer.segmentId));
    for (const diffuser of diffusers) if (diffuser.kind === kind && liveSegments.has(diffuser.segmentId)) supplied.add(diffuser.id);
  }
  return supplied;
}

export function coversPoint(diffuser: UtilityDiffuser, point: Pick<Vec3, "x" | "z">): boolean {
  return distXZ(diffuser.position, { x: point.x, y: 0, z: point.z }) <= diffuser.radius;
}

export function requiredUtilities(kind: BuildingKind): UtilityKind[] {
  return kind === "commercial" ? ["power", "water"] : kind === "residential" || kind === "agricultural" ? ["water"] : ["power"];
}

export function missingUtility(
  kind: BuildingKind,
  position: Pick<Vec3, "x" | "z">,
  supplied: ReadonlySet<string>,
  diffusers: readonly UtilityDiffuser[],
): UtilityKind | null {
  return requiredUtilities(kind).find((utility) => !diffusers.some((diffuser) => diffuser.kind === utility && supplied.has(diffuser.id) && coversPoint(diffuser, position))) ?? null;
}

type AttachedUtility = SavedUtility & { segmentId: SegmentId };

function attach(item: SavedUtility, segmentId: SegmentId): AttachedUtility {
  return Object.assign([...item] as SavedUtility, { segmentId });
}

function connectedUtilitySegments(graph: RoadGraph, kind: UtilityKind, starts: readonly SegmentId[]): Set<SegmentId> {
  const seen = new Set<SegmentId>();
  const queue = starts.filter((id) => graph.hasSegment(id) && carriesUtility(graph.segment(id), kind));
  for (const id of queue) seen.add(id);
  for (let i = 0; i < queue.length; i++) {
    const segment = graph.segment(queue[i]!);
    for (const nodeId of [segment.a, segment.b]) {
      for (const next of graph.node(nodeId).segments) {
        if (seen.has(next) || !carriesUtility(graph.segment(next), kind)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function pathToProducer(graph: RoadGraph, start: SegmentId, goals: readonly SegmentId[]): SegmentId[] {
  if (goals.length === 0) return [];
  if (!graph.hasSegment(start)) return [];
  const goal = new Set(goals.filter((id) => graph.hasSegment(id)));
  const seen = new Set<SegmentId>([start]);
  const queue = [start];
  const cameFrom = new Map<SegmentId, SegmentId>();
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    if (goal.has(current)) {
      const path = [current];
      while (path[path.length - 1] !== start) path.push(cameFrom.get(path[path.length - 1]!)!);
      return path;
    }
    const segment = graph.segment(current);
    for (const nodeId of [segment.a, segment.b]) {
      for (const next of graph.node(nodeId).segments) {
        if (seen.has(next)) continue;
        seen.add(next);
        cameFrom.set(next, current);
        queue.push(next);
      }
    }
  }
  return [start];
}

function itemId(item: SavedUtility): string {
  return `${item[0]}:${item[1]}:${Math.round(item[2] * 10) / 10}:${Math.round(item[3] * 10) / 10}`;
}
