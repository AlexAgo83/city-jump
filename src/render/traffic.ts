import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { ClusteredLightContainer } from "@babylonjs/core/Lights/Clustered/clusteredLightContainer";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";

import type { NodeId, RoadGraph, Segment, SegmentId } from "../sim/graph";
import { junctionGeometry, ringLaneRadii, type JunctionArm, type JunctionGeometry } from "../sim/junction";
import { laneRank, pickExit, ringArc, ringEntryRadius, turnLaneRank } from "../sim/routing";
import { canGo, signalAt, signalCycle, type SignalCycle, type SignalState } from "../sim/signals";
import { laneCentres, roadType, walkCentres, type LaneCentre } from "../sim/roadTypes";
import {
  armPort,
  junctionTurnPath,
  laneChangeOffset,
  sampleQuadratic,
  approachAngle,
  laneChangeSpan,
  pathCumulative,
  pointAlong,
  ringArcPath,
  ringBearing,
  ringJoinPath,
  ringLaneAngle,
  ringOf,
  ringSweep,
  ringWalkJoin,
  CROSSING_DEPTH,
  crossesRoad,
  crossingNear,
  walkLoop,
  walkLoopSlice,
  walkRingRadius,
  type WalkLoop,
  type Ring,
} from "../sim/transfers";
import { normalizeXZ, perpXZ, v3, type Vec3 } from "../sim/vec";
import { terrainHeight } from "../sim/terrain";
import { ROAD_LIFT, SIDEWALK_LIFT, SIDEWALK_WIDTH } from "./roadMesh";
import { streetlightsOnAt } from "./streetlights";
import type { TerrainBounds } from "../sim/heightmap";
import type { BuildingKind } from "../sim/buildingKinds";

/** The width a car is built to, which is what the lane spacing is measured against. */
const CAR_WIDTH = 3;
/** A motorcycle's own, much narrower, width -- it still rides the lane a car would. */
const MOTORCYCLE_WIDTH = 0.7;
const CAR_VISUAL_SCALE = 0.81;

/** Bumper to bumper: how much road a car keeps between itself and the one in front. */
const CAR_GAP = 8.5;
/** Within this far of what is stopping it, a car is already slowing for it. */
const BRAKING = 16;
/** Metres per second, per second: how quickly speed catches up when pulling away from a stop. */
const ACCEL = 4;
/** A car's own bonnet, so a red stops its bumper at the line rather than its centre. */
const CAR_STOP_SETBACK = 3;

/**
 * How fast a heading can turn, in radians a second. A car has a steering wheel and cannot flick
 * round a corner; someone on foot pivots almost freely.
 */
const CAR_TURN_RATE = 2.6;
const WALKER_TURN_RATE = 7;

/** A ring keeps traffic moving; a plain junction still eases off a little. */
const RING_PACE = 1.1;
const JUNCTION_PACE = 0.8;

/** A frame longer than this (a tab coming back from the background) is not driven through. */
const MAX_STEP_S = 0.1;

const CAR_COLORS = [
  new Color3(0.86, 0.18, 0.14),
  new Color3(0.12, 0.38, 0.82),
  new Color3(0.93, 0.82, 0.18),
  new Color3(0.9, 0.92, 0.88),
];

const WALKER_COLORS = [
  new Color3(0.85, 0.4, 0.3),
  new Color3(0.3, 0.45, 0.7),
  new Color3(0.35, 0.6, 0.4),
  new Color3(0.75, 0.7, 0.5),
];

/** Metres per second on foot. A car covers a block while a walker crosses it. */
const WALKER_SPEED = 1.4;
const PEDESTRIAN_CROSSING_CLEARANCE = CROSSING_DEPTH / WALKER_SPEED + 0.5;

/**
 * A transfer in progress: the very polyline the Traffic view draws for this movement, being
 * driven along. When it runs out the mover lands on `exit`, in `lane`, at `trim` along it.
 */
