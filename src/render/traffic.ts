import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math";

import type { RoadGraph, Segment } from "../sim/graph";
import { roadType } from "../sim/roadTypes";
import { normalizeXZ, perpXZ } from "../sim/vec";
import { ROAD_LIFT, SIDEWALK_LIFT, SIDEWALK_WIDTH } from "./roadMesh";

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

/** Anything moving along a segment. Cars and walkers differ only in these numbers. */
interface Mover {
  readonly mesh: Mesh | InstancedMesh;
  readonly segment: Segment;
  readonly direction: 1 | -1;
  readonly speed: number;
  readonly lift: number;
  /** Non-zero only for walkers, which bob as they go. */
  readonly stride: number;
  readonly phase: number;
  /** Distance from the centre line. Cars keep to their lane, walkers to the footway. */
  readonly offset: number;
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

  let movers: Mover[] = [];
  let carCount = 0;
  let walkerCount = 0;

  function rebuild(): void {
    for (const mover of movers) mover.mesh.dispose();
    movers = [];
    carCount = 0;
    walkerCount = 0;

    for (const [si, seg] of graph.allSegments().entries()) {
      const type = roadType(seg.type);
      if (type.tunnelDepth) continue;

      const half = type.width / 2;
      // Down the middle of a path, along the footway of anything else. A highway has a guardrail
      // where that footway would be, so nobody walks it.
      if (!type.highway) {
        const walkOffset = type.pedestrian ? Math.max(0.7, half * 0.45) : half + SIDEWALK_WIDTH / 2;
        const walkLift = type.pedestrian ? ROAD_LIFT + 0.58 : SIDEWALK_LIFT + 0.58;
        // A path is all footway, so it carries more; a street gets a handful either side.
        const walkers = type.pedestrian
          ? Math.min(8, Math.max(2, Math.floor(seg.length / 22)))
          : Math.min(6, Math.floor(seg.length / 45));

        for (let i = 0; i < walkers; i++) {
          const walker = walkerPrototypes[(si + i) % walkerPrototypes.length]!.createInstance(
            `pedestrian_${seg.id}_${i}`,
          );
          walker.isPickable = false;
          movers.push({
            mesh: walker,
            segment: seg,
            direction: i % 2 ? -1 : 1,
            // Vary the pace a little, or a path reads as a conveyor belt.
            speed: WALKER_SPEED * (0.75 + ((si + i * 7) % 5) * 0.12),
            lift: walkLift,
            stride: 0.05,
            phase: (((si * 13 + i * 29) % 100) / 100) * Math.PI * 2,
            offset: walkOffset,
          });
          walkerCount++;
        }
      }
      if (type.pedestrian) continue;

      // One magnitude per lane, not per direction: `lane` picks which of a side's lanes a car
      // takes, `side` picks which side of the road (always the same side on a one-way road,
      // since there is no oncoming lane to put the other half of the cars on). Lanes === 1
      // collapses `side` back to the original i % 2 alternation.
      //
      // A two-way road only owns half the carriageway per direction, so its lane(s) sit centred
      // on that half. A one-way road owns the whole carriageway (that is exactly why it no longer
      // widens for a second lane, see roadTypes.ts), so its lanes centre on the road itself --
      // offsetting them as if only half the width were theirs ran cars onto the sidewalk on the
      // narrower one-way types.
      //
      // Two real lanes need real spacing: a car is CAR_WIDTH wide, so two lane centres closer
      // than LANE_PITCH apart put their bodies through each other, and an inner lane closer than
      // CENTRE_CLEARANCE to the road's own centre lets it swing into the oncoming lane. Those are
      // just floors, though -- on a wide avenue, holding lanes at the floor leaves them huddled by
      // the centreline with the rest of the carriageway empty, so lanes also spread proportionally
      // to how much half-width is actually there, capped so the outer lane still clears the curb.
      const CAR_WIDTH = 3; // matches the box mesh below
      const LANE_PITCH = CAR_WIDTH + 0.4;
      const CENTRE_CLEARANCE = CAR_WIDTH / 2 + 0.3;
      const halfWidth = type.width / 2;
      const maxLaneOffset = halfWidth - CAR_WIDTH / 2 - 0.3; // stays clear of the sidewalk
      const singleLaneOffset = type.oneWay ? 0 : Math.max(1.8, type.width * 0.22);
      const innerLane = Math.max(CENTRE_CLEARANCE, halfWidth * 0.3);
      const outerLane = Math.min(Math.max(innerLane + LANE_PITCH, halfWidth * 0.65), maxLaneOffset);
      const oneWaySpread = Math.min(Math.max(LANE_PITCH / 2, halfWidth * 0.3), maxLaneOffset);
      const laneOffsets =
        type.lanes === 2
          ? type.oneWay
            ? [-oneWaySpread, oneWaySpread]
            : [innerLane, outerLane]
          : [singleLaneOffset];

      const count = Math.min(4, Math.max(1, Math.floor(seg.length / 80)));
      for (let i = 0; i < count; i++) {
        const car = MeshBuilder.CreateBox(`traffic_${seg.id}_${i}`, { width: CAR_WIDTH, height: 1.2, depth: 6 }, scene);
        car.material = carMaterials[(si + i) % carMaterials.length]!;
        car.isPickable = false;
        const lane = i % type.lanes;
        const side = type.oneWay ? 1 : Math.floor(i / type.lanes) % 2 ? -1 : 1;
        movers.push({
          mesh: car,
          segment: seg,
          direction: side,
          speed: type.maxSpeed,
          lift: ROAD_LIFT + 0.75,
          stride: 0,
          phase: i * 35,
          offset: laneOffsets[lane]!,
        });
        carCount++;
      }
    }
  }

  scene.registerBeforeRender(() => {
    const now = performance.now() / 1000;
    for (const mover of movers) {
      const seg = mover.segment;
      mover.mesh.setEnabled(true);
      const travelled = (now * mover.speed + mover.phase * 6) % seg.length;
      const { position, tangent } = graph.pointAt(
        seg.id,
        mover.direction === 1 ? travelled : seg.length - travelled,
      );
      const normal = perpXZ(normalizeXZ(tangent));
      const offset = mover.offset * -mover.direction;
      const bob = mover.stride === 0 ? 0 : Math.abs(Math.sin(now * 5 + mover.phase)) * mover.stride;
      mover.mesh.position.set(
        position.x + normal.x * offset,
        position.y + mover.lift + bob,
        position.z + normal.z * offset,
      );
      mover.mesh.rotation.y = Math.atan2(tangent.x * mover.direction, tangent.z * mover.direction);
    }
  });

  return { rebuild, count: () => carCount, pedestrians: () => walkerCount };
}
