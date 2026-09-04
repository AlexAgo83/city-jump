import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import type { Vector3 } from "@babylonjs/core/Maths/math";

import type { NodeId, RoadGraph, Segment, SegmentId } from "../sim/graph";
import { junctionGeometry, ringLaneRadii, type JunctionArm, type JunctionGeometry } from "../sim/junction";
import { laneRank, pickExit, ringArc, turnLaneRank } from "../sim/routing";
import { canGo, signalAt, signalCycle, type SignalCycle } from "../sim/signals";
import { laneCentres, roadType, walkCentres, type LaneCentre } from "../sim/roadTypes";
import {
  armPort,
  junctionTurnPath,
  approachAngle,
  laneChangeSpan,
  pathCumulative,
  pointAlong,
  ringBearing,
  ringLaneAngle,
  ringOf,
  CROSSING_DEPTH,
  crossesRoad,
  crossingNear,
  walkLoop,
  type WalkLoop,
  type Ring,
} from "../sim/transfers";
import { normalizeXZ, perpXZ, type Vec3 } from "../sim/vec";
import { terrainHeight } from "../sim/terrain";
import { ROAD_LIFT, SIDEWALK_LIFT, SIDEWALK_WIDTH } from "./roadMesh";
import { streetlightsOnAt } from "./streetlights";
import { createVehicleHeadlights } from "./vehicleLights";
import { createVehicleModels } from "./vehicleModels";
import {
  BRAKING,
  CAR_STOP_SETBACK,
  CAR_TURN_RATE,
  type FrameOccupancy,
  JUNCTION_PACE,
  laneQueueKey,
  laneQueueKeyFor,
  MAX_STEP_S,
  type Mover,
  type Plan,
  RING_PACE,
  type RoundaboutOccupancy,
  segmentTouchesBounds,
  WALKER_SPEED,
  WALKER_TURN_RATE,
  accelerateToward,
  atSegmentLimit,
  circularQueueRooms,
  joinLaneQueue,
  laneStartBlocked,
  landingDistance,
  leaveLaneQueue,
  pedestrianCanStartCrossing,
  ringTransfer,
  roomAhead,
  roundaboutEntryBlocked,
  roundaboutExitBlocked,
  scaledTrafficCount,
  segmentLimit,
  speedForRoom,
  stopTarget,
  trafficLaneOffset,
  trimTransferFromMover,
  uTurnPath,
  walkJunctionTransfer,
  walkRingTransfer,
} from "./driving";
import type { TerrainBounds } from "../sim/heightmap";

/** `frameDelta` is milliseconds since the last drawn frame -- see `createScene`, and not the
 * engine's own delta, which counts animation frames the render loop may have skipped. */
