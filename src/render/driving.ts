import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";

import type { NodeId, Segment, SegmentId } from "../sim/graph";
import type { TerrainBounds } from "../sim/heightmap";
import type { LaneCentre } from "../sim/roadTypes";
import { type SignalCycle, signalAt, type SignalState } from "../sim/signals";
import { CROSSING_DEPTH, laneChangeOffset } from "../sim/transfers";
import type { Vec3 } from "../sim/vec";

/** Bumper to bumper: how much road a car keeps between itself and the one in front. */
export const CAR_GAP = 8.5;
/** Metres per second on foot. A car covers a block while a walker crosses it. */
export const WALKER_SPEED = 1.4;
/** Within this far of what is stopping it, a car is already slowing for it. */
export const BRAKING = 16;
/** Metres per second, per second: how quickly speed catches up when pulling away from a stop. */
export const ACCEL = 4;
/** A car's own bonnet, so a red stops its bumper at the line rather than its centre. */
export const CAR_STOP_SETBACK = 3;

/**
 * How fast a heading can turn, in radians a second. A car has a steering wheel and cannot flick
 * round a corner; someone on foot pivots almost freely.
 */
export const CAR_TURN_RATE = 2.6;
export const WALKER_TURN_RATE = 7;

/** A ring keeps traffic moving; a plain junction still eases off a little. */
export const RING_PACE = 1.1;
export const JUNCTION_PACE = 0.8;

/** A frame longer than this (a tab coming back from the background) is not driven through. */
export const MAX_STEP_S = 0.1;

const PEDESTRIAN_CROSSING_CLEARANCE = CROSSING_DEPTH / WALKER_SPEED + 0.5;

/**
 * A transfer in progress: the very polyline the Traffic view draws for this movement, being
 * driven along. When it runs out the mover lands on `exit`, in `lane`, at `trim` along it.
 */
export interface Ride {
  readonly points: readonly Vec3[];
  readonly cumulative: readonly number[];
  readonly exit: SegmentId;
  readonly from: NodeId;
  readonly lane: LaneCentre;
  readonly changing: LaneCentre | null;
  readonly trim: number;
  /** Slower than the road it came off: a junction or a ring is taken at a crawl. */
  readonly pace: number;
  readonly roundabout: { readonly node: NodeId; readonly radius: number } | null;
  travelled: number;
}

/** What a car has already settled about the junction its road runs into. Cars only. */
export interface Plan {
  readonly node: NodeId;
  readonly exit: SegmentId;
  /** How far round the ring, when that junction is a roundabout. */
  readonly arc: number | null;
  /** The lane the turn asks for, as a rank from the kerb, or -1 when it asks for nothing. */
  readonly rank: number;
}

/** Anything moving on the network: a car in a lane, or someone on a footway. */
export interface Mover {
  readonly mesh: Mesh | InstancedMesh;
  /** What it is -- "Saloon", "Tractor", "Tanker" -- for the selection panel. Walkers have none. */
  readonly vehicle: string;
  /** Someone on foot: a footway rather than a lane, and no lane changes to make. */
  readonly walk: boolean;
  /** Bob while walking; zero in a car. */
  readonly stride: number;
  readonly phase: number;
  readonly lift: number;
  /** Personal pace, so a queue of cars on one road does not move as one block. */
  readonly pace: number;
  seed: number;
  segment: Segment;
  direction: 1 | -1;
  /** Distance along the segment in its own a -> b sense, whichever way the mover faces. */
  distance: number;
  lane: LaneCentre;
  changing: LaneCentre | null;
  speed: number;
  /** What it is actually doing, in the same units as `speed` -- eases toward it either way, so
   *  pulling away from a stop is a car accelerating rather than teleporting up to cruising speed. */
  currentSpeed: number;
  /** Which way it is facing, which follows the path it is on rather than snapping to it. */
  heading: number;
  pitch: number;
  ride: Ride | null;
  plan: Plan | null;
}

export interface RoundaboutOccupancy {
  readonly occupied: { readonly at: number; readonly radius: number }[];
  readonly exiting: { readonly exit: SegmentId; readonly travelled: number; readonly total: number }[];
}

export interface FrameOccupancy {
  readonly roundabouts: Map<NodeId, RoundaboutOccupancy>;
  readonly crossingWalkers: Set<string>;
  readonly ringRooms: Map<Mover, number>;
}

export function laneQueueKeyFor(segmentId: SegmentId, direction: 1 | -1, lane: LaneCentre): number {
  return segmentId * 10000 + (direction === 1 ? 5000 : 0) + Math.round((lane.offset + 100) * 10);
}

export function laneQueueKey(mover: Mover): number {
  return laneQueueKeyFor(mover.segment.id, mover.direction, mover.lane);
}

export function segmentTouchesBounds(segment: Segment, bounds: TerrainBounds): boolean {
  return segment.samples.some((p) => p.x >= bounds.minX && p.x <= bounds.maxX && p.z >= bounds.minZ && p.z <= bounds.maxZ);
}