interface Ride {
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
interface Plan {
  readonly node: NodeId;
  readonly exit: SegmentId;
  /** How far round the ring, when that junction is a roundabout. */
  readonly arc: number | null;
  /** The lane the turn asks for, as a rank from the kerb, or -1 when it asks for nothing. */
  readonly rank: number;
}

/** Anything moving on the network: a car in a lane, or someone on a footway. */
interface Mover {
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
  /** The lane it is in, or ends this road in when it is changing lane. */
  lane: LaneCentre;
  /** The lane it started this road in, while a lane change is still to happen or under way. */
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

function laneQueueKeyFor(segmentId: SegmentId, direction: 1 | -1, lane: LaneCentre): number {
  return segmentId * 10000 + (direction === 1 ? 5000 : 0) + Math.round((lane.offset + 100) * 10);
}

function laneQueueKey(mover: Mover): number {
  return laneQueueKeyFor(mover.segment.id, mover.direction, mover.lane);
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

export function scaledTrafficCount(base: number, density: number): number {
  return base <= 0 ? 0 : Math.max(1, Math.round(base * density));
}

function segmentTouchesBounds(segment: Segment, bounds: TerrainBounds): boolean {
  return segment.samples.some((p) => p.x >= bounds.minX && p.x <= bounds.maxX && p.z >= bounds.minZ && p.z <= bounds.maxZ);
}

/**
 * A body shape, in metres. Everything a car is made of comes off these numbers, so a new kind of
 * vehicle is a row in the table below rather than another lump of mesh-building code.
 */
interface CarShape {
  readonly name: string;
  readonly length: number;
  readonly width: number;
  /** Height of the main body, whose underside sits clear of the road on the wheels. */
  readonly hull: number;
  /** Where the cabin sits along the car, and how long and tall it is; none for a motorcycle. */
  readonly cabin: { at: number; length: number; height: number } | null;
  /** Bonnet and boot ledges, each as a length; zero for a shape that has none. */
  readonly bonnet: number;
  readonly boot: number;
  readonly wheelBase: number;
  readonly wheel: number;
  /** One wheel per end, on the centreline, rather than a pair either side of it. */
  readonly singleTrack?: boolean;
  /** The frontage this vehicle belongs to, so a dirt road carries tractors and not saloons. */
  readonly theme?: BuildingKind;
  /** Its own paint, when the ordinary car colours would be wrong (a pink tractor, say). */
  readonly colors?: Color3[];
  /** What makes it that vehicle rather than a box: a stack, a drum, side boards, a turret. */
  readonly details?: CarDetail[];
}

/**
 * One extra piece bolted onto a shape. `y` is measured up from the road, `z` along the vehicle
 * (+ towards the front), `x` across it -- `mirrored` builds the same piece on the other side.
 * `round` makes it a cylinder along its own longest axis instead of a box, which is what tells a
 * tanker's drum and a tractor's exhaust from yet another slab.
 */
interface CarDetail {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Dark trim (stacks, tyres, stowage) rather than the vehicle's own paint. */
  readonly dark?: boolean;
  readonly mirrored?: boolean;
  readonly round?: boolean;
}

const CAR_SHAPES: CarShape[] = [
  {
    name: "saloon",
    length: 5.8 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 0.8 * CAR_VISUAL_SCALE,
    cabin: { at: -0.3 * CAR_VISUAL_SCALE, length: 2.8 * CAR_VISUAL_SCALE, height: 0.52 * CAR_VISUAL_SCALE },
    bonnet: 1.6 * CAR_VISUAL_SCALE,
    boot: 1.1 * CAR_VISUAL_SCALE,
    wheelBase: 1.85 * CAR_VISUAL_SCALE,
    wheel: 0.92 * CAR_VISUAL_SCALE,
  },
  {
    // Shorter, taller, all cabin and no boot: the small car that fills a city.
    name: "hatchback",
    length: 4.6 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 0.86 * CAR_VISUAL_SCALE,
    cabin: { at: -0.5 * CAR_VISUAL_SCALE, length: 2.4 * CAR_VISUAL_SCALE, height: 0.6 * CAR_VISUAL_SCALE },
    bonnet: 1.2 * CAR_VISUAL_SCALE,
    boot: 0,
    wheelBase: 1.5 * CAR_VISUAL_SCALE,
    wheel: 0.86 * CAR_VISUAL_SCALE,
  },
  {
    // A cab at the front and a box behind it: a van, and the tallest thing on the road.
    name: "van",
    length: 6.6 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 1.35 * CAR_VISUAL_SCALE,
    cabin: { at: 1.5 * CAR_VISUAL_SCALE, length: 2.4 * CAR_VISUAL_SCALE, height: 0.66 * CAR_VISUAL_SCALE },
    bonnet: 1.3 * CAR_VISUAL_SCALE,
    boot: 0,
    wheelBase: 2.2 * CAR_VISUAL_SCALE,
    wheel: 1 * CAR_VISUAL_SCALE,
  },
  {
    // No ledges, one wheel per end, and a tank-and-seat hump standing in for a cabin: everything
    // a car has, with most of it left out.
    name: "motorcycle",
    length: 2,
    width: MOTORCYCLE_WIDTH,
    hull: 0.5,
    cabin: { at: 0.15, length: 0.8, height: 0.2 },
    bonnet: 0,
    boot: 0,
    wheelBase: 0.75,
    wheel: 0.62,
    singleTrack: true,
  },
  {
    // Short, tall and narrow, sitting high on big wheels: a tractor, with the cab over the axle.
    name: "tractor",
    length: 4.4 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * 0.85 * CAR_VISUAL_SCALE,
    hull: 1.1 * CAR_VISUAL_SCALE,
    cabin: { at: -0.7 * CAR_VISUAL_SCALE, length: 1.6 * CAR_VISUAL_SCALE, height: 0.85 * CAR_VISUAL_SCALE },
    bonnet: 1.8 * CAR_VISUAL_SCALE,
    boot: 0,
    wheelBase: 1.5 * CAR_VISUAL_SCALE,
    wheel: 1.25 * CAR_VISUAL_SCALE,
    theme: "agricultural",
    colors: [new Color3(0.16, 0.42, 0.2), new Color3(0.85, 0.5, 0.12)],
    details: [
      // The exhaust standing up beside the bonnet, and the mudguards over the back wheels.
      { name: "stack", width: 0.22, height: 2.1, depth: 0.22, x: 0.9, y: 1.5, z: 1.1, dark: true, round: true },
      { name: "guard", width: 0.2, height: 0.24, depth: 2.1, x: 1.25, y: 1.75, z: -1.5, mirrored: true },
      { name: "weight", width: 1.5, height: 0.4, depth: 0.4, x: 0, y: 0.85, z: 2.2, dark: true },
      { name: "hitch", width: 0.4, height: 0.24, depth: 0.7, x: 0, y: 0.7, z: -2.3, dark: true },
    ],
  },
  {
    // Long, low and open: the trailer a tractor tows, hauling the harvest.
    name: "farm trailer",
    length: 7.4 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 1 * CAR_VISUAL_SCALE,
    cabin: { at: 2.2 * CAR_VISUAL_SCALE, length: 1.5 * CAR_VISUAL_SCALE, height: 0.6 * CAR_VISUAL_SCALE },
    bonnet: 1 * CAR_VISUAL_SCALE,
    boot: 3.4 * CAR_VISUAL_SCALE,
    wheelBase: 2.4 * CAR_VISUAL_SCALE,
    wheel: 1 * CAR_VISUAL_SCALE,
    theme: "agricultural",
    colors: [new Color3(0.62, 0.55, 0.35), new Color3(0.5, 0.42, 0.28)],
    details: [
      // Side boards and a tailgate around the load bed, and the drawbar reaching forward.
      { name: "board", width: 0.18, height: 0.85, depth: 4.4, x: 1.4, y: 1.9, z: -1.4, mirrored: true },
      { name: "tailgate", width: 2.9, height: 0.85, depth: 0.18, x: 0, y: 1.9, z: -3.6 },
      { name: "load", width: 2.6, height: 0.5, depth: 4.0, x: 0, y: 2.1, z: -1.4, dark: true },
      { name: "drawbar", width: 0.3, height: 0.24, depth: 1.4, x: 0, y: 0.75, z: 3.6, dark: true },
    ],
  },
  {
    // A cab and a long drum behind it: the tanker that feeds a works.
    name: "tanker",
    length: 9 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 1.6 * CAR_VISUAL_SCALE,
    cabin: { at: 3 * CAR_VISUAL_SCALE, length: 2 * CAR_VISUAL_SCALE, height: 0.7 * CAR_VISUAL_SCALE },
    bonnet: 0.9 * CAR_VISUAL_SCALE,
    boot: 0,
    wheelBase: 3 * CAR_VISUAL_SCALE,
    wheel: 1.05 * CAR_VISUAL_SCALE,
    theme: "industrial",
    colors: [new Color3(0.82, 0.83, 0.8), new Color3(0.75, 0.55, 0.2)],
    details: [
      // The drum itself, its end cap, the catwalk along the top and the hose locker under it.
      { name: "drum", width: 2.7, height: 2.7, depth: 5.4, x: 0, y: 2.3, z: -1.6, round: true },
      { name: "cap", width: 2.5, height: 2.5, depth: 0.3, x: 0, y: 2.3, z: -4.4, round: true, dark: true },
      { name: "walk", width: 0.9, height: 0.12, depth: 5.0, x: 0, y: 3.7, z: -1.6, dark: true },
      { name: "rail", width: 0.1, height: 0.4, depth: 5.0, x: 0.5, y: 3.95, z: -1.6, dark: true, mirrored: true },
      { name: "locker", width: 0.5, height: 0.7, depth: 1.6, x: 1.4, y: 1.2, z: -2.4, dark: true, mirrored: true },
    ],
  },
  {
    // Cab forward, flat deck behind: the truck that carries everything else.
    name: "flatbed",
    length: 8 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 1.15 * CAR_VISUAL_SCALE,
    cabin: { at: 2.6 * CAR_VISUAL_SCALE, length: 2.2 * CAR_VISUAL_SCALE, height: 0.75 * CAR_VISUAL_SCALE },
    bonnet: 1 * CAR_VISUAL_SCALE,
    boot: 0,
    wheelBase: 2.8 * CAR_VISUAL_SCALE,
    wheel: 1 * CAR_VISUAL_SCALE,
    theme: "industrial",
    colors: [new Color3(0.3, 0.42, 0.55), new Color3(0.55, 0.28, 0.16)],
    details: [
      // Headboard behind the cab, low rails down the deck, and the load strapped to it.
      { name: "headboard", width: 2.9, height: 1.2, depth: 0.2, x: 0, y: 2.3, z: 0.9 },
      { name: "rail", width: 0.16, height: 0.4, depth: 4.4, x: 1.4, y: 1.9, z: -1.6, mirrored: true },
      { name: "crate", width: 2.2, height: 1.1, depth: 1.8, x: 0, y: 2.25, z: -0.6, dark: true },
      { name: "pipe", width: 0.6, height: 0.6, depth: 3.6, x: 0.6, y: 2.0, z: -2.8, dark: true, round: true },
    ],
  },
  {
    // Low, wide and blunt, with a squat turret-sized cabin: the armour.
    name: "apc",
    length: 7 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * 1.1 * CAR_VISUAL_SCALE,
    hull: 1.2 * CAR_VISUAL_SCALE,
    cabin: { at: -0.4 * CAR_VISUAL_SCALE, length: 1.8 * CAR_VISUAL_SCALE, height: 0.45 * CAR_VISUAL_SCALE },
    bonnet: 2.2 * CAR_VISUAL_SCALE,
    boot: 1.4 * CAR_VISUAL_SCALE,
    wheelBase: 2.4 * CAR_VISUAL_SCALE,
    wheel: 1 * CAR_VISUAL_SCALE,
    theme: "military",
    colors: [new Color3(0.3, 0.34, 0.24), new Color3(0.36, 0.36, 0.3)],
    details: [
      // A turret with a barrel out of it, skirts over the wheels, stowage on the back deck.
      { name: "turret", width: 1.8, height: 0.55, depth: 2.0, x: 0, y: 2.3, z: -0.4 },
      { name: "barrel", width: 0.22, height: 0.22, depth: 2.6, x: 0, y: 2.45, z: 1.4, dark: true, round: true },
      { name: "skirt", width: 0.16, height: 0.55, depth: 5.2, x: 1.6, y: 1.0, z: 0, dark: true, mirrored: true },
      { name: "stowage", width: 2.2, height: 0.45, depth: 1.0, x: 0, y: 2.1, z: -2.5, dark: true },
    ],
  },
  {
    // Canvas-backed troop truck: tall box behind a short cab.
    name: "troop truck",
    length: 7.6 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 1.7 * CAR_VISUAL_SCALE,
    cabin: { at: 2.4 * CAR_VISUAL_SCALE, length: 1.8 * CAR_VISUAL_SCALE, height: 0.6 * CAR_VISUAL_SCALE },
    bonnet: 1.1 * CAR_VISUAL_SCALE,
    boot: 0,
    wheelBase: 2.7 * CAR_VISUAL_SCALE,
    wheel: 1.05 * CAR_VISUAL_SCALE,
    theme: "military",
    colors: [new Color3(0.26, 0.3, 0.2), new Color3(0.4, 0.42, 0.3)],
    details: [
      // Canvas back on its hoops, a tailgate, and the spare wheel behind the cab.
      { name: "canvas", width: 2.8, height: 1.5, depth: 4.2, x: 0, y: 2.6, z: -1.6 },
      { name: "hoop", width: 3.0, height: 0.14, depth: 0.14, x: 0, y: 3.35, z: -0.4, dark: true },
      { name: "hoop_mid", width: 3.0, height: 0.14, depth: 0.14, x: 0, y: 3.35, z: -1.8, dark: true },
      { name: "hoop_back", width: 3.0, height: 0.14, depth: 0.14, x: 0, y: 3.35, z: -3.2, dark: true },
      { name: "tailgate", width: 2.7, height: 0.9, depth: 0.16, x: 0, y: 1.9, z: -3.7, dark: true },
      { name: "spare", width: 0.34, height: 1.0, depth: 1.0, x: 1.5, y: 1.3, z: 1.0, dark: true, round: true },
    ],
  },
];

/** The shapes a road's own frontage puts on it, by kind; anything else draws from all of them. */
const THEMED_SHAPES = new Map<BuildingKind, number[]>();
CAR_SHAPES.forEach((shape, index) => {
  if (!shape.theme) return;
  THEMED_SHAPES.set(shape.theme, [...(THEMED_SHAPES.get(shape.theme) ?? []), index]);
});
/** Ordinary traffic never gets handed a tanker or an APC. */
const PLAIN_SHAPES = CAR_SHAPES.map((_, index) => index).filter((index) => !CAR_SHAPES[index]!.theme);

export function createTrafficRenderer(scene: Scene, graph: RoadGraph) {
  /**
   * Every shape in every colour, each built out of boxes and four wheels and merged into a
   * single mesh, so a car on the map is one instance of one of them. Glass and wheels are a
   * second prototype per shape in their own dark material -- a merged mesh carries one material,
   * and two instances per car is cheaper than a multi-material one.
   * ponytail: primitives, not a loaded model. It reads as a car at the distance a city is looked
   * at from; swap in a glTF if the camera ever gets down to street level.
   */
  const carBodies = CAR_SHAPES.map((shape) =>
    (shape.colors ?? CAR_COLORS).map((color, i) => {
      const material = new StandardMaterial(`car_${shape.name}_${i}`, scene);
      material.diffuseColor = color;
      material.specularColor = new Color3(0.25, 0.25, 0.25);

      const floor = shape.wheel / 2;
      const parts = shape.singleTrack
        ? [
            slab(`bike_tank_${shape.name}_${i}`, shape.width * 0.92, shape.hull * 0.42, shape.length * 0.34, 0, floor + shape.hull * 0.78, 0.18, 0.16),
            slab(`bike_tail_${shape.name}_${i}`, shape.width * 0.7, shape.hull * 0.22, shape.length * 0.28, 0, floor + shape.hull * 0.62, -0.45, 0.1),
            slab(`bike_front_fender_${shape.name}_${i}`, shape.width * 0.6, shape.hull * 0.16, shape.length * 0.2, 0, floor + shape.hull * 0.34, shape.wheelBase, 0.08),
            slab(`bike_rear_fender_${shape.name}_${i}`, shape.width * 0.68, shape.hull * 0.16, shape.length * 0.24, 0, floor + shape.hull * 0.34, -shape.wheelBase, 0.08),
          ]
        : [slab(`car_hull_${shape.name}_${i}`, shape.width - 0.1, shape.hull, shape.length, 0, floor + shape.hull / 2, 0)];
      // Wider than the glass under it, so the roof caps the cabin instead of sitting inside it.
      // A motorcycle has no cabin to roof over -- its hull is the whole body.
      if (shape.cabin && !shape.singleTrack) {
        parts.push(
          slab(
            `car_roof_${shape.name}_${i}`,
            shape.width - 0.48,
            0.16,
            shape.cabin.length + 0.1,
            0,
            floor + shape.hull + shape.cabin.height + 0.08,
            shape.cabin.at,
          ),
        );
      }
      // The ledges fore and aft, which is what tells the front of a car from its back from above.
      const ledge = (name: string, depth: number, at: number) =>
        slab(name, shape.width - 0.22, 0.16, depth, 0, floor + shape.hull + 0.08, at);
      if (shape.bonnet > 0) parts.push(ledge(`car_bonnet_${shape.name}_${i}`, shape.bonnet, (shape.length - shape.bonnet) / 2));
      if (shape.boot > 0) parts.push(ledge(`car_boot_${shape.name}_${i}`, shape.boot, -(shape.length - shape.boot) / 2));
      parts.push(...detailParts(shape, false, `_${i}`));

      const car = Mesh.MergeMeshes(parts, true, true, undefined, false, false);
      if (!car) throw new Error("car failed to merge");
      car.name = `car_body_${shape.name}_${i}`;
      car.material = material;
      car.isPickable = false;
      car.isVisible = false;
      return car;
    }),
  );

  /**
   * The lamps, one prototype per shape and per end. They light themselves rather than being lit,
   * so they read as lamps at any hour, and the shared material is dimmed by day and turned up at
   * night with everything else.
   */
  const lampMaterials = {
    head: new StandardMaterial("car_head_lamps", scene),
    tail: new StandardMaterial("car_tail_lamps", scene),
  };
  lampMaterials.head.disableLighting = true;
  lampMaterials.tail.disableLighting = true;

  const carLamps = CAR_SHAPES.map((shape) => {
    const floor = shape.wheel / 2;
    const lens = (end: "head" | "tail") => {
      const at = end === "head" ? shape.length / 2 - 0.12 : -(shape.length / 2 - 0.12);
      // One lamp on the centreline for a motorcycle, a pair either side for anything with a
      // second wheel track to put them over.
      const sides = shape.singleTrack ? [0] : [-1, 1];
      const lamps = sides.map((side) =>
        slab(
          `car_${end}_${shape.name}_${side}`,
          shape.singleTrack ? 0.3 : 0.62,
          0.3,
          0.3,
          side * (shape.width / 2 - 0.55),
          floor + shape.hull * 0.72,
          at,
          0.1,
        ),
      );
      const merged = Mesh.MergeMeshes(lamps, true, true, undefined, false, false);
      if (!merged) throw new Error("car lamps failed to merge");
      merged.name = `car_${end}_${shape.name}`;
      merged.material = lampMaterials[end];
      merged.isPickable = false;
      merged.isVisible = false;
      return merged;
    };
    return { head: lens("head"), tail: lens("tail") };
  });

  /**
   * A real light per car, so a headlight actually lights the road ahead rather than only looking
   * like it does. Clustered, the way the streetlights are, and pooled the same way: creating or
   * disposing one walks every mesh in the scene, so only the difference in count is ever built.
   */
  const headlightCluster = new ClusteredLightContainer("car_headlights", [], scene);
  headlightCluster.maxRange = 42;
  let headlights: SpotLight[] = [];
  let sunHour = 14;
  let lightsEnabled = true;
  let trafficEnabled = true;
  let paused = false;
  let density = 1;
  const lightsOn = () => trafficEnabled && lightsEnabled && streetlightsOnAt(sunHour);

  function syncHeadlights(count: number): void {
    while (headlights.length > count) {
      const light = headlights.pop()!;
      headlightCluster.removeLight(light);
      light.dispose();
    }
    while (headlights.length < count) {
      const beam = new SpotLight(`car_beam_${headlights.length}`, Vector3.Zero(), Vector3.Down(), 1.15, 2.4, scene);
      beam.diffuse = new Color3(1, 0.96, 0.84);
      beam.specular = new Color3(0.3, 0.3, 0.28);
      beam.intensity = 9;
      beam.range = 38;
      headlightCluster.addLight(beam);
      headlights.push(beam);
    }
    for (const light of headlights) light.setEnabled(lightsOn());
    headlightCluster.setEnabled(lightsOn());
  }

  /** Night turns the lamps up and the beams on; by day they are just coloured glass. */
  function setSunHour(hour: number): void {
    sunHour = hour;
    const on = lightsOn();
    lampMaterials.head.emissiveColor = on ? new Color3(1, 0.97, 0.86) : new Color3(0.5, 0.49, 0.44);
    lampMaterials.tail.emissiveColor = on ? new Color3(0.95, 0.13, 0.1) : new Color3(0.34, 0.07, 0.06);
    for (const light of headlights) light.setEnabled(on);
    headlightCluster.setEnabled(on);
  }
  setSunHour(sunHour);

  function setLightsEnabled(enabled: boolean): void {
    lightsEnabled = enabled;
    setSunHour(sunHour);
  }

  /** Wheels and glass for each shape: one prototype whatever colour the body it rides on is. */
  const carParts = CAR_SHAPES.map((shape) => {
    const dark = new StandardMaterial(`car_parts_${shape.name}`, scene);
    dark.diffuseColor = new Color3(0.09, 0.1, 0.12);
    dark.specularColor = new Color3(0.35, 0.35, 0.4);

    const floor = shape.wheel / 2;
    // Its hump is a tank and seat rather than a cabin, so there's nothing to glaze -- a
    // motorcycle rider sits in the open.
    const glass =
      shape.cabin && !shape.singleTrack
        ? [
            slab(
              `car_glass_${shape.name}_side`,
              shape.width - 0.62,
              shape.cabin.height * 0.74,
              shape.cabin.length * 0.72,
              0,
              floor + shape.hull + shape.cabin.height * 0.37,
              shape.cabin.at,
              0.08,
            ),
            slab(
              `car_glass_${shape.name}_front`,
              shape.width - 0.78,
              shape.cabin.height * 0.55,
              0.18,
              0,
              floor + shape.hull + shape.cabin.height * 0.36,
              shape.cabin.at + shape.cabin.length * 0.43,
              0.05,
            ),
            slab(
              `car_glass_${shape.name}_rear`,
              shape.width - 0.84,
              shape.cabin.height * 0.46,
              0.16,
              0,
              floor + shape.hull + shape.cabin.height * 0.34,
              shape.cabin.at - shape.cabin.length * 0.42,
              0.05,
            ),
          ]
        : [];
    const sides = shape.singleTrack ? [0] : [-1, 1];
    const wheels = sides.flatMap((side) =>
      [shape.wheelBase, -shape.wheelBase].map((z) => {
        const wheel = MeshBuilder.CreateCylinder(
          `car_wheel_${shape.name}_${side}_${z}`,
          { diameter: shape.wheel, height: shape.singleTrack ? 0.16 : 0.36, tessellation: 10 },
          scene,
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * (shape.width / 2 - 0.1), floor, z);
        return wheel;
      }),
    );
    const trim =
      shape.singleTrack
        ? []
        : [
            slab(`car_front_bumper_${shape.name}`, shape.width - 0.4, 0.18, 0.16, 0, floor + shape.hull * 0.26, shape.length / 2 - 0.08, 0.05),
            slab(`car_rear_bumper_${shape.name}`, shape.width - 0.4, 0.18, 0.16, 0, floor + shape.hull * 0.26, -shape.length / 2 + 0.08, 0.05),
            ...sides.flatMap((side) =>
              [shape.wheelBase, -shape.wheelBase].map((z) =>
                slab(
                  `car_arch_${shape.name}_${side}_${z}`,
                  0.16,
                  0.24,
                  shape.wheel * 0.9,
                  side * (shape.width / 2 - 0.03),
                  floor + shape.hull * 0.36,
                  z,
                  0.05,
                ),
              ),
            ),
            ...sides.map((side) =>
              slab(
                `car_mirror_${shape.name}_${side}`,
                0.16,
                0.1,
                0.28,
                side * (shape.width / 2 + 0.03),
                floor + shape.hull + shape.cabin!.height * 0.42,
                shape.cabin!.at + shape.cabin!.length * 0.22,
                0.04,
              ),
            ),
          ];
    // A rider, sitting where the seat is: a body and a head, the same two primitives a
    // pedestrian is built from, just smaller and bolted to the bike instead of walking.
    const rider: Mesh[] = [];
    if (shape.singleTrack) {
      const seatY = floor + shape.hull + shape.cabin!.height;
      const at = shape.cabin!.at - 0.35;
      rider.push(
        slab(`bike_seat_${shape.name}`, 0.44, 0.14, 0.72, 0, seatY - 0.06, at, 0.08),
        slab(`bike_handlebar_${shape.name}`, 0.82, 0.08, 0.08, 0, seatY + 0.22, shape.wheelBase - 0.18, 0.03),
        slab(`bike_front_fork_${shape.name}`, 0.12, 0.62, 0.12, -0.16, floor + 0.42, shape.wheelBase - 0.06, 0.03),
        slab(`bike_front_fork_2_${shape.name}`, 0.12, 0.62, 0.12, 0.16, floor + 0.42, shape.wheelBase - 0.06, 0.03),
        slab(`bike_frame_${shape.name}`, 0.14, 0.18, 1.18, 0, floor + 0.42, 0, 0.04),
        slab(`bike_exhaust_${shape.name}`, 0.14, 0.14, 0.84, shape.width * 0.48, floor + 0.24, -0.28, 0.04),
      );
      const torso = MeshBuilder.CreateCylinder(`car_rider_torso_${shape.name}`, { height: 0.58, diameter: 0.32, tessellation: 8 }, scene);
      torso.position.set(0, seatY + 0.29, at);
      const head = MeshBuilder.CreateSphere(`car_rider_head_${shape.name}`, { diameter: 0.28, segments: 6 }, scene);
      head.position.set(0, seatY + 0.58 + 0.1, at);
      rider.push(torso, head);
    }
    const parts = Mesh.MergeMeshes([...glass, ...wheels, ...trim, ...rider, ...detailParts(shape, true, "")], true, true, undefined, false, false);
    if (!parts) throw new Error("car parts failed to merge");
    parts.name = `car_parts_${shape.name}`;
    parts.material = dark;
    parts.isPickable = false;
    parts.isVisible = false;
    return parts;
  });

  /**
   * A box with its corners taken off: two boxes crossed, plus a cylinder standing in each corner,
   * merged into one. Flat sides, flat roof, soft corners. A plain box reads as a brick at this
   * size, and rounding the whole body instead reads as a bar of soap.
   * ponytail: built out of primitives rather than extruded, because an extrusion has to be
   * oriented and this cannot be got wrong.
   */
  /**
   * The pieces a shape declares for itself, in one of the two prototypes a vehicle is built from
   * (its painted body, or the dark trim that rides along). A round piece becomes a cylinder along
   * whichever of its dimensions is longest, so one spec covers a drum, an exhaust and a barrel.
   */
  function detailParts(shape: CarShape, dark: boolean, suffix: string): Mesh[] {
    return (shape.details ?? [])
      .filter((detail) => (detail.dark ?? false) === dark)
      .flatMap((detail) => (detail.mirrored ? [1, -1] : [1]).map((side) => {
        const name = `car_${shape.name}_${detail.name}${side < 0 ? "_l" : ""}${suffix}`;
        const x = detail.x * side * CAR_VISUAL_SCALE;
        const y = detail.y * CAR_VISUAL_SCALE;
        const z = detail.z * CAR_VISUAL_SCALE;
        const w = detail.width * CAR_VISUAL_SCALE;
        const h = detail.height * CAR_VISUAL_SCALE;
        const d = detail.depth * CAR_VISUAL_SCALE;
        if (!detail.round) return slab(name, w, h, d, x, y, z, 0.08);
        const longest = Math.max(w, h, d);
        const mesh = MeshBuilder.CreateCylinder(name, { diameter: Math.min(w, h, d), height: longest, tessellation: 10 }, scene);
        if (longest === d) mesh.rotation.x = Math.PI / 2;
        else if (longest === w) mesh.rotation.z = Math.PI / 2;
        mesh.position.set(x, y, z);
        return mesh;
      }));
  }

  function slab(
    name: string,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    corner = 0.4,
  ): Mesh {
    const r = Math.min(corner, width / 2 - 0.01, depth / 2 - 0.01);
    const parts = [
      MeshBuilder.CreateBox(`${name}_x`, { width, height, depth: depth - 2 * r }, scene),
      MeshBuilder.CreateBox(`${name}_z`, { width: width - 2 * r, height, depth }, scene),
    ];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = MeshBuilder.CreateCylinder(`${name}_${sx}_${sz}`, { diameter: r * 2, height, tessellation: 10 }, scene);
        post.position.set(sx * (width / 2 - r), 0, sz * (depth / 2 - r));
        parts.push(post);
      }
    }
    const mesh = Mesh.MergeMeshes(parts, true, true, undefined, false, false);
    if (!mesh) throw new Error(`${name} failed to merge`);
    mesh.name = name;
    mesh.position.set(x, y, z);
    return mesh;
  }

