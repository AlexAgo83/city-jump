import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import type { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math";

import { KAIJU_ATTACK_SECONDS, type KaijuAssaultState } from "../sim/kaiju";
import type { Vec3 } from "../sim/vec";
import { ASSET_VERSION } from "./assets";

export function createKaijuRenderer(scene: Scene, shadows: ShadowGenerator) {
  const root = new TransformNode("kaiju", scene);
  root.setEnabled(false);
  const parts = new Map<string, TransformNode>();
  let torso: TransformNode | null = null;
  const casters: Mesh[] = [];
  let disposed = false;
  let previousAttack = 0;
  let recoveryAt = -Infinity;

  void SceneLoader.ImportMeshAsync("", "/", `kaiju.glb?v=${ASSET_VERSION}`, scene).then((result) => {
    if (disposed) {
      result.meshes[0]?.dispose(false, true);
      return;
    }
    // Keep glTF's coordinate conversion and multi-material limb groups intact.
    const importedRoot = result.meshes[0];
    if (importedRoot) importedRoot.parent = root;
    for (const node of [...result.transformNodes, ...result.meshes]) parts.set(node.name, node);
    if (importedRoot) {
      // Lean from the hips, keeping the legs on their existing stride pivots.
      torso = new TransformNode("kaiju_torso", scene);
      torso.parent = importedRoot;
      const hip = parts.get("kaiju_left_leg")?.position;
      torso.position.set(0, hip?.y ?? 36.6, hip?.z ?? -2.15);
      for (const name of ["body", "head", "jaw", "left_arm", "right_arm", "tail"]) {
        const part = parts.get(`kaiju_${name}`);
        if (!part) continue;
        part.parent = torso;
        part.position.subtractInPlace(torso.position);
      }
    }
    for (const mesh of result.meshes) {
      if (!(mesh instanceof Mesh) || mesh.getTotalVertices() === 0) continue;
      mesh.isPickable = false;
      mesh.receiveShadows = true;
      shadows.addShadowCaster(mesh);
      casters.push(mesh);
    }
  });

  return {
    show(position: Vec3, heading: number, seconds: number, mode: KaijuAssaultState["mode"] = "walking", attackSeconds = 0): void {
      if (mode !== "attacking" && previousAttack >= KAIJU_ATTACK_SECONDS * 0.84) recoveryAt = seconds;
      previousAttack = mode === "attacking" ? attackSeconds : 0;
      const recovery = Math.max(0, 1 - Math.max(0, seconds - recoveryAt) / 0.65) ** 2;
      root.position.set(position.x, position.y, position.z);
      if (((mode === "walking" || mode === "running") && recovery === 0) || !root.rotationQuaternion) root.rotationQuaternion = Quaternion.FromEulerAngles(0, heading, 0);
      root.metadata = { mode };
      root.setEnabled(true);
      const stride = mode === "running" ? Math.sin(seconds * 5.6) * 0.32 : mode === "walking" ? Math.sin(seconds * 2.8) * 0.16 : 0;
      // Raise both arms, hold the weight back, then slam at the simulation's five-second impact.
      // Its next state is already walking/idle: keep the impact pose and recoil for 0.65 s.
      const phase = Math.min(1, Math.max(0, attackSeconds / KAIJU_ATTACK_SECONDS));
      const windup = mode === "attacking" ? Math.sin(Math.min(1, phase / 0.55) * Math.PI / 2) : recovery;
      const slam = mode === "attacking" ? Math.max(0, (phase - 0.84) / 0.16) ** 3 : recovery;
      const runLean = mode === "running" ? (0.32 + Math.sin(seconds * 11.2) * 0.035) * (1 - recovery) : 0;
      const lean = runLean - windup * 0.2 + slam * 0.85;
      if (torso) torso.rotationQuaternion = Quaternion.FromEulerAngles(lean, (windup - slam) * 0.12, 0);
      const breath = Math.sin(seconds * 1.4);
      const arms = -windup * 2.6 + slam * 2.25 + (mode === "idle" ? breath * 0.025 * (1 - recovery) : 0);
      swing(parts.get("kaiju_left_leg"), stride);
      swing(parts.get("kaiju_right_leg"), -stride);
      swing(parts.get("kaiju_left_arm"), arms - stride * 0.7);
      swing(parts.get("kaiju_right_arm"), arms + stride * 0.7);
      swing(parts.get("kaiju_tail"), breath * (mode === "walking" ? 0.12 : 0.045), "y");
      swing(parts.get("kaiju_head"), -windup * 0.12 + slam * 0.2 + breath * 0.015 - lean * 0.4);
      swing(parts.get("kaiju_jaw"), windup * 0.45 - slam * 0.3 + (breath + 1) * 0.02);
    },
    impactPoint(seed: number): Vector3 {
      const index = Math.abs(Math.floor(seed));
      const mesh = casters[index % casters.length];
      const positions = mesh?.getVerticesData("position");
      if (!mesh || !positions?.length) return root.position.add(new Vector3(0, 55, 0));
      const vertex = (Math.floor(index / casters.length) % (positions.length / 3)) * 3;
      return Vector3.TransformCoordinates(Vector3.FromArray(positions, vertex), mesh.computeWorldMatrix(true));
    },
    hide(): void {
      previousAttack = 0;
      recoveryAt = -Infinity;
      root.setEnabled(false);
    },
    visible(): boolean {
      return root.isEnabled();
    },
    dispose(): void {
      disposed = true;
      for (const mesh of casters) shadows.removeShadowCaster(mesh);
      casters.length = 0;
      parts.clear();
      root.dispose(false, true);
    },
  };
}

function swing(mesh: TransformNode | undefined, angle: number, axis: "x" | "y" = "x"): void {
  if (!mesh) return;
  mesh.rotationQuaternion = Quaternion.RotationAxis(axis === "x" ? Vector3.Right() : Vector3.Up(), angle);
}
