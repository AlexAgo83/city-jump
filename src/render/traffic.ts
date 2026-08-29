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
import { laneRank, pickExit, ringArc, ringEntryRadius } from "../sim/routing";
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
  walkLoop,
  walkLoopSlice,
  walkRingRadius,
  type WalkLoop,
  type Ring,
} from "../sim/transfers";
import { normalizeXZ, perpXZ, v3, type Vec3 } from "../sim/vec";
import { ROAD_LIFT, SIDEWALK_LIFT, SIDEWALK_WIDTH } from "./roadMesh";
import { streetlightsOnAt } from "./streetlights";

/** The width a car is built to, which is what the lane spacing is measured against. */
const CAR_WIDTH = 3;

/**
 * How fast a heading can turn, in radians a second. A car has a steering wheel and cannot flick
 * round a corner; someone on foot pivots almost freely.
 */
const CAR_TURN_RATE = 2.6;
const WALKER_TURN_RATE = 7;

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
  travelled: number;
}

/** What a car has already decided about the roundabout its road ends at. Cars only. */
interface RingPlan {
  readonly node: NodeId;
  readonly exit: SegmentId;
  readonly arc: number;
}

/** Anything moving on the network: a car in a lane, or someone on a footway. */
interface Mover {
  readonly mesh: Mesh | InstancedMesh;
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
  /** Which way it is facing, which follows the path it is on rather than snapping to it. */
  heading: number;
  ride: Ride | null;
  plan: RingPlan | null;
}

/**
 * A body shape, in metres. Everything a car is made of comes off these numbers, so a new kind of
 * vehicle is a row in the table below rather than another lump of mesh-building code.
 */
interface CarShape {
  readonly name: string;
  readonly length: number;
  /** Height of the main body, whose underside sits clear of the road on the wheels. */
  readonly hull: number;
  /** Where the cabin sits along the car, and how long and tall it is. */
  readonly cabin: { at: number; length: number; height: number };
  /** Bonnet and boot ledges, each as a length; zero for a shape that has none. */
  readonly bonnet: number;
  readonly boot: number;
  readonly wheelBase: number;
  readonly wheel: number;
}

