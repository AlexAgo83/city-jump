import type { RoadGraph, SegmentId } from "./graph";
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
