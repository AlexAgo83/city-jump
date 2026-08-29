import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math";

import type { NodeId, RoadGraph, Segment, SegmentId } from "../sim/graph";
import { junctionGeometry, ringLaneRadii, type JunctionArm, type JunctionGeometry } from "../sim/junction";
import { laneRank, pickExit, ringArc, ringEntryRadius } from "../sim/routing";
import { laneCentres, roadType, walkCentres, type LaneCentre } from "../sim/roadTypes";
import {
  armPort,
  exitAngle,
  junctionTurnPath,
  laneChangeOffset,
  sampleQuadratic,
  laneChangeSpan,
  mergeAngle,
  pathCumulative,
  pointAlong,
  ringJoinPath,
  ringOf,
  ringSweep,
  type Ring,
} from "../sim/transfers";
import { normalizeXZ, perpXZ, v3, type Vec3 } from "../sim/vec";
import { ROAD_LIFT, SIDEWALK_LIFT, SIDEWALK_WIDTH } from "./roadMesh";

/** Matches the box mesh a car is built from below. */
const CAR_WIDTH = 3;

/** Everyone slows for a ring, and eases off a little through a plain junction. */
const RING_PACE = 0.6;
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

/** A walker still just shuttles along one segment; only cars route. */
interface Walker {
  readonly mesh: Mesh | InstancedMesh;
  readonly segment: Segment;
  readonly direction: 1 | -1;
  readonly speed: number;
  readonly lift: number;
  readonly stride: number;
  readonly phase: number;
  readonly offset: number;
}

/**
 * A transfer in progress: the very polyline the Traffic view draws for this movement, being
 * driven along. When it runs out the car lands on `exit`, in `lane`, at `trim` along it.
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
  travelled: number;
}

/** What a car has already decided about the roundabout its current road ends at. */
interface RingPlan {
  readonly node: NodeId;
  readonly exit: SegmentId;
  readonly arc: number;
}

interface Car {
  readonly mesh: Mesh;
  /** Personal pace, so a queue of cars on one road does not move as one block. */
  readonly pace: number;
  seed: number;
  segment: Segment;
  direction: 1 | -1;
  /** Distance along the segment in its own a -> b sense, whichever way the car faces. */
  distance: number;
  /** The lane it is in, or ends this road in when it is changing lane. */
  lane: LaneCentre;
  /** The lane it started this road in, while a lane change is still to happen or under way. */
  changing: LaneCentre | null;
  speed: number;
  ride: Ride | null;
  plan: RingPlan | null;
}

