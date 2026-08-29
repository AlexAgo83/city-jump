import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math";

import type { NodeId, RoadGraph, Segment, SegmentId } from "../sim/graph";
import { junctionGeometry, ringElevation, ringLaneRadii } from "../sim/junction";
import { approach, laneRank, pickExit, ringArc, ringEntryRadius, ringTargetRadius } from "../sim/routing";
import { laneCentres, roadType, walkCentres, type LaneCentre } from "../sim/roadTypes";
import { normalizeXZ, perpXZ } from "../sim/vec";
import { ROAD_LIFT, SIDEWALK_LIFT, SIDEWALK_WIDTH } from "./roadMesh";

/** Matches the box mesh a car is built from below. */
const CAR_WIDTH = 3;

/** Everyone slows for a ring. */
const RING_PACE = 0.6;

/** Metres a car slides sideways per second while changing lane: about a lane every two seconds. */
const LANE_CHANGE_SPEED = 1.8;

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

/** Where a car is going round a ring, and how far into that ride it is. */
interface RingRide {
  readonly node: NodeId;
  readonly exit: SegmentId;
  readonly arc: number;
  /** The ring lane joined on entry, decided by the lane of the arm it came off. */
  readonly entryRadius: number;
  angle: number;
  travelled: number;
  /** Where the car is across the ring, sliding between ring lanes like it does on a road. */
  radius: number;
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
  lane: LaneCentre;
  /** Where the car actually is across the road, sliding towards `lane.offset`. */
  offset: number;
  /** Distance along the segment at which it moves to the other lane. Infinite when it stays. */
  changeAt: number;
  speed: number;
  ring: RingRide | null;
  plan: RingPlan | null;
}

/** What a roundabout node offers a car: where each arm meets the ring, and the ring itself. */
interface Ring {
  readonly arms: Map<SegmentId, number>;
  readonly radii: number[];
  readonly elevation: (angle: number) => number;
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
  const rings = new Map<NodeId, Ring>();

  function ringAt(nodeId: NodeId): Ring {
    const cached = rings.get(nodeId);
    if (cached) return cached;
    const geometry = junctionGeometry(graph, nodeId);
    const ring: Ring = {
      arms: new Map(geometry.arms.map((arm) => [arm.segment, arm.angle])),
      radii: ringLaneRadii(graph, nodeId, geometry.roundabout),
      elevation: ringElevation(geometry.arms, graph.node(nodeId).pos.y),
    };
    rings.set(nodeId, ring);
    return ring;
  }

  /** How far short of a node the carriageway stops: at a roundabout, the outer ring lane. */
  function trimAt(nodeId: NodeId, segment: Segment): number {
    if (!graph.node(nodeId).roundabout) return 0;
    const radii = ringAt(nodeId).radii;
    return Math.min(radii[radii.length - 1]!, segment.length * 0.45);
  }

  const roll = (car: Car): number => {
    car.seed = (car.seed * 1664525 + 1013904223) >>> 0;
    return car.seed / 2 ** 32;
  };

  const lanesFor = (segment: Segment, direction: 1 | -1): LaneCentre[] =>
    laneCentres(roadType(segment.type)).filter((lane) => lane.direction === direction);

  /** Puts a car at the near end of a segment, entering from `from`, in one of that way's lanes. */
  function board(car: Car, segmentId: SegmentId, from: NodeId, entryTrim = 0, kerbLane = false): void {
    const segment = graph.segment(segmentId);
    const direction = segment.a === from ? 1 : -1;
    const lanes = lanesFor(segment, direction);
    const trim = Math.min(entryTrim, segment.length * 0.45);
    car.segment = segment;
    car.direction = direction;
    car.distance = direction === 1 ? trim : segment.length - trim;
    car.speed = roadType(segment.type).maxSpeed * car.pace;
    car.ring = null;
    car.plan = planRing(car, segment, direction);
    // Three ways to end up in a lane, in order: positioned for the roundabout this road runs
    // into, kerb-side because the car has just come off one, or simply one of them at random.
    const wanted = car.plan ? (car.plan.arc > Math.PI / 2 ? 1 : 0) : kerbLane ? 0 : -1;
    const chosen =
      wanted < 0
        ? lanes[Math.floor(roll(car) * lanes.length)]
        : lanes.find((lane) => laneRank(lanes, lane) === Math.min(wanted, lanes.length - 1));
    car.lane = chosen ?? { offset: 0, direction };
    // A car already placed for a roundabout stays where it is; it has somewhere to be.
    car.changeAt = car.plan ? never(direction) : changePoint(car, segment, direction, lanes.length);
    // The offset is left where it was and slides to the new lane, so a turn comes out of the
    // junction on the line it went in on rather than snapping sideways on arrival.
  }

  /**
   * Where along this segment the car will change lane, if it does at all. Half the traffic on a
   * road with two lanes each way moves across somewhere in its middle third -- enough to read as
   * lanes being used rather than two fixed queues, without a car weaving every few metres.
   * ponytail: one change per segment, decided on entry. No overtaking, nothing to overtake.
   */
  function changePoint(car: Car, segment: Segment, direction: 1 | -1, lanes: number): number {
    if (lanes < 2 || roll(car) < 0.5) return never(direction);
    const along = (0.35 + roll(car) * 0.3) * segment.length;
    return direction === 1 ? along : segment.length - along;
  }

