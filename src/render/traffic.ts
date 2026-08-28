import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math";

import type { RoadGraph } from "../sim/graph";
import { roadType } from "../sim/roadTypes";
import { normalizeXZ, perpXZ } from "../sim/vec";
import { ROAD_LIFT } from "./roadMesh";

const COLORS = [
  new Color3(0.86, 0.18, 0.14),
  new Color3(0.12, 0.38, 0.82),
  new Color3(0.93, 0.82, 0.18),
  new Color3(0.9, 0.92, 0.88),
];

interface Car {
  readonly mesh: Mesh;
  readonly segmentId: number;
  readonly direction: 1 | -1;
}

export function createTrafficRenderer(scene: Scene, graph: RoadGraph) {
  const material = COLORS.map((color, i) => {
    const m = new StandardMaterial(`car_${i}`, scene);
    m.diffuseColor = color;
    m.specularColor = Color3.Black();
    return m;
  });
  let cars: Car[] = [];

  function rebuild(): void {
    for (const car of cars) car.mesh.dispose();
    cars = [];
    for (const [si, seg] of graph.allSegments().entries()) {
      const count = Math.min(4, Math.max(1, Math.floor(seg.length / 80)));
      for (let i = 0; i < count; i++) {
        const car = MeshBuilder.CreateBox(`traffic_${seg.id}_${i}`, { width: 3, height: 1.2, depth: 6 }, scene);
        car.material = material[(si + i) % material.length]!;
        car.isPickable = false;
        cars.push({ mesh: car, segmentId: seg.id, direction: i % 2 ? -1 : 1 });
      }
    }
  }

  scene.registerBeforeRender(() => {
    for (const [i, car] of cars.entries()) {
      const seg = graph.allSegments().find((candidate) => candidate.id === car.segmentId);
      if (!seg) {
        car.mesh.setEnabled(false);
        continue;
      }
      car.mesh.setEnabled(true);
      const d = ((performance.now() / 1000) * 12 + i * 35) % seg.length;
      const { position, tangent } = graph.pointAt(seg.id, car.direction === 1 ? d : seg.length - d);
      const n = perpXZ(normalizeXZ(tangent));
      const offset = Math.max(1.8, roadType(seg.type).width * 0.22) * -car.direction;
      car.mesh.position.set(position.x + n.x * offset, position.y + ROAD_LIFT + 0.75, position.z + n.z * offset);
      car.mesh.rotation.y = Math.atan2(tangent.x * car.direction, tangent.z * car.direction);
    }
  });

  return { rebuild, count: () => cars.length };
}
