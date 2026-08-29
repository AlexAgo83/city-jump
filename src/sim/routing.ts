/**
 * Where a vehicle goes when it runs out of road. The rules are all local -- what leaves this
 * node, which way round the ring, which ring lane -- so there is no route to plan or store:
 * a car decides at the node it just reached and forgets it again.
 */
import type { NodeId, RoadGraph, SegmentId } from "./graph";
import { roadType, type LaneCentre } from "./roadTypes";

/** A car may use this segment at all: not a tunnel mouth, not a footpath. */
function drivable(graph: RoadGraph, id: SegmentId): boolean {
  const type = roadType(graph.segment(id).type);
  return !type.tunnelDepth && !type.pedestrian;
}

/**
 * Every segment a car standing at `node` may leave on, having arrived along `from`. A one-way
 * road can only be taken from its own `a` end. Doubling back is a last resort, so it is offered
 * only when the node is a dead end.
 */
export function exits(graph: RoadGraph, node: NodeId, from: SegmentId | null): SegmentId[] {
  const usable = [...graph.node(node).segments].filter(
    (id) => drivable(graph, id) && (!roadType(graph.segment(id).type).oneWay || graph.segment(id).a === node),
  );
  const onward = usable.filter((id) => id !== from);
  return onward.length > 0 ? onward : usable;
}

/** One of `exits`, chosen by a roll in [0, 1). Null only when there is nowhere legal to go. */
export function pickExit(graph: RoadGraph, node: NodeId, from: SegmentId | null, roll: number): SegmentId | null {
  const options = exits(graph, node, from);
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
 * The ring lane to be aiming for right now: the one joined on entry while there is still ring
 * to go, and the outer lane once the exit is close, because that is the only lane you can leave
 * from. The car slides between the two the same way it changes lane on a road.
 */
export function ringTargetRadius(radii: readonly number[], entryRadius: number, remaining: number): number {
  return remaining > Math.PI / 2 ? entryRadius : radii[radii.length - 1]!;
}

/**
 * Moves a value toward a target at a bounded rate. A car changes lane -- on a road or between
 * the lanes of a ring -- by sliding across rather than jumping: the same lanes the overlay
 * draws, with the metres in between actually travelled.
 */
export function approach(current: number, target: number, maxStep: number): number {
  const delta = target - current;
  return Math.abs(delta) <= maxStep ? target : current + Math.sign(delta) * maxStep;
}
