import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math";

import type { RoadGraph } from "../sim/graph";
import { roadType } from "../sim/roadTypes";
import { normalizeXZ, perpXZ } from "../sim/vec";
import { ROAD_LIFT } from "./roadMesh";

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

const CAR_SPEED = 12;
/** Metres per second on foot. A car covers a block while a walker crosses it. */
const WALKER_SPEED = 1.4;

/** Anything moving along a segment. Cars and walkers differ only in these numbers. */
interface Mover {
  readonly mesh: Mesh | InstancedMesh;
  readonly segmentId: number;
  readonly direction: 1 | -1;
  readonly speed: number;
  readonly lift: number;
  /** Non-zero only for walkers, which bob as they go. */
  readonly stride: number;
  readonly phase: number;
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

      if (type.pedestrian) {
        // People pack in tighter than cars, and a short path still deserves a couple.
        const count = Math.min(8, Math.max(2, Math.floor(seg.length / 22)));
        for (let i = 0; i < count; i++) {
          const walker = walkerPrototypes[(si + i) % walkerPrototypes.length]!.createInstance(
            `pedestrian_${seg.id}_${i}`,
          );
          walker.isPickable = false;
          movers.push({
            mesh: walker,
            segmentId: seg.id,
            direction: i % 2 ? -1 : 1,
            // Vary the pace a little, or a path reads as a conveyor belt.
            speed: WALKER_SPEED * (0.75 + ((si + i * 7) % 5) * 0.12),
            lift: 0.58,
            stride: 0.05,
            phase: ((si * 13 + i * 29) % 100) / 100 * Math.PI * 2,
          });
          walkerCount++;
        }
        continue;
      }

      const count = Math.min(4, Math.max(1, Math.floor(seg.length / 80)));
      for (let i = 0; i < count; i++) {
        const car = MeshBuilder.CreateBox(`traffic_${seg.id}_${i}`, { width: 3, height: 1.2, depth: 6 }, scene);
        car.material = carMaterials[(si + i) % carMaterials.length]!;
        car.isPickable = false;
        movers.push({
          mesh: car,
          segmentId: seg.id,
          direction: i % 2 ? -1 : 1,
          speed: CAR_SPEED,
          lift: 0.75,
          stride: 0,
          phase: i * 35,
        });
        carCount++;
      }
    }
  }

  scene.registerBeforeRender(() => {
    const now = performance.now() / 1000;
    for (const mover of movers) {
      const seg = graph.allSegments().find((candidate) => candidate.id === mover.segmentId);
      if (!seg) {
        mover.mesh.setEnabled(false);
        continue;
      }
      mover.mesh.setEnabled(true);
      const travelled = (now * mover.speed + mover.phase * 6) % seg.length;
      const { position, tangent } = graph.pointAt(
        seg.id,
        mover.direction === 1 ? travelled : seg.length - travelled,
      );
      const normal = perpXZ(normalizeXZ(tangent));
      const width = roadType(seg.type).width;
      const offset = Math.max(mover.stride > 0 ? 0.7 : 1.8, width * 0.22) * -mover.direction;
      const bob = mover.stride === 0 ? 0 : Math.abs(Math.sin(now * 5 + mover.phase)) * mover.stride;
      mover.mesh.position.set(
        position.x + normal.x * offset,
        position.y + ROAD_LIFT + mover.lift + bob,
        position.z + normal.z * offset,
      );
      mover.mesh.rotation.y = Math.atan2(tangent.x * mover.direction, tangent.z * mover.direction);
    }
  });

  return { rebuild, count: () => carCount, pedestrians: () => walkerCount };
}
