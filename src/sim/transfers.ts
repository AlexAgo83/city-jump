/**
 * The geometry of every transfer a car makes: across a junction, on and off a roundabout, and
 * from one lane to the next. It lives here, in one place, because two things need the exact same
 * curves -- the Traffic view draws them, and the traffic drives them. Anything computed on only
 * one side of that pair is a car seen cutting a corner the diagram says it does not.
 *
 * Everything returned sits on the road surface. Each caller adds its own lift.
 */
import type { NodeId, RoadGraph } from "./graph";
import { ringElevation, type JunctionArm, type JunctionGeometry } from "./junction";
import { roadType } from "./roadTypes";
import { distXZ, normalizeXZ, perpXZ, v3, type Vec3 } from "./vec";

/** Eases 0 -> 1, so a transfer leans out of one line and settles into the next. */
export function smoothstep01(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Points along a quadratic Bezier, elevation carried through the same weights. */
export function sampleQuadratic(a: Vec3, control: Vec3, b: Vec3, steps: number): Vec3[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    const w0 = u * u;
    const w1 = 2 * u * t;
    const w2 = t * t;
    return v3(
      a.x * w0 + control.x * w1 + b.x * w2,
      a.y * w0 + control.y * w1 + b.y * w2,
      a.z * w0 + control.z * w1 + b.z * w2,
    );
  });
}

/** Where a lane meets the node: its arm's trimmed end, offset sideways to that lane. */
export function armPort(graph: RoadGraph, nodeId: NodeId, arm: JunctionArm, laneOffset: number): Vec3 {
  const seg = graph.segment(arm.segment);
  const atStart = seg.a === nodeId;
  const { position, tangent } = graph.pointAt(arm.segment, atStart ? arm.trim : seg.length - arm.trim);
  const n = perpXZ(normalizeXZ(tangent));
  return v3(position.x + n.x * laneOffset, position.y, position.z + n.z * laneOffset);
}

/**
 * The curve across an ordinary junction, from one arm's lane to another's. It bows towards the
 * node's own centre rather than cutting straight, so a turn reads as a turn and even a movement
 * between two not-quite-opposite arms curves.
 */
export function junctionTurnPath(centre: Vec3, from: Vec3, to: Vec3, steps = 16): Vec3[] {
  const y = Math.max(from.y, to.y);
  const mid = v3((from.x + to.x) / 2, y, (from.z + to.z) / 2);
  const control = v3(mid.x + (centre.x - mid.x) * 0.4, y, mid.z + (centre.z - mid.z) * 0.4);
  return sampleQuadratic(from, control, to, steps);
}

/** A roundabout, reduced to what a transfer needs: its circle, its arms, its height. */
export interface Ring {
  readonly node: NodeId;
  readonly centre: Vec3;
  /** Lane radii, innermost first. */
  readonly radii: readonly number[];
  /** The kerb: where the carriageway ends and the footway around it begins. */
  readonly edge: number;
  readonly arms: readonly JunctionArm[];
  readonly elevation: (angle: number) => number;
}

export function ringOf(graph: RoadGraph, geometry: JunctionGeometry, radii: readonly number[]): Ring {
  const centre = graph.node(geometry.node).pos;
  return {
    node: geometry.node,
    centre,
    radii,
    edge: geometry.roundabout,
    arms: geometry.arms,
    elevation: ringElevation(geometry.arms, centre.y),
  };
}

const outerOf = (ring: Ring): number => ring.radii[ring.radii.length - 1]!;

/** A point on the ring, at a bearing and a radius. */
export function onRing(ring: Ring, angle: number, radius: number): Vec3 {
  return v3(ring.centre.x + Math.cos(angle) * radius, ring.elevation(angle), ring.centre.z + Math.sin(angle) * radius);
}

/**
 * How far round the ring a merge runs past its arm, and an exit runs before it. A transfer that
 * ends exactly where the arm meets the circle is a stub too short to read, and too abrupt to
 * drive: this is the length of the join.
 */
export function ringBlend(graph: RoadGraph, ring: Ring, arm: JunctionArm): number {
  return Math.min(0.5, roadType(graph.segment(arm.segment).type).width / outerOf(ring));
}

/** Traffic circulates towards a growing bearing, so a merge lands after its arm and an exit leaves before. */
export const mergeAngle = (graph: RoadGraph, ring: Ring, arm: JunctionArm): number =>
  arm.angle + ringBlend(graph, ring, arm);
export const exitAngle = (graph: RoadGraph, ring: Ring, arm: JunctionArm): number =>
  arm.angle - ringBlend(graph, ring, arm);

/**
 * The join between an arm's lane and the ring: a real fillet, its control point where the lane's
 * own line meets the ring's tangent, so it arrives along the circle instead of across it.
 * `joining` is a car coming onto the ring; the same curve reversed is one leaving it.
 */
