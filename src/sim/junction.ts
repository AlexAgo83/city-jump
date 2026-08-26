import type { RoadGraph, NodeId, SegmentId } from "./graph";
import { roadType } from "./roadTypes";
import { type Vec3, v3, normalizeXZ, perpXZ, scale } from "./vec";

/** Widest incident carriageway; the junction has to cover at least that. */
export function widestIncidentWidth(graph: RoadGraph, nodeId: NodeId): number {
  let widest = 0;
  for (const segId of graph.node(nodeId).segments) {
    widest = Math.max(widest, roadType(graph.segment(segId).type).width);
  }
  return widest;
}

/**
 * How far the frontage keeps clear of the node: however far the junction actually
 * reaches, so no building ends up standing on it.
 * ponytail: recomputes the geometry per call; hoist it into the rebuild pass if it
 * ever shows up in a profile.
 */
export function junctionRadius(graph: RoadGraph, nodeId: NodeId): number {
  const arms = junctionGeometry(graph, nodeId).arms;
  if (arms.length === 0) return widestIncidentWidth(graph, nodeId) * 0.75;
  return Math.max(...arms.map((arm) => arm.trim));
}

export interface JunctionArm {
  readonly segment: SegmentId;
  /** Distance from this node's end of the segment at which the road surface stops. */
  readonly trim: number;
  /** Direction away from the node, along the road. */
  readonly outward: Vec3;
  /** Bearing of `outward`, used to order the arms around the node. */
  readonly angle: number;
  /** The trimmed end's two corners, clockwise then counter-clockwise in `angle`. */
  readonly cornerLow: Vec3;
  readonly cornerHigh: Vec3;
}

export interface JunctionGeometry {
  readonly node: NodeId;
  readonly arms: readonly JunctionArm[];
  /** Closed ring, counter-clockwise. Empty when the node is not a junction. */
  readonly ring: readonly Vec3[];
}

/** A trim never eats more than this fraction of the segment it belongs to. */
const MAX_TRIM_FRACTION = 0.4;
/**
 * Nor more than this many carriageway widths, however narrow the angle. Past it the
 * junction reads as a car park; the hull below copes with the overlap that is left.
 */
const MAX_TRIM_WIDTHS = 1.5;

/**
 * Each incident road is pulled back from the node and the gap between the pulled-back
 * ends is closed by a polygon. Replaces the flat disc, which overlapped the roads and
 * ignored the angles they arrived at.
 */
export function junctionGeometry(graph: RoadGraph, nodeId: NodeId): JunctionGeometry {
  const node = graph.node(nodeId);
  if (node.segments.size < 2) return { node: nodeId, arms: [], ring: [] };

  // Every arm, first with a provisional trim, ordered by the bearing it leaves on.
  const provisional = [...node.segments]
    .map((segId) => {
      const seg = graph.segment(segId);
      const atStart = seg.a === nodeId;
      const half = roadType(seg.type).width / 2;
      const probe = Math.min(half, seg.length * MAX_TRIM_FRACTION);
      const at = graph.pointAt(segId, atStart ? probe : seg.length - probe);
      const outward = atStart ? at.tangent : scale(at.tangent, -1);
      return { segId, seg, atStart, half, outward: normalizeXZ(outward) };
    })
    .map((arm) => ({ ...arm, angle: Math.atan2(arm.outward.z, arm.outward.x) }))
    .sort((l, r) => l.angle - r.angle);

  // A road arriving at a narrow angle to its neighbour has to be pulled back further,
  // or the two surfaces overlap before the junction polygon ever gets to close them.
  const arms: JunctionArm[] = provisional.map((arm, i) => {
    let trim = arm.half;
    for (const other of [
      provisional[(i + 1) % provisional.length]!,
      provisional[(i - 1 + provisional.length) % provisional.length]!,
    ]) {
      if (other === arm) continue;
      const gap = angleBetween(arm.angle, other.angle);
      const halfGap = Math.max(gap / 2, 1e-3);
      trim = Math.max(trim, (arm.half + other.half) / Math.tan(Math.min(halfGap, Math.PI / 2 - 1e-3)));
    }
    trim = Math.min(trim, arm.half * 2 * MAX_TRIM_WIDTHS);
    trim = Math.min(trim, arm.seg.length * MAX_TRIM_FRACTION);
    trim = Math.max(trim, Math.min(arm.half, arm.seg.length * MAX_TRIM_FRACTION));

    const distance = arm.atStart ? trim : arm.seg.length - trim;
    const { position } = graph.pointAt(arm.segId, distance);
    const n = normalizeXZ(perpXZ(arm.outward));
    return {
      segment: arm.segId,
      trim,
      outward: arm.outward,
      angle: arm.angle,
      cornerLow: v3(position.x - n.x * arm.half, position.y, position.z - n.z * arm.half),
      cornerHigh: v3(position.x + n.x * arm.half, position.y, position.z + n.z * arm.half),
    };
  });

  // The ring is the convex hull of the trimmed ends rather than the arms walked in
  // bearing order. Both give the same polygon when the arms are well separated, but the
  // hull also holds when they are not: two wide roads a few degrees apart cannot have
  // disjoint ends at any trim the segment can afford, and walking that in order produces
  // a self-crossing ring. Every corner is on or inside the hull, so there is never a gap.
  const ring = convexHullXZ(arms.flatMap((arm) => [arm.cornerLow, arm.cornerHigh]));
  return { node: nodeId, arms, ring };
}

export function allJunctions(graph: RoadGraph): Map<NodeId, JunctionGeometry> {
  const out = new Map<NodeId, JunctionGeometry>();
  for (const node of graph.allNodes()) {
    const geometry = junctionGeometry(graph, node.id);
    if (geometry.ring.length > 0) out.set(node.id, geometry);
  }
  return out;
}

/** How much of a segment each end gives up to the junction it runs into. */
export function segmentTrims(
  junctions: Map<NodeId, JunctionGeometry>,
  graph: RoadGraph,
  segId: SegmentId,
): { start: number; end: number } {
  const seg = graph.segment(segId);
  const trimAt = (nodeId: NodeId) =>
    junctions.get(nodeId)?.arms.find((arm) => arm.segment === segId)?.trim ?? 0;
  return { start: trimAt(seg.a), end: trimAt(seg.b) };
}

/** Smallest turn from one bearing to the other, in [0, PI]. */
function angleBetween(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

/** Monotone chain over the ground plane, keeping each point's elevation. */
function convexHullXZ(points: Vec3[]): Vec3[] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x || a.z - b.z);

  const half = (input: Vec3[]): Vec3[] => {
    const out: Vec3[] = [];
    for (const p of input) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };

  const hull = [...half(sorted), ...half([...sorted].reverse())];
  return hull.length >= 3 ? hull : points;
}

const cross = (o: Vec3, a: Vec3, b: Vec3): number =>
  (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
