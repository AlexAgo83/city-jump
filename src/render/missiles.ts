import type { Scene } from "@babylonjs/core/scene";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";

import type { Vec3 } from "../sim/vec";

export interface MissileTrail {
  readonly from: Vec3;
  readonly to: Vec3;
}

export function createMissileRenderer(scene: Scene) {
  let mesh: LinesMesh | null = null;
  return {
    rebuild(missiles: readonly MissileTrail[]): void {
      mesh?.dispose();
      mesh = missiles.length
        ? MeshBuilder.CreateLineSystem(
            "missiles",
            { lines: missiles.map((m) => [new Vector3(m.from.x, m.from.y + 8, m.from.z), new Vector3(m.to.x, m.to.y + 30, m.to.z)]) },
            scene,
          )
        : null;
      if (!mesh) return;
      mesh.color = new Color3(1, 0.82, 0.35);
      mesh.isPickable = false;
    },
  };
}