export function ringJoinPath(
  graph: RoadGraph,
  ring: Ring,
  arm: JunctionArm,
  laneOffset: number,
  radius: number,
  joining: boolean,
  steps = 12,
): Vec3[] {
  const port = armPort(graph, ring.node, arm, laneOffset);
  const angle = joining ? mergeAngle(graph, ring, arm) : exitAngle(graph, ring, arm);
  const point = onRing(ring, angle, radius);
  const y = Math.max(port.y, point.y);
  const inward = { x: -arm.outward.x, z: -arm.outward.z };
  const along = { x: -Math.sin(angle), z: Math.cos(angle) };
  const control = meetXZ(port, inward, point, along, y);
  return joining ? sampleQuadratic(port, control, point, steps) : sampleQuadratic(point, control, port, steps);
}

/**
 * The lane crossing on a two-lane ring: leaving is only ever done from the outer lane, so
 * anything on the inner one has to be across before its exit. Drawn and driven as the quarter
 * turn of spiral that ends where the exit begins.
 */
export function ringCrossPath(graph: RoadGraph, ring: Ring, arm: JunctionArm, steps = 12): Vec3[] {
  const end = exitAngle(graph, ring, arm);
  return ringSweep(ring, end - Math.PI / 2, ring.radii[0]!, end, outerOf(ring), steps);
}

/**
 * Round the ring from one bearing to another, moving between lane radii as it goes. The crossing
 * happens over the last quarter turn, which is exactly what `ringCrossPath` draws.
 */
export function ringSweep(ring: Ring, from: number, fromRadius: number, to: number, toRadius: number, steps: number): Vec3[] {
  const arc = to - from;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const angle = from + arc * t;
    const crossing = arc <= 1e-6 ? 1 : (arc * t - (arc - Math.PI / 2)) / (Math.PI / 2);
    const radius = fromRadius + (toRadius - fromRadius) * smoothstep01(crossing);
    return onRing(ring, angle, radius);
  });
}

/** Where two ground lines cross, or their midpoint when they are too near parallel to cross. */
export function meetXZ(a: Vec3, da: { x: number; z: number }, b: Vec3, db: { x: number; z: number }, y: number): Vec3 {
  const det = db.x * da.z - da.x * db.z;
  if (Math.abs(det) < 1e-6) return v3((a.x + b.x) / 2, y, (a.z + b.z) / 2);
  const t = (db.x * (b.z - a.z) - db.z * (b.x - a.x)) / det;
  return v3(a.x + da.x * t, y, a.z + da.z * t);
}

/** The stretch of a road where traffic moves between its lanes: the middle third of it. */
export function laneChangeSpan(from: number, to: number): { start: number; end: number } {
  return { start: from + (to - from) * 0.35, end: from + (to - from) * 0.65 };
}

/** How far across the change a car is at `t` along that stretch, measured the way it travels. */
export function laneChangeOffset(from: number, to: number, t: number): number {
  return from + (to - from) * smoothstep01(t);
}

/** Total ground length of a polyline, and the cumulative table that goes with it. */
export function pathCumulative(points: readonly Vec3[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1]! + distXZ(points[i - 1]!, points[i]!));
  return out;
}

/** Position and heading a given distance along a polyline. */
export function pointAlong(points: readonly Vec3[], cumulative: readonly number[], distance: number): { position: Vec3; tangent: Vec3 } {
  const total = cumulative[cumulative.length - 1]!;
  const d = Math.min(Math.max(distance, 0), total);
  let i = 1;
  while (i < cumulative.length - 1 && cumulative[i]! < d) i++;
  const prev = cumulative[i - 1]!;
  const span = cumulative[i]! - prev;
  const f = span < 1e-9 ? 0 : (d - prev) / span;
  const a = points[i - 1]!;
  const b = points[i]!;
  return {
    position: v3(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f),
    tangent: normalizeXZ(v3(b.x - a.x, 0, b.z - a.z)),
  };
}

/** The circle the footway round a roundabout follows: the middle of the paving outside the kerb. */
export function walkRingRadius(ring: Ring, sidewalkWidth: number): number {
  return ring.edge + sidewalkWidth / 2;
}

/**
 * Round the ring at one radius, the short way about. Nobody on foot walks three quarters of a
 * roundabout to reach the arm next door, so unlike traffic this is not tied to one direction.
 */
export function ringArcPath(ring: Ring, from: number, to: number, radius: number, steps = 12): Vec3[] {
  const TAU = Math.PI * 2;
  let arc = ((to - from) % TAU + TAU) % TAU;
  if (arc > Math.PI) arc -= TAU;
  const count = Math.max(2, Math.round((Math.abs(arc) / (Math.PI / 2)) * steps));
  return Array.from({ length: count + 1 }, (_, i) => onRing(ring, from + arc * (i / count), radius));
}
