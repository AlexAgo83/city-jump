import { RoadGraph, type NodeId, type SegmentId } from "./graph";
import { type Vec3, v3, distXZ, lerp } from "./vec";
import { roadType } from "./roadTypes";
import { terrainHeight } from "./terrain";

/**
 * The four drawing rules. Angle snapping is deliberately absent: it is what would make
 * the network read as gridded instead of organic.
 */
export const RULES = {
  /** Ending this close to an existing node attaches to it instead of making a new one. */
  nodeSnapRadius: 8,
  /** Ending this close to an existing segment splits it. */
  segmentSnapRadius: 4,
  /** Positions are quantised so two nodes drawn at the same place are the same node. */
  gridStep: 2,
  /** Below this, a segment is refused: micro-segments break junction geometry. */
  minLength: 8,
  /** Rise over run. Does nothing on flat ground, and is ready when the ground is not. */
  maxGradient: 0.45,
} as const;

export const quantise = (value: number): number => Math.round(value / RULES.gridStep) * RULES.gridStep;

export type Snap =
  | { kind: "node"; nodeId: NodeId; position: Vec3 }
  | { kind: "segment"; segmentId: SegmentId; distance: number; position: Vec3 }
  | { kind: "free"; position: Vec3 };

/**
 * Resolves a raw ground position to where the road would actually attach. A node wins
 * over a segment: attaching to the junction that is already there beats making another.
 */
export function resolveSnap(graph: RoadGraph, x: number, z: number, gridSnap = true): Snap {
  const node = graph.nearestNode(x, z, RULES.nodeSnapRadius);
  if (node) return { kind: "node", nodeId: node.id, position: node.pos };

  const hit = graph.nearestOnSegment(x, z, RULES.segmentSnapRadius, (segment) => !roadType(segment.type).tunnelDepth);
  if (hit) {
    return { kind: "segment", segmentId: hit.segment.id, distance: hit.distance, position: hit.position };
  }

  const qx = gridSnap ? quantise(x) : x;
  const qz = gridSnap ? quantise(z) : z;
  return { kind: "free", position: v3(qx, terrainHeight(qx, qz), qz) };
}

export type Validation = { ok: true } | { ok: false; reason: string };

/**
 * Draw-time validation. A refused segment never enters the graph, and the reason is the
 * message shown to the player, so it is written for them rather than for a log.
 */
export function validateSegment(start: Vec3, control: Vec3, end: Vec3, type: string): Validation {
  roadType(type);

  const length = quadraticLengthXZ(start, control, end);
  if (length < RULES.minLength) {
    return { ok: false, reason: `Too short: ${length.toFixed(1)} m, minimum is ${RULES.minLength} m.` };
  }

  if (!roadType(type).tunnelDepth) {
    const gradient = maxSampleGradient(start, control, end);
    if (gradient > RULES.maxGradient + 1e-6) {
      return {
        ok: false,
        reason: `Too steep: ${(gradient * 100).toFixed(0)}%, maximum is ${RULES.maxGradient * 100}%.`,
      };
    }
  }

  return { ok: true };
}

/** Ground length of the quadratic, by sampling. ponytail: the graph rebuilds this table
 * anyway once the segment is accepted; here it only has to be good enough to judge. */
function quadraticLengthXZ(a: Vec3, c: Vec3, b: Vec3): number {
  const STEPS = 24;
  let total = 0;
  let prev = a;
  for (let i = 1; i <= STEPS; i++) {
    const t = i / STEPS;
    const u = 1 - t;
    const p = v3(
      a.x * u * u + c.x * 2 * u * t + b.x * t * t,
      0,
      a.z * u * u + c.z * 2 * u * t + b.z * t * t,
    );
    total += distXZ(prev, p);
    prev = p;
  }
  return total;
}

function maxSampleGradient(a: Vec3, c: Vec3, b: Vec3): number {
  let steepest = 0;
  let prev = v3(a.x, a.y, a.z);
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    const u = 1 - t;
    const x = a.x * u * u + c.x * 2 * u * t + b.x * t * t;
    const z = a.z * u * u + c.z * 2 * u * t + b.z * t * t;
    const p = v3(x, i === 24 ? b.y : terrainHeight(x, z), z);
    const run = distXZ(prev, p);
    if (run > 1e-9) steepest = Math.max(steepest, Math.abs(p.y - prev.y) / run);
    prev = p;
  }
  return steepest;
}

