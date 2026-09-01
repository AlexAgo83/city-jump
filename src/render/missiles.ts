import type { Scene } from "@babylonjs/core/scene";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

import type { Vec3 } from "../sim/vec";

export interface MissileTrail {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly progress: number;
  readonly impact?: boolean;
}

export function createMissileRenderer(scene: Scene) {
  const missileMaterial = new StandardMaterial("missile-body", scene);
  missileMaterial.diffuseColor = new Color3(1, 0.86, 0.35);
  missileMaterial.emissiveColor = new Color3(0.9, 0.45, 0.08);
  const impactMaterial = new StandardMaterial("missile-impact", scene);
  impactMaterial.diffuseColor = new Color3(1, 0.45, 0.08);
  impactMaterial.emissiveColor = new Color3(1, 0.25, 0.04);
  const pool: { body: Mesh; trail: LinesMesh }[] = [];
  return {
    rebuild(missiles: readonly MissileTrail[]): void {
      while (pool.length < missiles.length) pool.push(createMissile(pool.length));
      while (pool.length > missiles.length) {
        const item = pool.pop()!;
        item.body.dispose();
        item.trail.dispose();
      }
      missiles.forEach((missile, index) => {
        const item = pool[index]!;
        const progress = Math.max(0, Math.min(1, missile.progress));
        const position = missilePoint(missile.from, missile.to, progress);
        const tail = missilePoint(missile.from, missile.to, Math.max(0, progress - 0.18));
        item.body.position.copyFrom(position);
        const size = missile.impact ? 5 : 1;
        item.body.scaling.set(size, size, size);
        item.body.material = missile.impact ? impactMaterial : missileMaterial;
        item.body.setEnabled(true);
        item.trail = MeshBuilder.CreateLines("missile-trail", { points: [tail, position], instance: item.trail });
        item.trail.color = missile.impact ? new Color3(1, 0.35, 0.08) : new Color3(1, 0.82, 0.35);
        item.trail.setEnabled(!missile.impact);
      });
    },
  };

  function createMissile(index: number): { body: Mesh; trail: LinesMesh } {
    const body = MeshBuilder.CreateSphere(`missile-${index}`, { diameter: 3, segments: 8 }, scene);
    body.material = missileMaterial;
    body.isPickable = false;
    const trail = MeshBuilder.CreateLines("missile-trail", { points: [Vector3.Zero(), Vector3.Zero()], updatable: true }, scene);
    trail.isPickable = false;
    return { body, trail };
  }
}

export function missilePoint(from: Vec3, to: Vec3, progress: number): Vector3 {
  const p = Math.max(0, Math.min(1, progress));
  const x = from.x + (to.x - from.x) * p;
  const z = from.z + (to.z - from.z) * p;
  const y = from.y + 8 + (to.y + 26 - from.y) * p + Math.sin(Math.PI * p) * 55;
  return new Vector3(x, y, z);
}