  /** A change point the car can never reach, whichever way it is going. */
  const never = (direction: 1 | -1): number => (direction === 1 ? Infinity : -Infinity);

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
    const ring = ringAt(node);
    const entry = ring.arms.get(segment.id);
    const leave = ring.arms.get(exit);
    if (entry === undefined || leave === undefined) return null;
    return { node, exit, arc: ringArc(entry, leave) };
  }

  /** The distance along the current segment at which the car has run out of road. */
  function limitOf(car: Car): number {
    const end = car.direction === 1 ? car.segment.b : car.segment.a;
    const trim = trimAt(end, car.segment);
    return car.direction === 1 ? car.segment.length - trim : trim;
  }

  /** Reached the end of a segment: pick what to do at the node, ring or plain junction. */
  function arrive(car: Car): void {
    const nodeId = car.direction === 1 ? car.segment.b : car.segment.a;
    const planned = car.plan?.node === nodeId ? car.plan : null;
    const next = planned?.exit ?? pickExit(graph, nodeId, car.segment.id, roll(car));
    if (next === null) {
      // A one-way into a dead end leaves no legal move at all. Turning round beats freezing.
      car.direction = -car.direction as 1 | -1;
      return;
    }
    if (!graph.node(nodeId).roundabout) {
      board(car, next, nodeId);
      return;
    }
    const ring = ringAt(nodeId);
    const entry = ring.arms.get(car.segment.id);
    const exit = ring.arms.get(next);
    if (entry === undefined || exit === undefined) {
      board(car, next, nodeId);
      return;
    }
    // Which ring lane this arm's lane feeds. The car aims for it from wherever it actually is:
    // joining the ring is a merge across the tarmac, not a jump onto a circle.
    const entryRadius = ringEntryRadius(ring.radii, laneRank(lanesFor(car.segment, car.direction), car.lane));
    const centre = graph.node(nodeId).pos;
    const at = Math.hypot(car.mesh.position.x - centre.x, car.mesh.position.z - centre.z);
    car.ring = {
      node: nodeId,
      exit: next,
      arc: planned?.arc ?? ringArc(entry, exit),
      entryRadius,
      angle: entry,
      travelled: 0,
      radius: Math.min(Math.max(at, ring.radii[0]!), ring.radii[ring.radii.length - 1]!),
    };
  }

  function rebuild(): void {
    for (const walker of walkers) walker.mesh.dispose();
    for (const car of cars) car.mesh.dispose();
    walkers = [];
    cars = [];
    rings.clear();

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
      const from = trimAt(seg.a, seg);
      const span = Math.max(1, seg.length - from - trimAt(seg.b, seg));
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
          offset: lane.offset,
          changeAt: lane.direction === 1 ? Infinity : -Infinity,
          speed: type.maxSpeed * pace,
          ring: null,
          plan: null,
        };
        // A car placed mid-road gets its change point like any other, or nothing moves across
        // until it has been round to a node and back.
        const sameWay = lanes.filter((l) => l.direction === lane.direction);
        car.plan = planRing(car, seg, lane.direction);
        if (car.plan) {
          const wanted = Math.min(car.plan.arc > Math.PI / 2 ? 1 : 0, sameWay.length - 1);
          car.lane = sameWay.find((l) => laneRank(sameWay, l) === wanted) ?? car.lane;
          car.offset = car.lane.offset;
        }
        car.changeAt = car.plan ? Infinity : changePoint(car, seg, lane.direction, sameWay.length);
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
      if (car.ring) {
        const ride = car.ring;
        const ring = ringAt(ride.node);
        const target = ringTargetRadius(ring.radii, ride.entryRadius, ride.arc - ride.travelled);
        // Merging onto a ring is brisker than an idle lane change on an open road.
        ride.radius = approach(ride.radius, target, LANE_CHANGE_SPEED * 2 * dt);
        const step = (car.speed * RING_PACE * dt) / ride.radius;
        ride.angle += step;
        ride.travelled += step;
        if (ride.travelled >= ride.arc) {
          board(car, ride.exit, ride.node, ride.radius, true);
        } else {
          const centre = graph.node(ride.node).pos;
          car.mesh.position.set(
            centre.x + Math.cos(ride.angle) * ride.radius,
            ring.elevation(ride.angle) + ROAD_LIFT + 0.75,
            centre.z + Math.sin(ride.angle) * ride.radius,
          );
          // Tangent of a growing bearing, which is the way traffic goes round.
          car.mesh.rotation.y = Math.atan2(-Math.sin(ride.angle), Math.cos(ride.angle));
          continue;
        }
      }

      car.distance += car.direction * car.speed * dt;
      const limit = limitOf(car);
      if (car.direction === 1 ? car.distance >= limit : car.distance <= limit) {
        car.distance = limit;
        arrive(car);
        if (car.ring) continue;
      } else if (car.direction === 1 ? car.distance >= car.changeAt : car.distance <= car.changeAt) {
        const lanes = lanesFor(car.segment, car.direction);
        car.lane = lanes.find((lane) => lane.offset !== car.lane.offset) ?? car.lane;
        car.changeAt = car.direction === 1 ? Infinity : -Infinity;
      }
      car.offset = approach(car.offset, car.lane.offset, LANE_CHANGE_SPEED * dt);
      const { position, tangent } = graph.pointAt(car.segment.id, car.distance);
      const normal = perpXZ(normalizeXZ(tangent));
      car.mesh.position.set(
        position.x + normal.x * car.offset,
        position.y + ROAD_LIFT + 0.75,
        position.z + normal.z * car.offset,
      );
      car.mesh.rotation.y = Math.atan2(tangent.x * car.direction, tangent.z * car.direction);
    }
  });

  return { rebuild, count: () => cars.length, pedestrians: () => walkers.length };
}