/**
 * Commits a drawn road. Snapping is what creates junctions: ending on a segment splits
 * it, ending on a node shares it, and the player never places an intersection directly.
 */
export function commitSegment(
  graph: RoadGraph,
  from: Snap,
  to: Snap,
  control: Vec3,
  type: string,
): { ok: true; segmentId: SegmentId } | { ok: false; reason: string } {
  const validation = validateSegment(from.position, control, to.position, type);
  if (!validation.ok) return validation;

  const a = resolveEndpoint(graph, from);
  const b = resolveEndpoint(graph, to);
  if (a === b) return { ok: false, reason: "A road cannot start and end at the same point." };

  const crossing = roadType(type).tunnelDepth ? null : firstCrossing(graph, from.position, control, to.position);
  if (crossing) {
    const middle = graph.splitSegment(crossing.segmentId, crossing.distance);
    const { leftControl, rightControl } = splitControl(from.position, control, to.position, crossing.t);
    graph.addSegment(a, middle, leftControl, type);
    return { ok: true, segmentId: graph.addSegment(middle, b, rightControl, type) };
  }

  return { ok: true, segmentId: graph.addSegment(a, b, control, type) };
}

function resolveEndpoint(graph: RoadGraph, snap: Snap): NodeId {
  switch (snap.kind) {
    case "node":
      return snap.nodeId;
    case "segment":
      return graph.splitSegment(snap.segmentId, snap.distance);
    case "free":
      return graph.addNode(snap.position.x, snap.position.z);
  }
}

function firstCrossing(
  graph: RoadGraph,
  from: Vec3,
  control: Vec3,
  to: Vec3,
): { segmentId: SegmentId; distance: number; t: number } | null {
  // ponytail: sampled curve intersection; replace with exact Bezier solving if misses show up.
  const proposed = sampleQuadratic(from, control, to);
  for (const seg of graph.allSegments()) {
    if (roadType(seg.type).tunnelDepth) continue;
    for (let i = 1; i < proposed.length; i++) {
      for (let j = 1; j < seg.samples.length; j++) {
        const hit = segmentCross(proposed[i - 1]!.point, proposed[i]!.point, seg.samples[j - 1]!, seg.samples[j]!);
        if (!hit) continue;
        const t = proposed[i - 1]!.t + (proposed[i]!.t - proposed[i - 1]!.t) * hit.a;
        const distance = seg.cumulative[j - 1]! + (seg.cumulative[j]! - seg.cumulative[j - 1]!) * hit.b;
        if (t < 1e-3 || t > 1 - 1e-3 || distance < RULES.minLength || seg.length - distance < RULES.minLength) continue;
        return { segmentId: seg.id, distance, t };
      }
    }
  }
  return null;
}

function sampleQuadratic(a: Vec3, c: Vec3, b: Vec3): { point: Vec3; t: number }[] {
  const out: { point: Vec3; t: number }[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const u = 1 - t;
    out.push({
      t,
      point: v3(a.x * u * u + c.x * 2 * u * t + b.x * t * t, 0, a.z * u * u + c.z * 2 * u * t + b.z * t * t),
    });
  }
  return out;
}

function segmentCross(a: Vec3, b: Vec3, c: Vec3, d: Vec3): { a: number; b: number } | null {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const cdx = d.x - c.x;
  const cdz = d.z - c.z;
  const den = abx * cdz - abz * cdx;
  if (Math.abs(den) < 1e-9) return null;
  const acx = c.x - a.x;
  const acz = c.z - a.z;
  const ua = (acx * cdz - acz * cdx) / den;
  const ub = (acx * abz - acz * abx) / den;
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1 ? { a: ua, b: ub } : null;
}

function splitControl(a: Vec3, c: Vec3, b: Vec3, t: number): { leftControl: Vec3; rightControl: Vec3 } {
  return { leftControl: lerp(a, c, t), rightControl: lerp(c, b, t) };
}