export function createTrafficRenderer(scene: Scene, graph: RoadGraph, frameDelta: () => number) {
  const { shapes: carShapes, themedShapes, plainShapes, carBodies, carLamps, carParts, walkerPrototypes, lampMaterials } = createVehicleModels(scene);

  const headlights = createVehicleHeadlights(scene, lampMaterials);
  let sunHour = 14;
  let lightsEnabled = true;
  let trafficEnabled = true;
  let paused = false;
  let density = 1;
  const lightsOn = () => trafficEnabled && lightsEnabled && streetlightsOnAt(sunHour);

  /** Night turns the lamps up and the beams on; by day they are just coloured glass. */
  function setSunHour(hour: number): void {
    sunHour = hour;
    headlights.setLamps(lightsOn());
  }
  setSunHour(sunHour);

  function setLightsEnabled(enabled: boolean): void {
    lightsEnabled = enabled;
    setSunHour(sunHour);
  }

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
  function stopFor(mover: Mover, ahead: Mover | undefined, time: number, occupancy: FrameOccupancy): number {
    const line = heldAtLights(mover, time) || crossingOccupiedByWalker(mover, occupancy) || roundaboutYieldBlocked(mover, occupancy)
      ? stopLineOf(mover)
      : limitOf(mover) + mover.direction * BRAKING * 2;
    return stopTarget(line, ahead?.distance, mover.direction);
  }

  function roundaboutYieldBlocked(mover: Mover, occupancy: FrameOccupancy): boolean {
    const nodeId = mover.direction === 1 ? mover.segment.b : mover.segment.a;
    if (!graph.node(nodeId).roundabout) return false;
    const planned = mover.plan?.node === nodeId ? mover.plan : null;
    if (!planned) return false;
    const from = armOf(nodeId, mover.segment.id);
    const to = armOf(nodeId, planned.exit);
    if (!from || !to) return false;

    const ring = ringAt(nodeId);
    const entryAngle = ringLaneAngle(graph, ring, from, mover.lane.offset, true);
    const blockers = occupancy.roundabouts.get(nodeId);
    const occupied = blockers?.occupied ?? [];
    const exiting = blockers?.exiting ?? [];
    return (
      !laneHasEntryRoom(planned.exit, nodeId, kerbLaneFrom(graph.segment(planned.exit), nodeId), trimAt(nodeId, planned.exit)) ||
      roundaboutExitBlocked(exiting, mover.segment.id) ||
      roundaboutEntryBlocked(entryAngle, occupied)
    );
  }

  /** The distance along the current segment at which the car has run out of road. */
  function limitOf(mover: Mover): number {
    const end = mover.direction === 1 ? mover.segment.b : mover.segment.a;
    return segmentLimit(mover.segment, mover.direction, trimAt(end, mover.segment.id));
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
  function arrive(mover: Mover, now: number, occupancy: FrameOccupancy): void {
    const nodeId = mover.direction === 1 ? mover.segment.b : mover.segment.a;
    // A plan is made a junction ahead of time, and the road it names can be bulldozed or split
    // before the car gets there -- `graph.segment` then threw out of the render loop, which stops
    // the picture dead. A plan whose exit is gone is no plan, and the choice is made again here.
    const planned = mover.plan?.node === nodeId && graph.hasSegment(mover.plan.exit) ? mover.plan : null;
    const next = planned?.exit ?? pickExit(graph, nodeId, mover.segment.id, roll(mover), mover.walk);
    if (next === null || !graph.hasSegment(next)) {
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
      const entryAngle = ringLaneAngle(graph, ring, from, mover.lane.offset, true);
      const blockers = occupancy.roundabouts.get(nodeId);
      const occupied = blockers?.occupied ?? [];
      const exiting = blockers?.exiting ?? [];
      if (roundaboutExitBlocked(exiting, mover.segment.id)) return;
      if (roundaboutEntryBlocked(entryAngle, occupied)) return;
    }

    // A dead end has no junction and so no drawn turn: the car turns round on the spot. Same
    // curve, bowed past the end of the road rather than towards a node's centre.
    const points =
      !from || !to || next === mover.segment.id
        ? uTurnPath(graph, mover, landing.offset)
        : roundabout
          ? mover.walk
            ? walkRingTransfer(graph, ringAt(nodeId), from, to, mover.lane.offset, landing.offset, SIDEWALK_WIDTH)
            : ringTransfer(graph, ringAt(nodeId), mover, from, to, landing.offset, lanesFor(mover.segment, mover.direction, false))
          : mover.walk
            ? walkJunctionTransfer(walkLoopAt(nodeId), from, mover.lane.offset, next, landing.offset) ??
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
    // Both from the same array: the cumulative distances index into these very points, and a
    // cumulative built from a different path reads off the end of it.
    const drive = trimTransferFromMover(graph, mover, offsetOf(mover), points);
    mover.ride = {
      points: drive,
      cumulative: pathCumulative(drive),
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

  function crossingOccupiedByWalker(mover: Mover, occupancy: FrameOccupancy): boolean {
    const nodeId = mover.direction === 1 ? mover.segment.b : mover.segment.a;
    const arm = armOf(nodeId, mover.segment.id);
    return !!arm && occupancy.crossingWalkers.has(crossingKey(nodeId, arm.segment));
  }

  function clearMovers(): void {
    for (const mover of movers) mover.mesh.dispose();
    movers = [];
    queues.clear();
    queueOf.clear();
    headlights.sync(0, lightsOn());
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
        if (live.has(mover.segment.id) && !segmentTouchesBounds(mover.segment, dirty)) {
          mover.segment = graph.segment(mover.segment.id);
          return true;
        }
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
        const themed = type.frontageKind ? themedShapes.get(type.frontageKind) ?? [] : [];
        const pool = themed.length && (si + i) % 4 !== 3 ? themed : plainShapes;
        const shape = pool[(si * 3 + i) % pool.length]!;
        const palette = carBodies[shape]!;
        const body = palette[(si + i) % palette.length]!.createInstance(`traffic_${seg.id}_${i}`);
        body.isPickable = true;
        // Wheels and glass ride along: parented, so only the body is ever positioned.
        for (const source of [carParts[shape]!, carLamps[shape]!.head, carLamps[shape]!.tail]) {
          const part = source.createInstance(`carpart_${seg.id}_${i}_${source.name}`);
          part.isPickable = false;
          part.parent = body;
        }
        place(body, i, count, false, lanes[i % lanes.length]!, carShapes[shape]!.name);
      }
    }

    headlights.sync(movers.filter((mover) => !mover.walk).length, lightsOn());
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

  const crossingKey = (nodeId: NodeId, segmentId: SegmentId): string => `${nodeId}:${segmentId}`;

  function frameOccupancy(): FrameOccupancy {
    const roundabouts = new Map<NodeId, RoundaboutOccupancy>();
    const crossingWalkers = new Set<string>();
    const ringEntries: { readonly item: Mover; readonly key: string; readonly at: number; readonly radius: number }[] = [];

    for (const mover of movers) {
      const ride = mover.ride;
      if (!ride) continue;
      if (mover.walk) {
        const nodeArms = arms.get(ride.from);
        if (!nodeArms) continue;
        const centre = graph.node(ride.from).pos;
        const a = pointAlong(ride.points, ride.cumulative, ride.travelled - 0.5).position;
        const b = pointAlong(ride.points, ride.cumulative, ride.travelled + 0.5).position;
        for (const arm of nodeArms.values()) {
          if (crossesRoad(centre, arm.outward, arm.trim + CROSSING_DEPTH * 3, [[a, b]])) crossingWalkers.add(crossingKey(ride.from, arm.segment));
        }
        continue;
      }

      const roundabout = ride.roundabout;
      if (!roundabout) continue;
      const ring = ringAt(roundabout.node);
      const { position } = pointAlong(ride.points, ride.cumulative, ride.travelled);
      const entry = { at: ringBearing(ring, position), radius: roundabout.radius };
      const occupancy = roundabouts.get(roundabout.node) ?? { occupied: [], exiting: [] };
      if (!roundabouts.has(roundabout.node)) roundabouts.set(roundabout.node, occupancy);
      occupancy.occupied.push(entry);
      occupancy.exiting.push({ exit: ride.exit, travelled: ride.travelled, total: ride.cumulative[ride.cumulative.length - 1]! });
      ringEntries.push({ item: mover, key: `roundabout:${roundabout.node}`, ...entry });
    }

    return { roundabouts, crossingWalkers, ringRooms: circularQueueRooms(ringEntries) };
  }

  const queues = new Map<number, Mover[]>();
  const queueOf = new Map<Mover, number>();
  const ahead = new Map<Mover, Mover>();
  let timeScale = 1;
  let simTime = performance.now() / 1000;

  function leaveQueue(mover: Mover): void {
    leaveLaneQueue(queues, queueOf, mover);
  }

  function joinQueue(mover: Mover): void {
    if (mover.walk || mover.ride) return;
    joinLaneQueue(queues, queueOf, laneQueueKey(mover), mover);
  }

  scene.registerBeforeRender(() => {
    if (!trafficEnabled || paused || movers.length === 0) return;
    const dt = Math.min(MAX_STEP_S, (frameDelta() / 1000) * timeScale);
    simTime += dt;
    const now = simTime;

    const beams = lightsOn() ? headlights.lights : null;
    let beam = 0;

    // Who is in front of whom. Queue membership changes only when a mover boards or leaves a
    // lane, so the frame loop just reads the stable lane order.
    ahead.clear();
    for (const queue of queues.values()) {
      for (let i = 0; i < queue.length - 1; i++) ahead.set(queue[i]!, queue[i + 1]!);
    }
    const occupancy = frameOccupancy();
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
        const room = occupancy.ringRooms.get(mover) ?? Infinity;
        const target = speedForRoom(mover.speed * ride.pace, room);
        mover.currentSpeed = accelerateToward(mover.currentSpeed, target, dt);
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
          if (beams && !mover.walk) headlights.aim(beams[beam++], mover);
          continue;
        }
      }

      // What has to stop this mover: the car in front, or a light against it. Easing off over
      // the last few metres rather than stopping dead on the line, and never backing up. A
      // walker has nothing to rear-end and always heads at the kerb itself, so it gets no ease:
      // eased against its own exact target it would never quite arrive, and so never get asked
      // whether the crossing is clear.
      const room = mover.walk ? Infinity : roomAhead(mover.distance, stopFor(mover, ahead.get(mover), now, occupancy), mover.direction);
      const target = speedForRoom(mover.speed, room);
      // Braking follows that curve straight down -- a car easing off is as responsive as before.
      // Pulling away is the other way round: speed catches up to the target rather than jumping
      // to it, so leaving a stop is an acceleration rather than a teleport to cruising speed.
      mover.currentSpeed = accelerateToward(mover.currentSpeed, target, dt);
      mover.distance += mover.direction * mover.currentSpeed * dt;

      const limit = limitOf(mover);
      const atEnd = atSegmentLimit(mover.distance, limit, mover.direction);
      if (atEnd && (mover.walk || !heldAtLights(mover, now))) {
        mover.distance = limit;
        arrive(mover, now, occupancy);
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
      if (beams && !mover.walk) headlights.aim(beams[beam++], mover);
    }
    if (staleMovers.size > 0) movers = movers.filter((mover) => !staleMovers.has(mover));
  });

  function vehicleTarget(mover: Mover): { segment: Segment; kind: string; vehicle: string; target(): { x: number; y: number; z: number; heading: number; segment: Segment } | null } {
    return {
      segment: mover.segment,
      kind: "Car",
      vehicle: mover.vehicle,
      target: () =>
        movers.includes(mover) && !mover.walk
          ? { x: mover.mesh.position.x, y: mover.mesh.position.y, z: mover.mesh.position.z, heading: mover.heading, segment: mover.segment }
          : null,
    };
  }

  return {
    rebuild,
    setSunHour,
    setLightsEnabled,
    setPaused(next: boolean) {
      paused = next;
    },
    setTimeScale(next: number) {
      timeScale = Math.max(0, next);
      paused = timeScale === 0;
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
      let bestDistance = 14;
      for (const mover of movers) {
        if (mover.walk) continue;
        const d = Math.hypot(mover.mesh.position.x - x, mover.mesh.position.z - z);
        if (d <= bestDistance) {
          best = mover;
          bestDistance = d;
        }
      }
      return best ? vehicleTarget(best) : null;
    },
    vehicleByMesh(name: string) {
      const mover = movers.find((candidate) => !candidate.walk && candidate.mesh.name === name);
      return mover ? vehicleTarget(mover) : null;
    },
    firstVehicle() {
      const mover = movers.find((candidate) => !candidate.walk);
      return mover ? vehicleTarget(mover) : null;
    },
    vehiclePoint(): { x: number; y: number; z: number } | null {
      const mover = movers.find((candidate) => !candidate.walk);
      return mover ? { x: mover.mesh.position.x, y: mover.mesh.position.y, z: mover.mesh.position.z } : null;
    },
    count: () => movers.filter((mover) => !mover.walk).length,
    pedestrians: () => movers.filter((mover) => mover.walk).length,
  };
}
