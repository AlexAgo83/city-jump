import type { Scene } from "@babylonjs/core/scene";
import { Color3, Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
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
  missileMaterial.diffuseColor = new Color3(0.78, 0.8, 0.75);
  missileMaterial.specularColor = new Color3(0.35, 0.35, 0.35);
  const trimMaterial = new StandardMaterial("missile-trim", scene);
  trimMaterial.diffuseColor = new Color3(0.15, 0.19, 0.18);
  const bandMaterial = new StandardMaterial("missile-band", scene);
  bandMaterial.diffuseColor = new Color3(0.85, 0.48, 0.08);
  const flameMaterial = new StandardMaterial("missile-exhaust", scene);
  flameMaterial.emissiveColor = new Color3(1, 0.52, 0.08);
  flameMaterial.disableLighting = true;
  const impactMaterial = new StandardMaterial("missile-impact", scene);
  impactMaterial.diffuseColor = new Color3(1, 0.45, 0.08);
  impactMaterial.emissiveColor = new Color3(1, 0.25, 0.04);
  const template = missileModel(scene, missileMaterial, trimMaterial, bandMaterial);
  template.setEnabled(false);
  const pool: { body: Mesh; flame: Mesh; impact: Mesh; trail: LinesMesh }[] = [];
  return {
    rebuild(missiles: readonly MissileTrail[]): void {
      while (pool.length < missiles.length) pool.push(createMissile(pool.length));
      while (pool.length > missiles.length) {
        const item = pool.pop()!;
        item.body.dispose();
        item.impact.dispose();
        item.trail.material?.dispose();
        item.trail.dispose();
      }
      missiles.forEach((missile, index) => {
        const item = pool[index]!;
        const progress = Math.max(0, Math.min(1, missile.progress));
        const position = missilePoint(missile.from, missile.to, progress);
        item.body.position.copyFrom(position);
        const direction = missileDirection(missile.from, missile.to, progress);
        // The authored missile points along +Y; align its nose with the flight tangent.
        item.body.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction, item.body.rotationQuaternion ?? Quaternion.Identity());
        item.body.setEnabled(!missile.impact);
        item.flame.scaling.y = 0.85 + Math.sin(progress * 160) * 0.15;
        item.flame.position.y = -2.15 - 1.5 * item.flame.scaling.y;
        item.impact.position.copyFrom(position);
        item.impact.setEnabled(Boolean(missile.impact));
        const points = Array.from({ length: 9 }, (_, i) => missilePoint(missile.from, missile.to, Math.max(0, progress - (1 - i / 8) * 0.18)));
        item.trail = MeshBuilder.CreateLines("missile-trail", { points, instance: item.trail });
        item.trail.setEnabled(!missile.impact);
      });
    },
    dispose(): void {
      for (const item of pool) {
        item.body.dispose();
        item.impact.dispose();
        item.trail.material?.dispose();
        item.trail.dispose();
      }
      pool.length = 0;
      template.material?.dispose();
      template.dispose();
      missileMaterial.dispose();
      trimMaterial.dispose();
      bandMaterial.dispose();
      flameMaterial.dispose();
      impactMaterial.dispose();
    },
  };

  function createMissile(index: number) {
    const body = template.clone(`missile-${index}`, null, true);
    body.isPickable = false;
    const flame = MeshBuilder.CreateCylinder(`missile-exhaust-${index}`, { height: 3, diameterTop: 0.55, diameterBottom: 0, tessellation: 10 }, scene);
    flame.parent = body;
    flame.material = flameMaterial;
    flame.isPickable = false;
    const impact = MeshBuilder.CreateSphere(`missile-impact-${index}`, { diameter: 15, segments: 8 }, scene);
    impact.material = impactMaterial;
    impact.isPickable = false;
    impact.setEnabled(false);
    const trail = MeshBuilder.CreateLines("missile-trail", { points: Array.from({ length: 9 }, () => Vector3.Zero()), updatable: true }, scene);
    trail.color = new Color3(0.82, 0.85, 0.83);
    trail.alpha = 0.7;
    trail.isPickable = false;
    return { body, flame, impact, trail };
  }
}

function missileModel(scene: Scene, skin: StandardMaterial, trim: StandardMaterial, band: StandardMaterial): Mesh {
  const hull = MeshBuilder.CreateLathe("missile-hull", {
    shape: [new Vector3(0, -2.2, 0), new Vector3(0.3, -2.2, 0), new Vector3(0.38, -1.8, 0), new Vector3(0.38, 1.35, 0), new Vector3(0.29, 1.85, 0), new Vector3(0.13, 2.4, 0), new Vector3(0, 2.75, 0)],
    tessellation: 16,
  }, scene);
  hull.material = skin;
  const pieces = [hull];
  for (const y of [-1.75, 1.1]) {
    const collar = MeshBuilder.CreateCylinder("missile-band", { height: 0.16, diameter: 0.79, tessellation: 16 }, scene);
    collar.position.y = y;
    collar.material = band;
    pieces.push(collar);
  }
  const nozzle = MeshBuilder.CreateCylinder("missile-nozzle", { height: 0.3, diameterTop: 0.65, diameterBottom: 0.45, tessellation: 12 }, scene);
  nozzle.position.y = -2.15;
  nozzle.material = trim;
  pieces.push(nozzle);
  for (let i = 0; i < 4; i++) {
    const fin = new Mesh("missile-fin", scene);
    const data = new VertexData();
    data.positions = [-0.045, -1.95, 0.28, -0.045, -1.95, 1.2, -0.045, -1.35, 1.2, -0.045, -0.35, 0.28,
      0.045, -1.95, 0.28, 0.045, -1.95, 1.2, 0.045, -1.35, 1.2, 0.045, -0.35, 0.28];
    data.indices = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
    data.normals = [];
    data.uvs = Array(16).fill(0);
    VertexData.ComputeNormals(data.positions, data.indices, data.normals);
    data.applyToMesh(fin);
    fin.rotation.y = i * Math.PI / 2;
    fin.material = trim;
    pieces.push(fin);
  }
  const model = Mesh.MergeMeshes(pieces, true, true, undefined, false, true)!;
  model.name = "missile-template";
  model.isPickable = false;
  return model;
}

export function missileDirection(from: Vec3, to: Vec3, progress: number): Vector3 {
  const p = Math.max(0, Math.min(1, progress));
  const direction = new Vector3(to.x - from.x, to.y - from.y - 8 + Math.cos(Math.PI * p) * Math.PI * 55, to.z - from.z);
  return direction.lengthSquared() > 1e-12 ? direction.normalize() : Vector3.Up();
}

export function missilePoint(from: Vec3, to: Vec3, progress: number): Vector3 {
  const p = Math.max(0, Math.min(1, progress));
  const x = from.x + (to.x - from.x) * p;
  const z = from.z + (to.z - from.z) * p;
  const y = from.y + 8 + (to.y - from.y - 8) * p + Math.sin(Math.PI * p) * 55;
  return new Vector3(x, y, z);
}