const CAR_SHAPES: CarShape[] = [
  {
    name: "saloon",
    length: 5.8,
    hull: 0.8,
    cabin: { at: -0.3, length: 2.8, height: 0.52 },
    bonnet: 1.6,
    boot: 1.1,
    wheelBase: 1.85,
    wheel: 0.92,
  },
  {
    // Shorter, taller, all cabin and no boot: the small car that fills a city.
    name: "hatchback",
    length: 4.6,
    hull: 0.86,
    cabin: { at: -0.5, length: 2.4, height: 0.6 },
    bonnet: 1.2,
    boot: 0,
    wheelBase: 1.5,
    wheel: 0.86,
  },
  {
    // A cab at the front and a box behind it: a van, and the tallest thing on the road.
    name: "van",
    length: 6.6,
    hull: 1.35,
    cabin: { at: 1.5, length: 2.4, height: 0.66 },
    bonnet: 1.3,
    boot: 0,
    wheelBase: 2.2,
    wheel: 1,
  },
];

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
    CAR_COLORS.map((color, i) => {
      const material = new StandardMaterial(`car_${shape.name}_${i}`, scene);
      material.diffuseColor = color;
      material.specularColor = new Color3(0.25, 0.25, 0.25);

      const floor = shape.wheel / 2;
      const parts = [
        slab(`car_hull_${shape.name}_${i}`, CAR_WIDTH - 0.1, shape.hull, shape.length, 0, floor + shape.hull / 2, 0),
        // Wider than the glass under it, so the roof caps the cabin instead of sitting inside it.
        slab(
          `car_roof_${shape.name}_${i}`,
          CAR_WIDTH - 0.48,
          0.16,
          shape.cabin.length + 0.1,
          0,
          floor + shape.hull + shape.cabin.height + 0.08,
          shape.cabin.at,
        ),
      ];
      // The ledges fore and aft, which is what tells the front of a car from its back from above.
      const ledge = (name: string, depth: number, at: number) =>
        slab(name, CAR_WIDTH - 0.22, 0.16, depth, 0, floor + shape.hull + 0.08, at);
      if (shape.bonnet > 0) parts.push(ledge(`car_bonnet_${shape.name}_${i}`, shape.bonnet, (shape.length - shape.bonnet) / 2));
      if (shape.boot > 0) parts.push(ledge(`car_boot_${shape.name}_${i}`, shape.boot, -(shape.length - shape.boot) / 2));

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
      const lamps = [-1, 1].map((side) =>
        slab(
          `car_${end}_${shape.name}_${side}`,
          0.62,
          0.3,
          0.3,
          side * (CAR_WIDTH / 2 - 0.55),
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
  const lightsOn = () => streetlightsOnAt(sunHour);

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

  /** Wheels and glass for each shape: one prototype whatever colour the body it rides on is. */
  const carParts = CAR_SHAPES.map((shape) => {
    const dark = new StandardMaterial(`car_parts_${shape.name}`, scene);
    dark.diffuseColor = new Color3(0.09, 0.1, 0.12);
    dark.specularColor = new Color3(0.35, 0.35, 0.4);

    const floor = shape.wheel / 2;
    const glass = slab(
      `car_glass_${shape.name}`,
      CAR_WIDTH - 0.58,
      shape.cabin.height,
      shape.cabin.length,
      0,
      floor + shape.hull + shape.cabin.height / 2,
      shape.cabin.at,
    );
    const wheels = [-1, 1].flatMap((side) =>
      [shape.wheelBase, -shape.wheelBase].map((z) => {
        const wheel = MeshBuilder.CreateCylinder(
          `car_wheel_${shape.name}_${side}_${z}`,
          { diameter: shape.wheel, height: 0.36, tessellation: 10 },
          scene,
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * (CAR_WIDTH / 2 - 0.1), floor, z);
        return wheel;
      }),
    );
    const parts = Mesh.MergeMeshes([glass, ...wheels], true, true, undefined, false, false);
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

  const loops = new Map<NodeId, WalkLoop>();

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
    readonly plan: RingPlan | null;
  }

  /**
   * Three ways to end up in a lane, in order: positioned for the roundabout this road runs into,
   * kerb-side because the car has just come off one, or simply one of them at random -- and then
   * half of what is left changes lane on the way, along the road's own drawn weave.
   * ponytail: one change per road, decided on entry. No overtaking, nothing to overtake.
   */
  function chooseEntry(mover: Mover, segment: Segment, direction: 1 | -1, kerbLane: boolean): Entry {
    const lanes = lanesFor(segment, direction, mover.walk);
    const fallback = { offset: 0, direction } as LaneCentre;
    // A footway has no lane to pick and no roundabout lane to line up for: it is just a side.
    if (mover.walk) return { lane: lanes[0] ?? fallback, changing: null, plan: null };
    const plan = planRing(mover, segment, direction);
    if (plan) {
      const wanted = Math.min(plan.arc > Math.PI / 2 ? 1 : 0, lanes.length - 1);
      // A car placed for a roundabout stays put; it has somewhere to be.
      return { lane: lanes.find((lane) => laneRank(lanes, lane) === wanted) ?? fallback, changing: null, plan };
    }
    if (lanes.length > 1 && !kerbLane && roll(mover) < 0.5) {
      // The weave is drawn from the first lane of this direction to the second; a car changing
      // lane starts in the first so it travels the line that is drawn.
      return { lane: lanes[1]!, changing: lanes[0]!, plan: null };
    }
    const lane = kerbLane
      ? lanes.find((l) => laneRank(lanes, l) === 0)
      : lanes[Math.floor(roll(mover) * lanes.length)];
    return { lane: lane ?? fallback, changing: null, plan: null };
  }

  /** Puts a car on a road, at `trim` from the node it entered by. */
  function board(mover: Mover, segmentId: SegmentId, from: NodeId, entry: Entry, trim: number): void {
    const segment = graph.segment(segmentId);
    const direction = segment.a === from ? 1 : -1;
    const at = Math.min(trim, segment.length * 0.45);
    mover.segment = segment;
    mover.direction = direction;
    mover.distance = direction === 1 ? at : segment.length - at;
    mover.speed = (mover.walk ? WALKER_SPEED : roadType(segment.type).maxSpeed) * mover.pace;
    mover.lane = entry.lane;
    mover.changing = entry.changing;
    mover.plan = entry.plan;
    mover.ride = null;
  }

  /**
   * One node ahead: when this road ends at a roundabout, the exit is chosen on entering the road
   * rather than on reaching the ring, because that is what decides the lane to travel in. The
   * next exit is taken from the kerb lane, anything further round from the lane beside the
   * centreline -- which is exactly the ring lane each of those feeds.
   */
  function planRing(mover: Mover, segment: Segment, direction: 1 | -1): RingPlan | null {
    const node = direction === 1 ? segment.b : segment.a;
    if (!graph.node(node).roundabout) return null;
    const exit = pickExit(graph, node, segment.id, roll(mover));
    // (cars only: chooseEntry never asks for a walker's plan)
    if (exit === null) return null;
    const entry = armOf(node, segment.id);
    const leave = armOf(node, exit);
    if (!entry || !leave) return null;
    return { node, exit, arc: ringArc(entry.angle, leave.angle) };
  }

  /** How far across its lane change the car is, and so where it sits across the road. */
  function offsetOf(mover: Mover): number {
    if (!mover.changing) return mover.lane.offset;
    const seg = mover.segment;
    const span = laneChangeSpan(trimAt(seg.a, seg.id), seg.length - trimAt(seg.b, seg.id));
    const travelled = mover.direction === 1 ? mover.distance - span.start : span.end - mover.distance;
    return laneChangeOffset(mover.changing.offset, mover.lane.offset, travelled / (span.end - span.start));
  }

  /** The distance along the current segment at which the car has run out of road. */
  function limitOf(mover: Mover): number {
    const end = mover.direction === 1 ? mover.segment.b : mover.segment.a;
    const trim = Math.min(trimAt(end, mover.segment.id), mover.segment.length * 0.45);
    return mover.direction === 1 ? mover.segment.length - trim : trim;
  }

  /**
   * Reached the end of a road. The car takes the drawn transfer from here to its next lane: the
   * junction's own turn curve, or a roundabout's merge, sweep and exit joined into one.
   */
  function arrive(mover: Mover): void {
    const nodeId = mover.direction === 1 ? mover.segment.b : mover.segment.a;
    const planned = mover.plan?.node === nodeId ? mover.plan : null;
    const next = planned?.exit ?? pickExit(graph, nodeId, mover.segment.id, roll(mover), mover.walk);
    if (next === null) {
      // A one-way into a dead end leaves no legal move at all. Turning round beats freezing.
      mover.direction = -mover.direction as 1 | -1;
      return;
    }
    const roundabout = graph.node(nodeId).roundabout;
    const entry = chooseEntry(mover, graph.segment(next), graph.segment(next).a === nodeId ? 1 : -1, roundabout);
    const trim = trimAt(nodeId, next);
    const from = armOf(nodeId, mover.segment.id);
    const to = armOf(nodeId, next);
    // Landing on the exit road in the lane it will start in, which is the one it changes from.
    const landing = entry.changing ?? entry.lane;

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
    mover.ride = {
      points,
      cumulative: pathCumulative(points),
      exit: next,
      from: nodeId,
      lane: entry.lane,
      changing: entry.changing,
      trim,
      pace: mover.walk ? 1 : roundabout ? RING_PACE : JUNCTION_PACE,
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

  function rebuild(): void {
    for (const mover of movers) mover.mesh.dispose();
    movers = [];
    junctions.clear();
    ringsAt.clear();
    loops.clear();

    for (const [si, seg] of graph.allSegments().entries()) {
      const type = roadType(seg.type);
      if (type.tunnelDepth) continue;
      const from = trimAt(seg.a, seg.id);
      const span = Math.max(1, seg.length - from - trimAt(seg.b, seg.id));

      /** Puts one mover on this road, entering it the way any other would. */
      const place = (mesh: Mesh | InstancedMesh, i: number, count: number, walk: boolean, lane: LaneCentre): void => {
        const pace = walk
          ? 0.75 + ((si + i * 7) % 5) * 0.12
          : 0.85 + ((si + i * 3) % 5) * 0.075;
        const mover: Mover = {
          mesh,
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
          heading: 0,
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
      };

      // Down the middle of a path, along the footway of anything else. A highway has a guardrail
      // where that footway would be, so nobody walks it.
      if (!type.highway) {
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
          place(walker, i, count, true, walks[i % walks.length]!);
        }
      }
      if (type.pedestrian) continue;

      const lanes = laneCentres(type);
      const count = Math.min(4, Math.max(1, Math.floor(seg.length / 80)));
      for (let i = 0; i < count; i++) {
        // Shape and colour picked apart from each other, so a street carries a mix of both.
        const shape = (si * 3 + i) % CAR_SHAPES.length;
        const body = carBodies[shape]![(si + i) % CAR_COLORS.length]!.createInstance(`traffic_${seg.id}_${i}`);
        body.isPickable = false;
        // Wheels and glass ride along: parented, so only the body is ever positioned.
        for (const source of [carParts[shape]!, carLamps[shape]!.head, carLamps[shape]!.tail]) {
          const part = source.createInstance(`carpart_${seg.id}_${i}_${source.name}`);
          part.isPickable = false;
          part.parent = body;
        }
        place(body, i, count, false, lanes[i % lanes.length]!);
      }
    }

    syncHeadlights(movers.filter((mover) => !mover.walk).length);
  }

  /** Faces a mover along a heading, turning towards it rather than snapping onto it. */
  function face(mover: Mover, heading: number, dt: number): void {
    const rate = (mover.walk ? WALKER_TURN_RATE : CAR_TURN_RATE) * dt;
    mover.heading = approachAngle(mover.heading, heading, rate);
    mover.mesh.rotation.y = mover.heading;
  }

  scene.registerBeforeRender(() => {
    const now = performance.now() / 1000;
    const dt = Math.min(MAX_STEP_S, scene.getEngine().getDeltaTime() / 1000);

    const beams = lightsOn() ? headlights : null;
    let beam = 0;

    for (const mover of movers) {
      const bob = mover.stride === 0 ? 0 : Math.abs(Math.sin(now * 5 + mover.phase)) * mover.stride;

      if (mover.ride) {
        const ride = mover.ride;
        ride.travelled += mover.speed * ride.pace * dt;
        const total = ride.cumulative[ride.cumulative.length - 1]!;
        if (ride.travelled >= total) {
          board(mover, ride.exit, ride.from, { lane: ride.lane, changing: ride.changing, plan: mover.plan }, ride.trim);
        } else {
          const { position, tangent } = pointAlong(ride.points, ride.cumulative, ride.travelled);
          mover.mesh.position.set(position.x, position.y + mover.lift + bob, position.z);
          face(mover, Math.atan2(tangent.x, tangent.z), dt);
          if (beams && !mover.walk) aimBeam(beams[beam++], mover);
          continue;
        }
      }

      mover.distance += mover.direction * mover.speed * dt;
      const limit = limitOf(mover);
      if (mover.direction === 1 ? mover.distance >= limit : mover.distance <= limit) {
        mover.distance = limit;
        arrive(mover);
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
  });

  /** Puts a beam at the nose of its car, pointing the way the car faces and a little down. */
  function aimBeam(beam: SpotLight | undefined, mover: Mover): void {
    if (!beam) return;
    const heading = mover.mesh.rotation.y;
    const forward = { x: Math.sin(heading), z: Math.cos(heading) };
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
    count: () => movers.filter((mover) => !mover.walk).length,
    pedestrians: () => movers.filter((mover) => mover.walk).length,
  };
}