export function landingDistance(segment: Segment, direction: 1 | -1, trim: number): number {
  const at = Math.min(trim, segment.length * 0.45);
  return direction === 1 ? at : segment.length - at;
}

export function segmentLimit(segment: Segment, direction: 1 | -1, trim: number): number {
  const at = Math.min(trim, segment.length * 0.45);
  return direction === 1 ? segment.length - at : at;
}

export function roomAhead(distance: number, stop: number, direction: 1 | -1): number {
  return (stop - distance) * direction;
}

export function circularQueueRooms<T>(
  entries: readonly { readonly item: T; readonly key: string; readonly at: number; readonly radius: number }[],
): Map<T, number> {
  const TAU = Math.PI * 2;
  const byRing = new Map<string, { readonly item: T; readonly key: string; readonly at: number; readonly radius: number }[]>();
  for (const entry of entries) {
    const queue = byRing.get(entry.key);
    if (queue) queue.push(entry);
    else byRing.set(entry.key, [entry]);
  }
  const out = new Map<T, number>();
  for (const queue of byRing.values()) {
    if (queue.length < 2) continue;
    const sorted = [...queue].sort((a, b) => a.at - b.at);
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i]!;
      const next = sorted[(i + 1) % sorted.length]!;
      const arc = ((next.at - current.at + TAU) % TAU) || TAU;
      out.set(current.item, arc * current.radius - CAR_GAP);
    }
  }
  return out;
}

export function roundaboutEntryBlocked(
  entry: number,
  occupied: readonly { readonly at: number; readonly radius: number }[],
): boolean {
  const TAU = Math.PI * 2;
  return occupied.some(({ at, radius }) => (((entry - at) % TAU) + TAU) % TAU * radius < CAR_GAP * 1.4);
}

export function roundaboutExitBlocked(
  exiting: readonly { readonly exit: SegmentId; readonly travelled: number; readonly total: number }[],
  segmentId: SegmentId,
): boolean {
  return exiting.some((ride) => ride.exit === segmentId && ride.total - ride.travelled < CAR_GAP * 2);
}

export const pedestrianCanCross = (state: SignalState): boolean => state === "red";

export function pedestrianCanStartCrossing(cycle: SignalCycle, segment: SegmentId, time: number): boolean {
  return pedestrianCanCross(signalAt(cycle, segment, time)) && pedestrianCanCross(signalAt(cycle, segment, time + PEDESTRIAN_CROSSING_CLEARANCE));
}

export function trafficLaneOffset(
  lane: LaneCentre,
  changing: LaneCentre | null,
  span: { readonly start: number; readonly end: number },
  distance: number,
  direction: 1 | -1,
): number {
  if (!changing) return lane.offset;
  const travelled = direction === 1 ? distance - span.start : span.end - distance;
  return laneChangeOffset(changing.offset, lane.offset, travelled / (span.end - span.start));
}

interface QueuedMover {
  readonly distance: number;
  readonly direction: 1 | -1;
}

export function joinLaneQueue<T extends QueuedMover>(queues: Map<number, T[]>, queueOf: Map<T, number>, key: number, mover: T): void {
  const queue = queues.get(key) ?? [];
  if (!queues.has(key)) queues.set(key, queue);
  const at = mover.distance * mover.direction;
  const index = queue.findIndex((other) => other.distance * other.direction > at);
  queue.splice(index < 0 ? queue.length : index, 0, mover);
  queueOf.set(mover, key);
}

export function leaveLaneQueue<T extends QueuedMover>(queues: Map<number, T[]>, queueOf: Map<T, number>, mover: T): void {
  const key = queueOf.get(mover);
  if (key === undefined) return;
  const queue = queues.get(key);
  if (queue) {
    const index = queue.indexOf(mover);
    if (index >= 0) queue.splice(index, 1);
    if (queue.length === 0) queues.delete(key);
  }
  queueOf.delete(mover);
}

export function laneQueueIsOrdered<T extends QueuedMover>(queue: readonly T[]): boolean {
  return queue.every((mover, i) => i === 0 || queue[i - 1]!.distance * queue[i - 1]!.direction <= mover.distance * mover.direction);
}

export function laneStartBlocked<T extends QueuedMover>(queue: readonly T[] | undefined, distance: number, direction: 1 | -1): boolean {
  return queue?.some((other) => {
    const ahead = (other.distance - distance) * direction;
    return ahead >= 0 && ahead < CAR_GAP;
  }) ?? false;
}

export function speedForRoom(speed: number, room: number): number {
  return speed * Math.max(0, Math.min(1, room / BRAKING));
}

export function accelerateToward(current: number, target: number, dt: number): number {
  return current < target ? Math.min(target, current + ACCEL * dt) : target;
}

export function scaledTrafficCount(base: number, density: number): number {
  return base <= 0 ? 0 : Math.max(1, Math.round(base * density));
}