  /**
   * One prototype per colour, each a body and a head merged together, and every walker on the map
   * is an instance of one of them.
   * ponytail: instances of four prototypes, rather than merging two primitives per person.
   */
  const walkerPrototypes = WALKER_COLORS.map((color, i) => {
    const body = MeshBuilder.CreateCylinder(`walker_body_${i}`, { height: 1.15, diameter: 0.5, tessellation: 6 }, scene);
    const head = MeshBuilder.CreateSphere(`walker_head_${i}`, { diameter: 0.46, segments: 5 }, scene);
    head.position.y = 0.78;
    const walker = Mesh.MergeMeshes([body, head], true, true, undefined, false, false);
    if (!walker) throw new Error("walker failed to merge");
    walker.name = `walker_${i}`;
    const material = new StandardMaterial(`walker_${i}`, scene);
    material.diffuseColor = color;
    material.specularColor = Color3.Black();
    walker.material = material;
    walker.isPickable = false;
    // The prototype itself is never seen; hiding it this way still draws its instances.
    walker.isVisible = false;
    return walker;
  });

  let movers: Mover[] = [];
  /** Built on demand and dropped on every rebuild: the geometry behind it moves with the graph. */
  const junctions = new Map<NodeId, JunctionGeometry>();
  const arms = new Map<NodeId, Map<SegmentId, JunctionArm>>();
  const ringsAt = new Map<NodeId, Ring>();

