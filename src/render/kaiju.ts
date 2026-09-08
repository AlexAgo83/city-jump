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
  const casters: Mesh[] = [];
  let disposed = false;

  void SceneLoader.ImportMeshAsync("", "/", `kaiju.glb?v=${ASSET_VERSION}`, scene).then((result) => {
    if (disposed) {
      result.meshes[0]?.dispose(false, true);
      return;
    }
    // Keep glTF's coordinate conversion and multi-material limb groups intact.
    const importedRoot = result.meshes[0];
    if (importedRoot) importedRoot.parent = root;
    for (const node of [...result.transformNodes, ...result.meshes]) parts.set(node.name, node);
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
      root.position.set(position.x, position.y, position.z);
      if (mode === "walking" || mode === "running" || !root.rotationQuaternion) root.rotationQuaternion = Quaternion.FromEulerAngles(0, heading, 0);
      root.metadata = { mode };
      root.setEnabled(true);
      const stride = mode === "running" ? Math.sin(seconds * 5.6) * 0.32 : mode === "walking" ? Math.sin(seconds * 2.8) * 0.16 : 0;
      const breath = Math.sin(seconds * 1.4);
      const attack = mode === "attacking" ? Math.sin(Math.PI * Math.min(1, Math.max(0, attackSeconds / KAIJU_ATTACK_SECONDS))) : 0;
      const arms = mode === "attacking" ? -attack * 1.3 : mode === "idle" ? breath * 0.025 : 0;
      swing(parts.get("kaiju_left_leg"), stride);
      swing(parts.get("kaiju_right_leg"), -stride);
      swing(parts.get("kaiju_left_arm"), arms - stride * 0.7);
      swing(parts.get("kaiju_right_arm"), arms + stride * 0.7);
      swing(parts.get("kaiju_tail"), breath * (mode === "walking" ? 0.12 : 0.045), "y");
      swing(parts.get("kaiju_head"), attack * 0.18 + breath * 0.015);
      swing(parts.get("kaiju_jaw"), attack * 0.25 + (breath + 1) * 0.02);
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
