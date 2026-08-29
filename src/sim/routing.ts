/**
 * Where a vehicle goes when it runs out of road. The rules are all local -- what leaves this
 * node, which way round the ring, which ring lane -- so there is no route to plan or store:
 * a car decides at the node it just reached and forgets it again.
 */
import type { NodeId, RoadGraph, SegmentId } from "./graph";
import { roadType, type LaneCentre } from "./roadTypes";
import type { Vec3 } from "./vec";

/**
 * Whether this segment can be used at all. A car has no business on a footpath or in a tunnel
 * mouth; someone on foot has none on a highway, which carries a guardrail where its footway
 * would be.
 */
function usable(graph: RoadGraph, id: SegmentId, onFoot: boolean): boolean {
  const type = roadType(graph.segment(id).type);
  if (type.tunnelDepth) return false;
  return onFoot ? !type.highway : !type.pedestrian;
}

/**
 * Every segment someone standing at `node` may leave on, having arrived along `from`. A one-way
 * road can only be driven from its own `a` end. Doubling back is a last resort, so it is offered
 * only when there is nothing else.
 */
export function exits(graph: RoadGraph, node: NodeId, from: SegmentId | null, onFoot = false): SegmentId[] {
  // A one-way road binds traffic, never someone walking beside it.
  const open = [...graph.node(node).segments].filter(
    (id) => usable(graph, id, onFoot) && (onFoot || !roadType(graph.segment(id).type).oneWay || graph.segment(id).a === node),
  );
  const onward = open.filter((id) => id !== from);
  return onward.length > 0 ? onward : open;
}

/** One of `exits`, chosen by a roll in [0, 1). Null only when there is nowhere legal to go. */
export function pickExit(
  graph: RoadGraph,
  node: NodeId,
  from: SegmentId | null,
  roll: number,
  onFoot = false,
): SegmentId | null {
  const options = exits(graph, node, from, onFoot);
  return options[Math.min(options.length - 1, Math.floor(roll * options.length))] ?? null;
}

/**
 * Arc from one bearing to another the way traffic actually takes it round the ring: angles
 * increase in the direction cars circulate (see `perpXZ` -- growing bearing keeps the island on
 * the driver's left, which is right-hand traffic). Leaving by the arm you came in on is a full
 * lap, never a zero-length one.
 */
export function ringArc(entry: number, exit: number): number {
  const TAU = Math.PI * 2;
  const arc = (((exit - entry) % TAU) + TAU) % TAU;
  return arc < 1e-6 ? TAU : arc;
}

/**
 * How far to the kerb a lane sits, counting from the kerb in: 0 is the lane a driver would call
 * the right-hand one, whichever way the road runs. This is what decides which ring lane an arm
 * feeds, so the two agree without either knowing the other's geometry.
 */
export function laneRank(lanes: readonly LaneCentre[], lane: LaneCentre): number {
  const kerbwards = (l: LaneCentre) => l.offset * -l.direction;
  return lanes
    .filter((l) => l.direction === lane.direction)
    .sort((l, r) => kerbwards(r) - kerbwards(l))
    .findIndex((l) => l.offset === lane.offset);
}

/**
 * The ring lane an arm's lane joins: from the right-hand lane onto the outer ring lane, from the
 * lane beside the centreline onto the inner one. A one-lane ring takes everything.
 */
export function ringEntryRadius(radii: readonly number[], rank: number): number {
  return radii[Math.max(0, radii.length - 1 - rank)]!;
}

/**
 * The lane a turn asks to be taken from, as a rank from the kerb: a right turn is the tight one
 * and belongs in the kerb lane, a left turn crosses the oncoming traffic and belongs in the lane
 * by the centreline. Going more or less straight on asks for nothing, and gets -1.
 *
 * `arrive` and `leave` are the outward directions of the two arms, so the car comes in along the
 * reverse of `arrive`. Right of travel is `(z, -x)` here -- the same convention `laneCentres`
 * puts a direction-1 car on.
 */
export function turnLaneRank(arrive: Vec3, leave: Vec3, straightEnough = Math.PI / 6): number {
  const into = { x: -arrive.x, z: -arrive.z };
  const ahead = into.x * leave.x + into.z * leave.z;
  if (ahead > Math.cos(straightEnough)) return -1;
  const toTheRight = leave.x * into.z - leave.z * into.x;
  return toTheRight > 0 ? 0 : 1;
}