  function junctionAt(nodeId: NodeId): JunctionGeometry {
    const cached = junctions.get(nodeId);
    if (cached) return cached;
    const geometry = junctionGeometry(graph, nodeId);
    junctions.set(nodeId, geometry);
    arms.set(nodeId, new Map(geometry.arms.map((arm) => [arm.segment, arm])));
    return geometry;
  }

  function ringAt(nodeId: NodeId): Ring {
    const cached = ringsAt.get(nodeId);
    if (cached) return cached;
    const geometry = junctionAt(nodeId);
    const ring = ringOf(graph, geometry, ringLaneRadii(graph, nodeId, geometry.roundabout));
    ringsAt.set(nodeId, ring);
    return ring;
  }

  const armOf = (nodeId: NodeId, segmentId: SegmentId): JunctionArm | undefined => {
    junctionAt(nodeId);
    return arms.get(nodeId)?.get(segmentId);
  };

  const loops = new Map<NodeId, WalkLoop>();
  const cycles = new Map<NodeId, SignalCycle | null>();

  function cycleAt(nodeId: NodeId): SignalCycle | null {
    if (!cycles.has(nodeId)) cycles.set(nodeId, signalCycle(graph, nodeId, junctionAt(nodeId)));
    return cycles.get(nodeId) ?? null;
  }

