import "@babylonjs/core/Meshes/thinInstanceMesh";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
import { Color3, Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

import type { SavedRubble } from "../sim/rubble";
import type { Vec3 } from "../sim/vec";

const EXPLOSION_SECONDS = 3.2;

class SmokeEdges extends MaterialPluginBase {
  constructor(material: StandardMaterial) { super(material, "smokeEdges", 200, {}, true, true); }
  override getCustomCode(shader: string): Record<string, string> | null {
    return shader === "fragment" ? { CUSTOM_FRAGMENT_BEFORE_FOG: "color.a *= pow(abs(dot(viewDirectionW, normalW)), 2.0);" } : null;
  }
}

/** Soft edges on a tiny instanced volume, shared by rubble smoke and footstep dust. */
export function createSmokeMesh(scene: Scene, name: string, color = new Color3(0.34, 0.32, 0.3), segments = 6) {
  const mesh = MeshBuilder.CreateSphere(name, { diameter: 1, segments }, scene);
  const material = new StandardMaterial(`${name}_material`, scene);
  material.diffuseColor = color;
  material.emissiveColor = color.scale(0.25);
  material.specularColor = Color3.Black();
  material.alpha = 0.5;
  new SmokeEdges(material);
  material.disableDepthWrite = true;
  mesh.material = material;
  mesh.hasVertexAlpha = true;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return mesh;
}

class FlameColor extends MaterialPluginBase {
  constructor(material: StandardMaterial) { super(material, "flameColor", 210, {}, true, true); }
  override getCustomCode(shader: string): Record<string, string> {
    return shader === "vertex" ? {
      CUSTOM_VERTEX_DEFINITIONS: "varying float vFlameHeight;",
      CUSTOM_VERTEX_UPDATE_POSITION: "vFlameHeight = position.y + 0.5; positionUpdated.xz *= 1.0 - vFlameHeight * 0.65;",
    } : {
      CUSTOM_FRAGMENT_DEFINITIONS: "varying float vFlameHeight;",
      CUSTOM_FRAGMENT_BEFORE_FOG: `
        float core = pow(abs(dot(viewDirectionW, normalW)), 2.0) * (1.0 - smoothstep(0.35, 0.85, vFlameHeight));
        color.rgb = mix(vec3(1.4, 0.18, 0.015), vec3(2.2, 1.65, 0.45), core);
        color.a *= 1.0 - smoothstep(0.65, 1.0, vFlameHeight);
      `,
    };
  }
}

export function createDestructionEffects(scene: Scene, heightAt: (x: number, z: number) => number) {
  const smoke = createSmokeMesh(scene, "rubble_smoke");
  (smoke.material as StandardMaterial).alpha = 0.85;
  const fire = createSmokeMesh(scene, "roofprop_rubble_fire");
  const fireMaterial = fire.material as StandardMaterial;
  fireMaterial.disableLighting = true;
  fireMaterial.alpha = 0.9;
  new FlameColor(fireMaterial);

  // Impacts and their dust stay visible beyond the roof-detail culling distance.
  const explosion = createSmokeMesh(scene, "rubble_explosion", Color3.White(), 12);
  const explosionMaterial = explosion.material as StandardMaterial;
  explosionMaterial.disableLighting = true;
  explosionMaterial.emissiveColor = Color3.White();
  explosionMaterial.alpha = 0.95;
  const blast = createSmokeMesh(scene, "rubble_blast", Color3.White());
  (blast.material as StandardMaterial).alpha = 0.85;
  const glow = new PointLight("destruction_glow", Vector3.Zero(), scene);
  glow.diffuse = new Color3(1, 0.32, 0.055);
  glow.specular = Color3.Black();
  glow.range = 90;
  glow.intensity = 0;
  glow.setEnabled(false);

  let fires: readonly SavedRubble[] = [];
  let explosions: { readonly position: Vec3; readonly startedAt: number }[] = [];
  let fireEnabled = true;
  let explosionEnabled = true;

  function writeFireMatrices(now: number): void {
    const matrices = new Float32Array(fires.length * 5 * 16);
    for (const [i, [x, z]] of fires.entries()) {
      for (let tongue = 0; tongue < 5; tongue++) {
        const phase = now * (4.5 + tongue * 0.7) + x * 0.13 + z * 0.17 + tongue * 2.4;
        const height = 10 + tongue * 1.7 + Math.sin(phase) * 3;
        const angle = tongue * 2.4;
        Matrix.Compose(new Vector3(5 + Math.cos(phase), height, 5),
          Quaternion.FromEulerAngles(Math.sin(phase * 0.7) * 0.12, angle, Math.cos(phase) * 0.16),
          new Vector3(x + Math.cos(angle) * 2.2, heightAt(x, z) + height * 0.43 + 1, z + Math.sin(angle) * 2.2))
          .copyToArray(matrices, (i * 5 + tongue) * 16);
      }
    }
    fire.thinInstanceSetBuffer("matrix", matrices, 16, false);
    fire.thinInstanceCount = fires.length * 5;
    writeSmokeMatrices(now);
  }

  function writeSmokeMatrices(now: number): void {
    // ponytail: first 64 fires smoke; spatial selection if larger disasters need it.
    const count = Math.min(fires.length, 64) * 3;
    const smokeMatrices = new Float32Array(count * 16);
    const colors = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const [x, z] = fires[Math.floor(i / 3)]!;
      const age = ((now * 0.18 + i * 0.37) % 1 + 1) % 1;
      const size = 12 + age * 36;
      Matrix.Compose(new Vector3(size, size * 1.3, size), Quaternion.Identity(), new Vector3(x + age * 9, heightAt(x, z) + 10 + age * 95, z + age * 4)).copyToArray(smokeMatrices, i * 16);
      colors.set([1, 1, 1, Math.sin(age * Math.PI) * 0.85], i * 4);
    }
    smoke.thinInstanceSetBuffer("matrix", smokeMatrices, 16, false);
    smoke.thinInstanceSetBuffer("color", colors, 4, false);
    smoke.thinInstanceCount = count;
    smoke.setEnabled(count > 0);
  }

  /** What the thin-instance buffer currently holds, so an empty one is not written twice. */
  let explosionInstances = 0;

  function writeExplosionMatrices(now: number): void {
    explosions = explosions.filter((item) => now - item.startedAt <= EXPLOSION_SECONDS);
    if (explosions.length === 0 && explosionInstances === 0) return;
    const matrices = new Float32Array(explosions.length * 16);
    const colors = new Float32Array(explosions.length * 4);
    const blastMatrices = new Float32Array(explosions.length * 15 * 16);
    const blastColors = new Float32Array(explosions.length * 15 * 4);
    for (const [i, item] of explosions.entries()) {
      const age = Math.max(0, now - item.startedAt);
      const size = 8 + 38 * (1 - Math.exp(-age * 7));
      const flash = Math.max(0, 1 - age / 0.14);
      const { x, z } = item.position;
      const y = heightAt(x, z);
      Matrix.Compose(new Vector3(size, size * 0.85, size), Quaternion.Identity(), new Vector3(x, y + 8 + age * 12, z)).copyToArray(matrices, i * 16);
      colors.set([1.8 + flash * 2, 0.38 + flash * 2.6, 0.04 + flash * 1.5, Math.max(0, 1 - age / 0.9)], i * 4);
      for (let puff = 0; puff < 15; puff++) {
        const ring = puff < 12;
        const angle = puff * Math.PI / 6;
        const radius = 5 + age * 23;
        const diameter = ring ? 6 + age * 10 : 10 + age * 13;
        const px = x + (ring ? Math.cos(angle) * radius : (puff - 13) * 7 + age * 4);
        const pz = z + (ring ? Math.sin(angle) * radius : age * 3);
        const py = ring ? heightAt(px, pz) + 2 + age * 2 : y + 12 + age * 27 + (puff - 12) * 9;
        Matrix.Compose(new Vector3(diameter, diameter * (ring ? 0.35 : 1.3), diameter), Quaternion.Identity(), new Vector3(px, py, pz)).copyToArray(blastMatrices, (i * 15 + puff) * 16);
        const opacity = Math.min(1, age * 8) * Math.max(0, 1 - age / (ring ? 1.8 : EXPLOSION_SECONDS));
        blastColors.set(ring ? [0.62, 0.52, 0.39, opacity] : [0.26, 0.25, 0.24, opacity], (i * 15 + puff) * 4);
      }
    }
    explosion.thinInstanceSetBuffer("matrix", matrices, 16, false);
    if (explosions.length) explosion.thinInstanceSetBuffer("color", colors, 4, false);
    explosion.thinInstanceCount = explosions.length;
    explosionInstances = explosions.length;
    explosion.setEnabled(explosions.length > 0);
    blast.thinInstanceSetBuffer("matrix", blastMatrices, 16, false);
    if (explosions.length) blast.thinInstanceSetBuffer("color", blastColors, 4, false);
    blast.thinInstanceCount = explosions.length * 15;
    blast.setEnabled(explosions.length > 0);
  }

  function updateGlow(now: number): void {
    const impact = explosionEnabled ? explosions.at(-1) : undefined;
    const age = impact ? Math.max(0, now - impact.startedAt) : Infinity;
    // ponytail: one light follows the latest impact or nearest fire; cluster if simultaneous lighting matters.
    let point: readonly [number, number] | undefined;
    if (age < 0.9 && impact) point = [impact.position.x, impact.position.z];
    else if (fireEnabled) {
      const camera = scene.activeCamera?.globalPosition ?? Vector3.Zero();
      let nearest = Infinity;
      for (const fire of fires) {
        const distance = (fire[0] - camera.x) ** 2 + (fire[1] - camera.z) ** 2;
        if (distance < nearest) { nearest = distance; point = [fire[0], fire[1]]; }
      }
    }
    if (point) {
      glow.position.set(point[0], heightAt(point[0], point[1]) + 12, point[1]);
      glow.intensity = age < 0.9 ? 12 * (1 - age / 0.9) ** 2 : 1.5 + 0.25 * Math.sin(now * 9) + 0.15 * Math.sin(now * 13);
    } else glow.intensity = 0;
    glow.setEnabled(Boolean(point));
  }

  return {
    setEnabled(next: { readonly fire: boolean; readonly explosion: boolean }, now = 0): void {
      fireEnabled = next.fire;
      explosionEnabled = next.explosion;
      if (fireEnabled) {
        writeFireMatrices(now);
        fire.setEnabled(fires.length > 0);
      }
      else {
        fire.thinInstanceCount = 0;
        fire.setEnabled(false);
        smoke.thinInstanceCount = 0;
        smoke.setEnabled(false);
      }
      if (explosionEnabled) writeExplosionMatrices(now);
      else {
        explosions = [];
        explosion.thinInstanceCount = 0;
        explosionInstances = 0;
        explosion.setEnabled(false);
        blast.thinInstanceCount = 0;
        blast.setEnabled(false);
      }
      updateGlow(now);
    },
    rebuildFires(rubble: readonly SavedRubble[], now = 0): void {
      fires = rubble;
      if (!fireEnabled) return;
      writeFireMatrices(now);
      fire.setEnabled(fires.length > 0);
      updateGlow(now);
    },
    explode(position: Vec3, now: number): void {
      if (!explosionEnabled) return;
      explosions = [...explosions, { position, startedAt: now }];
      writeExplosionMatrices(now);
      updateGlow(now);
    },
    step(now: number): void {
      if (fireEnabled && fire.isEnabled()) writeFireMatrices(now);
      else if (fireEnabled && fires.length > 0) writeSmokeMatrices(now);
      if (explosionEnabled) writeExplosionMatrices(now);
      updateGlow(now);
    },
    dispose(): void {
      glow.dispose();
      blast.material?.dispose();
      blast.dispose();
      smoke.material?.dispose();
      smoke.dispose();
      fire.dispose();
      fireMaterial.dispose();
      explosion.dispose();
      explosionMaterial.dispose();
    },
  };
}
