import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

import type { SavedRubble } from "../sim/rubble";
import type { Vec3 } from "../sim/vec";

const EXPLOSION_SECONDS = 1.1;

export function createDestructionEffects(scene: Scene, heightAt: (x: number, z: number) => number) {
  const fire = MeshBuilder.CreateCylinder("roofprop_rubble_fire", { diameterTop: 1, diameterBottom: 5, height: 12, tessellation: 6 }, scene);
  const fireMaterial = new StandardMaterial("rubble-fire", scene);
  fireMaterial.diffuseColor = new Color3(1, 0.32, 0.04);
  fireMaterial.emissiveColor = new Color3(0.95, 0.22, 0.03);
  fireMaterial.specularColor = Color3.Black();
  fire.material = fireMaterial;
  fire.isPickable = false;
  fire.setEnabled(false);

  const explosion = MeshBuilder.CreateSphere("roofprop_rubble_explosion", { diameter: 1, segments: 8 }, scene);
  const explosionMaterial = new StandardMaterial("rubble-explosion", scene);
  explosionMaterial.diffuseColor = new Color3(1, 0.7, 0.12);
  explosionMaterial.emissiveColor = new Color3(1, 0.42, 0.06);
  explosionMaterial.specularColor = Color3.Black();
  explosion.material = explosionMaterial;
  explosion.isPickable = false;
  explosion.setEnabled(false);

  let fires: readonly SavedRubble[] = [];
  let explosions: { readonly position: Vec3; readonly startedAt: number }[] = [];

  function writeFireMatrices(now: number): void {
    const matrices = new Float32Array(fires.length * 16);
    for (const [[x, z], i] of fires.map((point, index) => [point, index] as const)) {
      const flicker = 0.85 + 0.18 * Math.sin(now * 9 + i);
      Matrix.Compose(new Vector3(1.2 * flicker, flicker, 1.2 * flicker), Quaternion.Identity(), new Vector3(x, heightAt(x, z) + 6.2, z)).copyToArray(matrices, i * 16);
    }
    fire.thinInstanceSetBuffer("matrix", matrices, 16, false);
    fire.thinInstanceCount = fires.length;
  }

  function writeExplosionMatrices(now: number, enable: boolean): void {
    const active = explosions.filter((item) => now - item.startedAt <= EXPLOSION_SECONDS);
    explosions = active;
    const matrices = new Float32Array(active.length * 16);
    for (const [item, i] of active.map((point, index) => [point, index] as const)) {
      const age = Math.max(0, now - item.startedAt) / EXPLOSION_SECONDS;
      const size = 8 + age * 26;
      Matrix.Compose(new Vector3(size, size * 0.65, size), Quaternion.Identity(), new Vector3(item.position.x, heightAt(item.position.x, item.position.z) + size * 0.2, item.position.z)).copyToArray(matrices, i * 16);
    }
    explosion.thinInstanceSetBuffer("matrix", matrices, 16, false);
    explosion.thinInstanceCount = active.length;
    if (enable || active.length === 0) explosion.setEnabled(active.length > 0);
  }

  return {
    rebuildFires(rubble: readonly SavedRubble[], now = 0): void {
      fires = rubble;
      writeFireMatrices(now);
      fire.setEnabled(fires.length > 0);
    },
    explode(position: Vec3, now: number): void {
      explosions = [...explosions, { position, startedAt: now }];
      writeExplosionMatrices(now, true);
    },
    step(now: number): void {
      if (fire.isEnabled()) writeFireMatrices(now);
      writeExplosionMatrices(now, explosion.isEnabled());
    },
    dispose(): void {
      fire.dispose();
      fireMaterial.dispose();
      explosion.dispose();
      explosionMaterial.dispose();
    },
  };
}