  /** Whether the light at the end of this road lets a mover out of it. */
  function heldAtLights(mover: Mover, time: number): boolean {
    const node = mover.direction === 1 ? mover.segment.b : mover.segment.a;
    const cycle = cycleAt(node);
    return cycle !== null && !canGo(signalAt(cycle, mover.segment.id, time));
  }

  function walkLoopAt(nodeId: NodeId): WalkLoop {
    const cached = loops.get(nodeId);
    if (cached) return cached;
    const loop = walkLoop(graph, junctionAt(nodeId), SIDEWALK_WIDTH, (arm) => {
      const seg = graph.segment(arm.segment);
      const far = seg.a === nodeId ? seg.b : seg.a;
      return seg.length - arm.trim - trimAt(far, arm.segment);
    });
    loops.set(nodeId, loop);
    return loop;
  }

  /**
   * Where the carriageway stops short of a node -- the same trim the road surface and the lane
   * lines are drawn to, so a car leaves the road exactly where the turn diagram picks it up.
   */
  function trimAt(nodeId: NodeId, segmentId: SegmentId): number {
    return armOf(nodeId, segmentId)?.trim ?? 0;
  }

  const roll = (mover: Mover): number => {
    mover.seed = (mover.seed * 1664525 + 1013904223) >>> 0;
    return mover.seed / 2 ** 32;
  };

  const lanesFor = (segment: Segment, direction: 1 | -1, walk: boolean): LaneCentre[] => {
    const type = roadType(segment.type);
    return (walk ? walkCentres(type, SIDEWALK_WIDTH) : laneCentres(type)).filter(
      (lane) => lane.direction === direction,
    );
  };

  /** The lane a car should be in on a road, and the lane it starts in if it changes on the way. */
  interface Entry {
    readonly lane: LaneCentre;
    readonly changing: LaneCentre | null;
    readonly plan: Plan | null;
  }

  /**
   * Which lane to travel this road in. What the junction at the end of it asks for, first of
   * all: a car that is turning belongs in the lane that turn is taken from, and moves over on
   * the way if it did not come in on it. Failing that, kerb-side because it has just come off a
   * roundabout, or one at random -- and then half of what is left drifts across anyway.
   * ponytail: one change per road, decided on entry. No overtaking, nothing to overtake.
   */
  function chooseEntry(mover: Mover, segment: Segment, direction: 1 | -1, kerbLane: boolean): Entry {
    const lanes = lanesFor(segment, direction, mover.walk);
    const fallback = { offset: 0, direction } as LaneCentre;
    // A footway has no lane to pick and no junction to line up for: it is just a side.
    if (mover.walk) return { lane: lanes[0] ?? fallback, changing: null, plan: null };

    const plan = planAhead(mover, segment, direction);
    const entered = kerbLane
      ? lanes.find((lane) => laneRank(lanes, lane) === 0)
      : lanes[Math.floor(roll(mover) * lanes.length)];
    const start = entered ?? fallback;

    if (plan && plan.rank >= 0 && lanes.length > 1) {
      const wanted = lanes.find((lane) => laneRank(lanes, lane) === Math.min(plan.rank, lanes.length - 1)) ?? fallback;
      // Moving over happens along the road's own drawn weave, which is well before the junction.
      return { lane: wanted, changing: wanted.offset === start.offset ? null : start, plan };
    }
    if (lanes.length > 1 && !kerbLane && roll(mover) < 0.5) {
      // The weave is drawn from the first lane of this direction to the second; a car changing
      // lane starts in the first so it travels the line that is drawn.
      return { lane: lanes[1]!, changing: lanes[0]!, plan };
    }
    return { lane: start, changing: null, plan };
  }

  function landingDistance(segment: Segment, direction: 1 | -1, trim: number): number {
    const at = Math.min(trim, segment.length * 0.45);
    return direction === 1 ? at : segment.length - at;
  }

  function laneHasEntryRoom(segmentId: SegmentId, from: NodeId, lane: LaneCentre, trim: number): boolean {
    const segment = graph.segment(segmentId);
    const direction = segment.a === from ? 1 : -1;
    const distance = landingDistance(segment, direction, trim);
    return !laneStartBlocked(queues.get(laneQueueKeyFor(segment.id, direction, lane)), distance, direction);
  }

  function kerbLaneFrom(segment: Segment, from: NodeId): LaneCentre {
    const direction = segment.a === from ? 1 : -1;
    const lanes = lanesFor(segment, direction, false);
    return lanes.find((lane) => laneRank(lanes, lane) === 0) ?? lanes[0] ?? ({ offset: 0, direction } as LaneCentre);
  }

  /** Puts a car on a road, at `trim` from the node it entered by. */
  function board(mover: Mover, segmentId: SegmentId, from: NodeId, entry: Entry, trim: number): void {
    leaveQueue(mover);
    const segment = graph.segment(segmentId);
    const direction = segment.a === from ? 1 : -1;
    mover.segment = segment;
    mover.direction = direction;
    mover.distance = landingDistance(segment, direction, trim);
    mover.speed = (mover.walk ? WALKER_SPEED : roadType(segment.type).maxSpeed) * mover.pace;
    mover.lane = entry.lane;
    mover.changing = entry.changing;
    mover.plan = entry.plan;
    mover.ride = null;
    joinQueue(mover);
  }

  /**
   * One node ahead. A driver knows which way they are turning before they get there, and that is
   * what decides the lane to travel in, so the exit is picked on entering a road rather than on
   * reaching the end of it. A right turn is the tight one and is taken from the kerb lane, a
   * left turn crosses the oncoming traffic and is taken from the lane by the centreline. At a
   * roundabout, anything up to the exit straight ahead is taken from the kerb lane, and only
   * something further round than that is worth crossing to the lane by the centreline for --
   * which are exactly the ring lanes each of those feeds.
   */
  function planAhead(mover: Mover, segment: Segment, direction: 1 | -1): Plan | null {
    const node = direction === 1 ? segment.b : segment.a;
    const exit = pickExit(graph, node, segment.id, roll(mover));
    if (exit === null || exit === segment.id) return null;
    const from = armOf(node, segment.id);
    const to = armOf(node, exit);
    if (!from || !to) return null;
    if (graph.node(node).roundabout) {
      const arc = ringArc(from.angle, to.angle);
      // Only a ring with two lanes gives the left-hand approach lane anything to do, and only an
      // exit beyond the one straight ahead is worth taking it for: lining up on the left to cross
      // straight back out again is the daft thing a car should never be seen doing.
      const inner = ringAt(node).radii.length > 1 && arc > Math.PI;
      return { node, exit, arc, rank: inner ? 1 : 0 };
    }
    return { node, exit, arc: null, rank: turnLaneRank(from.outward, to.outward) };
  }

  /** How far across its lane change the car is, and so where it sits across the road. */
  function offsetOf(mover: Mover): number {
    const seg = mover.segment;
    const span = laneChangeSpan(trimAt(seg.a, seg.id), seg.length - trimAt(seg.b, seg.id));
    return trafficLaneOffset(mover.lane, mover.changing, span, mover.distance, mover.direction);
  }