export function createTrafficRenderer(scene: Scene, graph: RoadGraph) {
  const carMaterials = CAR_COLORS.map((color, i) => {
    const material = new StandardMaterial(`car_${i}`, scene);
    material.diffuseColor = color;
    material.specularColor = Color3.Black();
    return material;
  });

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

  let walkers: Walker[] = [];
  let cars: Car[] = [];
  /** Built on demand and dropped on every rebuild: the geometry behind it moves with the graph. */
  const junctions = new Map<NodeId, JunctionGeometry>();
  const ringsAt = new Map<NodeId, Ring>();

  function junctionAt(nodeId: NodeId): JunctionGeometry {
    const cached = junctions.get(nodeId);
    if (cached) return cached;
    const geometry = junctionGeometry(graph, nodeId);
    junctions.set(nodeId, geometry);
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

  const armOf = (nodeId: NodeId, segmentId: SegmentId): JunctionArm | undefined =>
    junctionAt(nodeId).arms.find((arm) => arm.segment === segmentId);

  /**
   * Where the carriageway stops short of a node -- the same trim the road surface and the lane
   * lines are drawn to, so a car leaves the road exactly where the turn diagram picks it up.
   */
  function trimAt(nodeId: NodeId, segmentId: SegmentId): number {
    return armOf(nodeId, segmentId)?.trim ?? 0;
  }

  const roll = (car: Car): number => {
    car.seed = (car.seed * 1664525 + 1013904223) >>> 0;
    return car.seed / 2 ** 32;
  };

  const lanesFor = (segment: Segment, direction: 1 | -1): LaneCentre[] =>
    laneCentres(roadType(segment.type)).filter((lane) => lane.direction === direction);

  /** The lane a car should be in on a road, and the lane it starts in if it changes on the way. */
  interface Entry {
    readonly lane: LaneCentre;
    readonly changing: LaneCentre | null;
    readonly plan: RingPlan | null;
  }

  /**
   * Three ways to end up in a lane, in order: positioned for the roundabout this road runs into,
   * kerb-side because the car has just come off one, or simply one of them at random -- and then
   * half of what is left changes lane on the way, along the road's own drawn weave.
   * ponytail: one change per road, decided on entry. No overtaking, nothing to overtake.
   */
  function chooseEntry(car: Car, segment: Segment, direction: 1 | -1, kerbLane: boolean): Entry {
    const lanes = lanesFor(segment, direction);
    const fallback = { offset: 0, direction } as LaneCentre;
    const plan = planRing(car, segment, direction);
    if (plan) {
      const wanted = Math.min(plan.arc > Math.PI / 2 ? 1 : 0, lanes.length - 1);
      // A car placed for a roundabout stays put; it has somewhere to be.
      return { lane: lanes.find((lane) => laneRank(lanes, lane) === wanted) ?? fallback, changing: null, plan };
    }
    if (lanes.length > 1 && !kerbLane && roll(car) < 0.5) {
      // The weave is drawn from the first lane of this direction to the second; a car changing
      // lane starts in the first so it travels the line that is drawn.
      return { lane: lanes[1]!, changing: lanes[0]!, plan: null };
    }
    const lane = kerbLane
      ? lanes.find((l) => laneRank(lanes, l) === 0)
      : lanes[Math.floor(roll(car) * lanes.length)];
    return { lane: lane ?? fallback, changing: null, plan: null };
  }

  /** Puts a car on a road, at `trim` from the node it entered by. */
  function board(car: Car, segmentId: SegmentId, from: NodeId, entry: Entry, trim: number): void {
    const segment = graph.segment(segmentId);
    const direction = segment.a === from ? 1 : -1;
    const at = Math.min(trim, segment.length * 0.45);
    car.segment = segment;
    car.direction = direction;
    car.distance = direction === 1 ? at : segment.length - at;
    car.speed = roadType(segment.type).maxSpeed * car.pace;
    car.lane = entry.lane;
    car.changing = entry.changing;
    car.plan = entry.plan;
    car.ride = null;
  }

  /**
   * One node ahead: when this road ends at a roundabout, the exit is chosen on entering the road
   * rather than on reaching the ring, because that is what decides the lane to travel in. The
   * next exit is taken from the kerb lane, anything further round from the lane beside the
   * centreline -- which is exactly the ring lane each of those feeds.
   */
  function planRing(car: Car, segment: Segment, direction: 1 | -1): RingPlan | null {
    const node = direction === 1 ? segment.b : segment.a;
    if (!graph.node(node).roundabout) return null;
    const exit = pickExit(graph, node, segment.id, roll(car));
    if (exit === null) return null;
    const entry = armOf(node, segment.id);
    const leave = armOf(node, exit);
    if (!entry || !leave) return null;
    return { node, exit, arc: ringArc(entry.angle, leave.angle) };
  }

  /** How far across its lane change the car is, and so where it sits across the road. */
  function offsetOf(car: Car): number {
    if (!car.changing) return car.lane.offset;
    const seg = car.segment;
    const span = laneChangeSpan(trimAt(seg.a, seg.id), seg.length - trimAt(seg.b, seg.id));
    const travelled = car.direction === 1 ? car.distance - span.start : span.end - car.distance;
    return laneChangeOffset(car.changing.offset, car.lane.offset, travelled / (span.end - span.start));
  }

  /** The distance along the current segment at which the car has run out of road. */
  function limitOf(car: Car): number {
    const end = car.direction === 1 ? car.segment.b : car.segment.a;
    const trim = Math.min(trimAt(end, car.segment.id), car.segment.length * 0.45);
    return car.direction === 1 ? car.segment.length - trim : trim;
  }

  /**
   * Reached the end of a road. The car takes the drawn transfer from here to its next lane: the
   * junction's own turn curve, or a roundabout's merge, sweep and exit joined into one.
   */
  function arrive(car: Car): void {
    const nodeId = car.direction === 1 ? car.segment.b : car.segment.a;
    const planned = car.plan?.node === nodeId ? car.plan : null;
    const next = planned?.exit ?? pickExit(graph, nodeId, car.segment.id, roll(car));
    if (next === null) {
      // A one-way into a dead end leaves no legal move at all. Turning round beats freezing.
      car.direction = -car.direction as 1 | -1;
      return;
    }
    const roundabout = graph.node(nodeId).roundabout;
    const entry = chooseEntry(car, graph.segment(next), graph.segment(next).a === nodeId ? 1 : -1, roundabout);
    const trim = trimAt(nodeId, next);
    const from = armOf(nodeId, car.segment.id);
    const to = armOf(nodeId, next);
    // Landing on the exit road in the lane it will start in, which is the one it changes from.
    const landing = entry.changing ?? entry.lane;

    // A dead end has no junction and so no drawn turn: the car turns round on the spot. Same
    // curve, bowed past the end of the road rather than towards a node's centre.
    const points =
      !from || !to || next === car.segment.id
        ? uTurnPath(car, landing.offset)
        : roundabout
          ? ringTransfer(car, nodeId, from, to, landing.offset)
          : junctionTurnPath(
              graph.node(nodeId).pos,
              armPort(graph, nodeId, from, car.lane.offset),
              armPort(graph, nodeId, to, landing.offset),
            );
    car.ride = {
      points,
      cumulative: pathCumulative(points),
      exit: next,
      from: nodeId,
      lane: entry.lane,
      changing: entry.changing,
      trim,
      pace: roundabout ? RING_PACE : JUNCTION_PACE,
      travelled: 0,
    };
    car.plan = entry.plan;
  }

  /** Turning round where the road simply stops: out on one lane, back on the other. */
  function uTurnPath(car: Car, exitOffset: number): Vec3[] {
    const { position, tangent } = graph.pointAt(car.segment.id, car.distance);
    const n = perpXZ(normalizeXZ(tangent));
    const port = (offset: number): Vec3 =>
      v3(position.x + n.x * offset, position.y, position.z + n.z * offset);
    const reach = Math.abs(car.lane.offset - exitOffset) + 4;
    const nose = v3(
      position.x + tangent.x * car.direction * reach,
      position.y,
      position.z + tangent.z * car.direction * reach,
    );
    return sampleQuadratic(port(car.lane.offset), nose, port(exitOffset), 12);
  }

  /** Merge on, round, and off again: the three drawn curves of a roundabout, end to end. */
  function ringTransfer(car: Car, nodeId: NodeId, from: JunctionArm, to: JunctionArm, exitOffset: number): Vec3[] {
    const ring = ringAt(nodeId);
    const outer = ring.radii[ring.radii.length - 1]!;
    // Which ring lane this arm's lane feeds: kerb-side onto the outer one, the lane beside the
    // centreline onto the inner.
    const radius = ringEntryRadius(ring.radii, laneRank(lanesFor(car.segment, car.direction), car.lane));
    const start = mergeAngle(graph, ring, from);
    const finish = exitAngle(graph, ring, to);
    const arc = ringArc(start, finish);
    const steps = Math.max(8, Math.round((arc / (Math.PI / 2)) * 12));
    return [
      ...ringJoinPath(graph, ring, from, car.lane.offset, radius, true),
      ...ringSweep(ring, start, radius, start + arc, outer, steps),
      ...ringJoinPath(graph, ring, to, exitOffset, outer, false),
    ];
  }

  function rebuild(): void {
    for (const walker of walkers) walker.mesh.dispose();
    for (const car of cars) car.mesh.dispose();
    walkers = [];
    cars = [];
    junctions.clear();
    ringsAt.clear();

    for (const [si, seg] of graph.allSegments().entries()) {
      const type = roadType(seg.type);
      if (type.tunnelDepth) continue;

      // Down the middle of a path, along the footway of anything else. A highway has a guardrail
      // where that footway would be, so nobody walks it.
      if (!type.highway) {
        const walkLift = type.pedestrian ? ROAD_LIFT + 0.58 : SIDEWALK_LIFT + 0.58;
        const walks = walkCentres(type, SIDEWALK_WIDTH);
        // A path is all footway, so it carries more; a street gets a handful either side.
        const count = type.pedestrian
          ? Math.min(8, Math.max(2, Math.floor(seg.length / 22)))
          : Math.min(6, Math.floor(seg.length / 45));

        for (let i = 0; i < count; i++) {
          const walker = walkerPrototypes[(si + i) % walkerPrototypes.length]!.createInstance(
            `pedestrian_${seg.id}_${i}`,
          );
          walker.isPickable = false;
          const walk = walks[i % walks.length]!;
          walkers.push({
            mesh: walker,
            segment: seg,
            direction: walk.direction,
            // Vary the pace a little, or a path reads as a conveyor belt.
            speed: WALKER_SPEED * (0.75 + ((si + i * 7) % 5) * 0.12),
            lift: walkLift,
            stride: 0.05,
            phase: (((si * 13 + i * 29) % 100) / 100) * Math.PI * 2,
            offset: walk.offset * -walk.direction,
          });
        }
      }
      if (type.pedestrian) continue;

      const lanes = laneCentres(type);
      const count = Math.min(4, Math.max(1, Math.floor(seg.length / 80)));
      const from = trimAt(seg.a, seg.id);
      const span = Math.max(1, seg.length - from - trimAt(seg.b, seg.id));
      for (let i = 0; i < count; i++) {
        const mesh = MeshBuilder.CreateBox(`traffic_${seg.id}_${i}`, { width: CAR_WIDTH, height: 1.2, depth: 6 }, scene);
        mesh.material = carMaterials[(si + i) % carMaterials.length]!;
        mesh.isPickable = false;
        const lane = lanes[i % lanes.length]!;
        const pace = 0.85 + ((si + i * 3) % 5) * 0.075;
        const car: Car = {
          mesh,
          pace,
          seed: (si * 2654435761 + i * 40503) >>> 0,
          segment: seg,
          direction: lane.direction,
          distance: from + ((i + 0.5) / count) * span,
          lane,
          changing: null,
          speed: type.maxSpeed * pace,
          ride: null,
          plan: null,
        };
        // Placed mid-road, but otherwise entering it like any other car.
        const entry = chooseEntry(car, seg, lane.direction, false);
        car.lane = entry.lane;
        car.changing = entry.changing;
        car.plan = entry.plan;
        cars.push(car);
      }
    }
  }

  scene.registerBeforeRender(() => {
    const now = performance.now() / 1000;
    const dt = Math.min(MAX_STEP_S, scene.getEngine().getDeltaTime() / 1000);

    for (const walker of walkers) {
      const seg = walker.segment;
      const travelled = (now * walker.speed + walker.phase * 6) % seg.length;
      const { position, tangent } = graph.pointAt(
        seg.id,
        walker.direction === 1 ? travelled : seg.length - travelled,
      );
      const normal = perpXZ(normalizeXZ(tangent));
      const offset = walker.offset * -walker.direction;
      const bob = Math.abs(Math.sin(now * 5 + walker.phase)) * walker.stride;
      walker.mesh.position.set(
        position.x + normal.x * offset,
        position.y + walker.lift + bob,
        position.z + normal.z * offset,
      );
      walker.mesh.rotation.y = Math.atan2(tangent.x * walker.direction, tangent.z * walker.direction);
    }

    for (const car of cars) {
      if (car.ride) {
        const ride = car.ride;
        ride.travelled += car.speed * ride.pace * dt;
        const total = ride.cumulative[ride.cumulative.length - 1]!;
        if (ride.travelled >= total) {
          board(car, ride.exit, ride.from, { lane: ride.lane, changing: ride.changing, plan: car.plan }, ride.trim);
        } else {
          const { position, tangent } = pointAlong(ride.points, ride.cumulative, ride.travelled);
          car.mesh.position.set(position.x, position.y + ROAD_LIFT + 0.75, position.z);
          car.mesh.rotation.y = Math.atan2(tangent.x, tangent.z);
          continue;
        }
      }

      car.distance += car.direction * car.speed * dt;
      const limit = limitOf(car);
      if (car.direction === 1 ? car.distance >= limit : car.distance <= limit) {
        car.distance = limit;
        arrive(car);
        if (car.ride) continue;
      }
      const offset = offsetOf(car);
      const { position, tangent } = graph.pointAt(car.segment.id, car.distance);
      const normal = perpXZ(normalizeXZ(tangent));
      car.mesh.position.set(
        position.x + normal.x * offset,
        position.y + ROAD_LIFT + 0.75,
        position.z + normal.z * offset,
      );
      car.mesh.rotation.y = Math.atan2(tangent.x * car.direction, tangent.z * car.direction);
    }
  });

  return { rebuild, count: () => cars.length, pedestrians: () => walkers.length };
}