  /**
   * Where a car has to be stopped by: the car in front, less a gap, or the stop line when the
   * light is against it. Whichever comes first in the direction it is going.
   */
  function stopFor(mover: Mover, ahead: Mover | undefined, time: number): number {
    const line = heldAtLights(mover, time) || crossingOccupiedByWalker(mover) || roundaboutYieldBlocked(mover)
      ? stopLineOf(mover)
      : limitOf(mover) + mover.direction * BRAKING * 2;
    if (!ahead) return line;
    const behind = ahead.distance - mover.direction * CAR_GAP;
    return mover.direction === 1 ? Math.min(line, behind) : Math.max(line, behind);
  }

  function roundaboutYieldBlocked(mover: Mover): boolean {
    const nodeId = mover.direction === 1 ? mover.segment.b : mover.segment.a;
    if (!graph.node(nodeId).roundabout) return false;
    const planned = mover.plan?.node === nodeId ? mover.plan : null;
    if (!planned) return false;
    const from = armOf(nodeId, mover.segment.id);
    const to = armOf(nodeId, planned.exit);
    if (!from || !to) return false;

    const ring = ringAt(nodeId);
    const radius = ringEntryRadius(ring.radii, laneRank(lanesFor(mover.segment, mover.direction, false), mover.lane));
    const entryAngle = ringLaneAngle(graph, ring, from, mover.lane.offset, true);
    const occupied = movers.flatMap((other) => {
      if (other === mover || other.walk || other.ride?.roundabout?.node !== nodeId) return [];
      const { position } = pointAlong(other.ride.points, other.ride.cumulative, other.ride.travelled);
      return [{ at: ringBearing(ring, position), radius: other.ride.roundabout.radius }];
    });
    const exiting = movers.flatMap((other) => {
      if (other === mover || other.walk || other.ride?.roundabout?.node !== nodeId) return [];
      return [{ exit: other.ride.exit, travelled: other.ride.travelled, total: other.ride.cumulative[other.ride.cumulative.length - 1]! }];
    });
    return (
      !laneHasEntryRoom(planned.exit, nodeId, kerbLaneFrom(graph.segment(planned.exit), nodeId), trimAt(nodeId, planned.exit)) ||
      roundaboutExitBlocked(exiting, mover.segment.id) ||
      roundaboutEntryBlocked(entryAngle, occupied)
    );
  }

  /** The distance along the current segment at which the car has run out of road. */
  function limitOf(mover: Mover): number {
    const end = mover.direction === 1 ? mover.segment.b : mover.segment.a;
    const trim = Math.min(trimAt(end, mover.segment.id), mover.segment.length * 0.45);
    return mover.direction === 1 ? mover.segment.length - trim : trim;
  }

  /**
   * Where a held car actually stops: short of the crossing, not at the far edge of the junction
   * plaza behind it -- which is where the old stop line put it, on top of or past the zebra
   * stripes rather than before them. Set back from the crossing's outer edge by a bonnet's worth,
   * so it is the bumper that stops at the line rather than the middle of the car.
   */
  function stopLineOf(mover: Mover): number {
    const end = mover.direction === 1 ? mover.segment.b : mover.segment.a;
    const other = mover.direction === 1 ? mover.segment.a : mover.segment.b;
    const arm = armOf(end, mover.segment.id);
    if (!arm) return limitOf(mover);
    const room = mover.segment.length - arm.trim - trimAt(other, mover.segment.id);
    if (room < CROSSING_DEPTH) return limitOf(mover);
    const far = Math.min(crossingNear(arm, room) + CROSSING_DEPTH + CAR_STOP_SETBACK, arm.trim + room);
    return mover.direction === 1 ? mover.segment.length - far : far;
  }

  /**
   * Reached the end of a road. The car takes the drawn transfer from here to its next lane: the
   * junction's own turn curve, or a roundabout's merge, sweep and exit joined into one.
   */
  function arrive(mover: Mover, now: number): void {
    const nodeId = mover.direction === 1 ? mover.segment.b : mover.segment.a;
    const planned = mover.plan?.node === nodeId ? mover.plan : null;
    const next = planned?.exit ?? pickExit(graph, nodeId, mover.segment.id, roll(mover), mover.walk);
    if (next === null) {
      // A one-way into a dead end leaves no legal move at all. Turning round beats freezing.
      leaveQueue(mover);
      mover.direction = -mover.direction as 1 | -1;
      joinQueue(mover);
      return;
    }
    const roundabout = graph.node(nodeId).roundabout;
    const entry = chooseEntry(mover, graph.segment(next), graph.segment(next).a === nodeId ? 1 : -1, roundabout);
    const trim = trimAt(nodeId, next);
    const from = armOf(nodeId, mover.segment.id);
    const to = armOf(nodeId, next);
    // Landing on the exit road in the lane it will start in, which is the one it changes from.
    const landing = entry.changing ?? entry.lane;
    if (!mover.walk && !laneHasEntryRoom(next, nodeId, landing, trim)) return;
    if (roundabout && !mover.walk && from && to) {
      const ring = ringAt(nodeId);
      const radius = ringEntryRadius(ring.radii, laneRank(lanesFor(mover.segment, mover.direction, false), mover.lane));
      const entryAngle = ringLaneAngle(graph, ring, from, mover.lane.offset, true);
      const occupied = movers.flatMap((other) => {
        if (other === mover || other.walk || other.ride?.roundabout?.node !== nodeId) return [];
        const { position } = pointAlong(other.ride.points, other.ride.cumulative, other.ride.travelled);
        return [{ at: ringBearing(ring, position), radius: other.ride.roundabout.radius }];
      });
      const exiting = movers.flatMap((other) => {
        if (other === mover || other.walk || other.ride?.roundabout?.node !== nodeId) return [];
        return [{ exit: other.ride.exit, travelled: other.ride.travelled, total: other.ride.cumulative[other.ride.cumulative.length - 1]! }];
      });
      if (roundaboutExitBlocked(exiting, mover.segment.id)) return;
      if (roundaboutEntryBlocked(entryAngle, occupied)) return;
    }

    // A dead end has no junction and so no drawn turn: the car turns round on the spot. Same
    // curve, bowed past the end of the road rather than towards a node's centre.
    const points =
      !from || !to || next === mover.segment.id
        ? uTurnPath(mover, landing.offset)
        : roundabout
          ? mover.walk
            ? walkRingTransfer(nodeId, from, to, mover.lane.offset, landing.offset)
            : ringTransfer(mover, nodeId, from, to, landing.offset)
          : mover.walk
            ? walkJunctionTransfer(nodeId, from, mover.lane.offset, next, landing.offset) ??
              junctionTurnPath(
                graph.node(nodeId).pos,
                armPort(graph, nodeId, from, mover.lane.offset),
                armPort(graph, nodeId, to, landing.offset),
              )
          : junctionTurnPath(
              graph.node(nodeId).pos,
              armPort(graph, nodeId, from, mover.lane.offset),
              armPort(graph, nodeId, to, landing.offset),
            );
    // On foot, a crossing is only taken while the traffic it crosses is being held. Until then
    // the walker waits at the kerb, and this is asked again on the next frame.
    if (mover.walk && !crossingIsClear(nodeId, points, now)) return;

    leaveQueue(mover);
    mover.ride = {
      points,
      cumulative: pathCumulative(points),
      exit: next,
      from: nodeId,
      lane: entry.lane,
      changing: entry.changing,
      trim,
      pace: mover.walk ? 1 : roundabout ? RING_PACE : JUNCTION_PACE,
      roundabout: !mover.walk && roundabout ? { node: nodeId, radius: ringAt(nodeId).edge } : null,
      travelled: 0,
    };
    mover.plan = entry.plan;
  }

  /** Turning round where the road simply stops: out on one lane, back on the other. */
  function uTurnPath(mover: Mover, exitOffset: number): Vec3[] {
    const { position, tangent } = graph.pointAt(mover.segment.id, mover.distance);
    const n = perpXZ(normalizeXZ(tangent));
    const port = (offset: number): Vec3 =>
      v3(position.x + n.x * offset, position.y, position.z + n.z * offset);
    const reach = Math.abs(mover.lane.offset - exitOffset) + 4;
    const nose = v3(
      position.x + tangent.x * mover.direction * reach,
      position.y,
      position.z + tangent.z * mover.direction * reach,
    );
    return sampleQuadratic(port(mover.lane.offset), nose, port(exitOffset), 12);
  }

  /**
   * Whether a walk across a junction can be taken now: every road it runs over has to be showing
   * red. A junction with no signals never holds anybody up.
   */
  function crossingIsClear(nodeId: NodeId, path: readonly Vec3[], time: number): boolean {
    const cycle = cycleAt(nodeId);
    if (!cycle) return true;
    const centre = graph.node(nodeId).pos;
    return junctionAt(nodeId).arms.every((arm) => {
      const reach = arm.trim + CROSSING_DEPTH * 3;
      if (!crossesRoad(centre, arm.outward, reach, [path])) return true;
      return pedestrianCanStartCrossing(cycle, arm.segment, time);
    });
  }

  function crossingOccupiedByWalker(mover: Mover): boolean {
    const nodeId = mover.direction === 1 ? mover.segment.b : mover.segment.a;
    const arm = armOf(nodeId, mover.segment.id);
    if (!arm) return false;
    const centre = graph.node(nodeId).pos;
    const reach = arm.trim + CROSSING_DEPTH * 3;
    return movers.some((other) => {
      if (!other.walk || other.ride?.from !== nodeId) return false;
      const a = pointAlong(other.ride.points, other.ride.cumulative, other.ride.travelled - 0.5).position;
      const b = pointAlong(other.ride.points, other.ride.cumulative, other.ride.travelled + 0.5).position;
      return crossesRoad(centre, arm.outward, reach, [[a, b]]);
    });
  }

  /**
   * Round the junction on its footway, never across it: someone on foot follows the pavement to
   * the corner and crosses one road at a time, at its crossing. The loop is the same one the
   * Traffic view draws.
   */
  function walkJunctionTransfer(
    nodeId: NodeId,
    from: JunctionArm,
    offset: number,
    exit: SegmentId,
    exitOffset: number,
  ): Vec3[] | null {
    const loop = walkLoopAt(nodeId);
    const near = (segment: SegmentId, at: number) =>
      loop.ports.find((port) => port.segment === segment && Math.abs(port.offset - at) < 0.01);
    const start = near(from.segment, offset);
    const finish = near(exit, exitOffset);
    if (!start || !finish) return null;
    return walkLoopSlice(loop, start.index, finish.index);
  }

  /** On foot a roundabout is one footway outside the kerb, joined at each arm and taken either way. */
  function walkRingTransfer(nodeId: NodeId, from: JunctionArm, to: JunctionArm, offset: number, exitOffset: number): Vec3[] {
    const ring = ringAt(nodeId);
    const radius = walkRingRadius(ring, SIDEWALK_WIDTH);
    const on = ringWalkJoin(graph, ring, from, offset, radius);
    const off = ringWalkJoin(graph, ring, to, exitOffset, radius);
    return [
      ...on,
      ...ringArcPath(ring, ringBearing(ring, on[0]!), ringBearing(ring, off[0]!), radius),
      ...off.slice().reverse(),
    ];
  }

  /** Merge on, round, and off again: the three drawn curves of a roundabout, end to end. */
  function ringTransfer(mover: Mover, nodeId: NodeId, from: JunctionArm, to: JunctionArm, exitOffset: number): Vec3[] {
    const ring = ringAt(nodeId);
    const outer = ring.radii[ring.radii.length - 1]!;
    // Which ring lane this arm's lane feeds: kerb-side onto the outer one, the lane beside the
    // centreline onto the inner.
    const radius = ringEntryRadius(ring.radii, laneRank(lanesFor(mover.segment, mover.direction, false), mover.lane));
    const start = ringLaneAngle(graph, ring, from, mover.lane.offset, true);
    const finish = ringLaneAngle(graph, ring, to, exitOffset, false);
    const arc = ringArc(start, finish);
    const steps = Math.max(8, Math.round((arc / (Math.PI / 2)) * 12));
    return [
      ...ringJoinPath(graph, ring, from, mover.lane.offset, radius, true),
      ...ringSweep(ring, start, radius, start + arc, outer, steps),
      ...ringJoinPath(graph, ring, to, exitOffset, outer, false),
    ];
  }

  function clearMovers(): void {
    for (const mover of movers) mover.mesh.dispose();
    movers = [];
    queues.clear();
    queueOf.clear();
    syncHeadlights(0);
  }

  function rebuild(dirty?: TerrainBounds): void {
    const segments = graph.allSegments();
    if (!trafficEnabled) {
      clearMovers();
      return;
    }
    if (dirty) {
      const live = new Set(segments.map((segment) => segment.id));
      movers = movers.filter((mover) => {
        if (live.has(mover.segment.id) && !segmentTouchesBounds(mover.segment, dirty)) return true;
        leaveQueue(mover);
        mover.mesh.dispose();
        return false;
      });
    } else {
      for (const mover of movers) mover.mesh.dispose();
      movers = [];
      queues.clear();
      queueOf.clear();
    }
    junctions.clear();
    arms.clear();
    ringsAt.clear();
    loops.clear();
    cycles.clear();

    for (const [si, seg] of segments.entries()) {
      if (dirty && !segmentTouchesBounds(seg, dirty)) continue;
      const type = roadType(seg.type);
      const from = trimAt(seg.a, seg.id);
      const span = Math.max(1, seg.length - from - trimAt(seg.b, seg.id));

      /** Puts one mover on this road, entering it the way any other would. */
      const place = (mesh: Mesh | InstancedMesh, i: number, count: number, walk: boolean, lane: LaneCentre, vehicle = ""): void => {
        const pace = walk
          ? 0.75 + ((si + i * 7) % 5) * 0.12
          : 0.85 + ((si + i * 3) % 5) * 0.075;
        const mover: Mover = {
          mesh,
          vehicle,
          walk,
          stride: walk ? 0.05 : 0,
          phase: (((si * 13 + i * 29) % 100) / 100) * Math.PI * 2,
          lift: walk ? (type.pedestrian ? ROAD_LIFT : SIDEWALK_LIFT) + 0.58 : ROAD_LIFT + 0.02,
          pace,
          seed: (si * 2654435761 + i * 40503 + (walk ? 7919 : 0)) >>> 0,
          segment: seg,
          direction: lane.direction,
          distance: from + ((i + 0.5) / count) * span,
          lane,
          changing: null,
          speed: (walk ? WALKER_SPEED : type.maxSpeed) * pace,
          // Placed already moving, mid-road -- a city does not load with everyone stalled.
          currentSpeed: (walk ? WALKER_SPEED : type.maxSpeed) * pace,
          heading: 0,
          pitch: 0,
          ride: null,
          plan: null,
        };
        // Facing the way the road runs from the start, rather than swinging round to it.
        const { tangent } = graph.pointAt(seg.id, mover.distance);
        mover.heading = Math.atan2(tangent.x * lane.direction, tangent.z * lane.direction);
        // Placed mid-road, but otherwise entering it like anyone else.
        const entry = chooseEntry(mover, seg, lane.direction, false);
        mover.lane = entry.lane;
        mover.changing = entry.changing;
        mover.plan = entry.plan;
        movers.push(mover);
        joinQueue(mover);
      };

      // Down the middle of a path, along the footway of anything else. A highway has a guardrail
      // where that footway would be, so nobody walks it.
      if (!type.highway && !type.tunnelDepth) {
        const walks = walkCentres(type, SIDEWALK_WIDTH);
        // A path is all footway, so it carries more; a street gets a handful either side.
        const baseCount = type.pedestrian
          ? Math.min(8, Math.max(2, Math.floor(seg.length / 22)))
          : Math.min(6, Math.floor(seg.length / 45));
        const count = scaledTrafficCount(baseCount, density);
        for (let i = 0; i < count; i++) {
          const walker = walkerPrototypes[(si + i) % walkerPrototypes.length]!.createInstance(
            `pedestrian_${seg.id}_${i}`,
          );
          walker.isPickable = false;
          place(walker, i, count, true, walks[i % walks.length]!);
        }
      }
      if (type.pedestrian) continue;

      const lanes = laneCentres(type);
      const count = scaledTrafficCount(Math.min(4, Math.max(1, Math.floor(seg.length / 80))), density);
      for (let i = 0; i < count; i++) {
        // Shape and colour picked apart from each other, so a street carries a mix of both. A road
        // with a business of its own mostly carries that business's vehicles -- tractors down a
        // dirt track, tankers past a works -- but never only them: something still passes through.
        const themed = type.frontageKind ? THEMED_SHAPES.get(type.frontageKind) ?? [] : [];
        const pool = themed.length && (si + i) % 4 !== 3 ? themed : PLAIN_SHAPES;
        const shape = pool[(si * 3 + i) % pool.length]!;
        const palette = carBodies[shape]!;
        const body = palette[(si + i) % palette.length]!.createInstance(`traffic_${seg.id}_${i}`);
        body.isPickable = false;
        // Wheels and glass ride along: parented, so only the body is ever positioned.
        for (const source of [carParts[shape]!, carLamps[shape]!.head, carLamps[shape]!.tail]) {
          const part = source.createInstance(`carpart_${seg.id}_${i}_${source.name}`);
          part.isPickable = false;
          part.parent = body;
        }
        place(body, i, count, false, lanes[i % lanes.length]!, CAR_SHAPES[shape]!.name);
      }
    }

    syncHeadlights(movers.filter((mover) => !mover.walk).length);
  }

  /** Faces a mover along a heading, turning towards it rather than snapping onto it. */
  function face(mover: Mover, heading: number, dt: number): void {
    const rate = (mover.walk ? WALKER_TURN_RATE : CAR_TURN_RATE) * dt;
    mover.heading = approachAngle(mover.heading, heading, rate);
    if (mover.walk) {
      mover.pitch = 0;
    } else {
      const targetPitch = roadType(mover.segment.type).tunnelDepth ? 0 : vehicleTerrainPitch(mover.mesh.position, mover.heading);
      mover.pitch += (targetPitch - mover.pitch) * Math.min(1, dt * 5);
    }
    mover.mesh.rotationQuaternion = null;
    mover.mesh.rotation.x = mover.pitch;
    mover.mesh.rotation.y = mover.heading;
  }

  function vehicleTerrainPitch(position: Vector3, heading: number): number {
    const forwardX = Math.sin(heading);
    const forwardZ = Math.cos(heading);
    const reach = 2;
    const rise = terrainHeight(position.x + forwardX * reach, position.z + forwardZ * reach) - terrainHeight(position.x - forwardX * reach, position.z - forwardZ * reach);
    return -Math.atan2(rise, reach * 2);
  }

  function roundaboutRooms(movers: readonly Mover[]): Map<Mover, number> {
    return circularQueueRooms(
      movers.flatMap((mover) => {
        const ride = mover.ride;
        if (mover.walk || !ride?.roundabout) return [];
        const { position } = pointAlong(ride.points, ride.cumulative, ride.travelled);
        const ring = ringAt(ride.roundabout.node);
        return [{ item: mover, key: `roundabout:${ride.roundabout.node}`, at: ringBearing(ring, position), radius: ride.roundabout.radius }];
      }),
    );
  }

  const queues = new Map<number, Mover[]>();
  const queueOf = new Map<Mover, number>();
  const ahead = new Map<Mover, Mover>();

  function leaveQueue(mover: Mover): void {
    leaveLaneQueue(queues, queueOf, mover);
  }

  function joinQueue(mover: Mover): void {
    if (mover.walk || mover.ride) return;
    joinLaneQueue(queues, queueOf, laneQueueKey(mover), mover);
  }

  scene.registerBeforeRender(() => {
    if (!trafficEnabled || paused || movers.length === 0) return;
    const now = performance.now() / 1000;
    const dt = Math.min(MAX_STEP_S, scene.getEngine().getDeltaTime() / 1000);

    const beams = lightsOn() ? headlights : null;
    let beam = 0;

    // Who is in front of whom. Queue membership changes only when a mover boards or leaves a
    // lane, so the frame loop just reads the stable lane order.
    ahead.clear();
    for (const queue of queues.values()) {
      for (let i = 0; i < queue.length - 1; i++) ahead.set(queue[i]!, queue[i + 1]!);
    }
    const ringRoom = roundaboutRooms(movers);
    const staleMovers = new Set<Mover>();

    for (const mover of movers) {
      const bob = mover.stride === 0 ? 0 : Math.abs(Math.sin(now * 5 + mover.phase)) * mover.stride;
      if (!graph.hasSegment(mover.segment.id)) {
        staleMovers.add(mover);
        leaveQueue(mover);
        mover.mesh.dispose();
        continue;
      }

      if (mover.ride) {
        const ride = mover.ride;
        // Same ramp as the straight road it just left: a car pulling away into its turn keeps
        // accelerating rather than snapping straight to the turn's own pace.
        const room = ringRoom.get(mover) ?? Infinity;
        const target = mover.speed * ride.pace * Math.max(0, Math.min(1, room / BRAKING));
        mover.currentSpeed = mover.currentSpeed < target ? Math.min(target, mover.currentSpeed + ACCEL * dt) : target;
        ride.travelled += mover.currentSpeed * dt;
        const total = ride.cumulative[ride.cumulative.length - 1]!;
        if (ride.travelled >= total) {
          if (!mover.walk && !laneHasEntryRoom(ride.exit, ride.from, ride.changing ?? ride.lane, ride.trim)) {
            ride.travelled = total;
            mover.currentSpeed = 0;
            continue;
          }
          board(mover, ride.exit, ride.from, { lane: ride.lane, changing: ride.changing, plan: mover.plan }, ride.trim);
        } else {
          const { position, tangent } = pointAlong(ride.points, ride.cumulative, ride.travelled);
          mover.mesh.position.set(position.x, position.y + mover.lift + bob, position.z);
          face(mover, Math.atan2(tangent.x, tangent.z), dt);
          if (beams && !mover.walk) aimBeam(beams[beam++], mover);
          continue;
        }
      }

      // What has to stop this mover: the car in front, or a light against it. Easing off over
      // the last few metres rather than stopping dead on the line, and never backing up. A
      // walker has nothing to rear-end and always heads at the kerb itself, so it gets no ease:
      // eased against its own exact target it would never quite arrive, and so never get asked
      // whether the crossing is clear.
      const room = mover.walk ? Infinity : (stopFor(mover, ahead.get(mover), now) - mover.distance) * mover.direction;
      const target = mover.speed * Math.max(0, Math.min(1, room / BRAKING));
      // Braking follows that curve straight down -- a car easing off is as responsive as before.
      // Pulling away is the other way round: speed catches up to the target rather than jumping
      // to it, so leaving a stop is an acceleration rather than a teleport to cruising speed.
      mover.currentSpeed = mover.currentSpeed < target ? Math.min(target, mover.currentSpeed + ACCEL * dt) : target;
      mover.distance += mover.direction * mover.currentSpeed * dt;

      const limit = limitOf(mover);
      const atEnd = mover.direction === 1 ? mover.distance >= limit : mover.distance <= limit;
      if (atEnd && (mover.walk || !heldAtLights(mover, now))) {
        mover.distance = limit;
        arrive(mover, now);
        if (mover.walk && !mover.ride) mover.currentSpeed = 0;
        if (mover.ride) continue;
      }
      const offset = offsetOf(mover);
      const { position, tangent } = graph.pointAt(mover.segment.id, mover.distance);
      const normal = perpXZ(normalizeXZ(tangent));
      mover.mesh.position.set(
        position.x + normal.x * offset,
        position.y + mover.lift + bob,
        position.z + normal.z * offset,
      );
      face(mover, Math.atan2(tangent.x * mover.direction, tangent.z * mover.direction), dt);
      if (beams && !mover.walk) aimBeam(beams[beam++], mover);
    }
    if (staleMovers.size > 0) movers = movers.filter((mover) => !staleMovers.has(mover));
  });

  /** Puts a beam at the nose of its car, pointing the way the car faces and a little down. */
  function aimBeam(beam: SpotLight | undefined, mover: Mover): void {
    if (!beam) return;
    const forward = { x: Math.sin(mover.heading), z: Math.cos(mover.heading) };
    beam.position.set(
      mover.mesh.position.x + forward.x * 2.6,
      mover.mesh.position.y + 1,
      mover.mesh.position.z + forward.z * 2.6,
    );
    beam.direction.set(forward.x, -0.42, forward.z);
  }

  return {
    rebuild,
    setSunHour,
    setLightsEnabled,
    setPaused(next: boolean) {
      paused = next;
    },
    setEnabled(enabled: boolean) {
      if (trafficEnabled === enabled) return;
      trafficEnabled = enabled;
      rebuild();
    },
    setDensity(next: number) {
      const clamped = Math.max(0.25, Math.min(2, next));
      if (density === clamped) return;
      density = clamped;
      rebuild();
    },
    vehicleAt(x: number, z: number): { segment: Segment; kind: string; vehicle: string; target(): { x: number; y: number; z: number; heading: number; segment: Segment } | null } | null {
      let best: Mover | null = null;
      let bestDistance = 7;
      for (const mover of movers) {
        if (mover.walk) continue;
        const d = Math.hypot(mover.mesh.position.x - x, mover.mesh.position.z - z);
        if (d <= bestDistance) {
          best = mover;
          bestDistance = d;
        }
      }
      return best
        ? {
            segment: best.segment,
            kind: "Car",
            vehicle: best.vehicle,
            target: () =>
              movers.includes(best!) && !best!.walk
                ? { x: best!.mesh.position.x, y: best!.mesh.position.y, z: best!.mesh.position.z, heading: best!.heading, segment: best!.segment }
                : null,
          }
        : null;
    },
    vehiclePoint(): { x: number; y: number; z: number } | null {
      const mover = movers.find((candidate) => !candidate.walk);
      return mover ? { x: mover.mesh.position.x, y: mover.mesh.position.y, z: mover.mesh.position.z } : null;
    },
    count: () => movers.filter((mover) => !mover.walk).length,
    pedestrians: () => movers.filter((mover) => mover.walk).length,
  };
}
