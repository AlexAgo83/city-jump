import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import type { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math";

import type { Vec3 } from "../sim/vec";

const KAIJU_ASSET_VERSION = "2026-08-31-01";

export function createKaijuRenderer(scene: Scene, shadows: ShadowGenerator) {
  const root = new TransformNode("kaiju", scene);
  root.setEnabled(false);
  const parts = new Map<string, Mesh>();

  void SceneLoader.ImportMeshAsync("", "/", `kaiju.glb?v=${KAIJU_ASSET_VERSION}`, scene).then((result) => {
    for (const mesh of result.meshes) {
      if (!(mesh instanceof Mesh) || mesh.getTotalVertices() === 0) continue;
      mesh.setParent(root);
      mesh.isPickable = false;
      mesh.receiveShadows = true;
      shadows.addShadowCaster(mesh);
      parts.set(mesh.name, mesh);
    }
  });

  return {
    show(position: Vec3, heading: number, seconds: number): void {
      root.position.set(position.x, position.y, position.z);
      root.rotationQuaternion = Quaternion.FromEulerAngles(0, heading, 0);
      root.setEnabled(true);
      const stride = Math.sin(seconds * 5) * 0.28;
      swing(parts.get("kaiju_left_leg"), stride);
      swing(parts.get("kaiju_right_leg"), -stride);
      swing(parts.get("kaiju_left_arm"), -stride * 0.7);
      swing(parts.get("kaiju_right_arm"), stride * 0.7);
      swing(parts.get("kaiju_tail"), Math.sin(seconds * 3) * 0.18, "y");
    },
    hide(): void {
      root.setEnabled(false);
    },
    visible(): boolean {
      return root.isEnabled();
    },
  };
}

function swing(mesh: Mesh | undefined, angle: number, axis: "x" | "y" = "x"): void {
  if (!mesh) return;
  mesh.rotationQuaternion = Quaternion.RotationAxis(axis === "x" ? Vector3.Right() : Vector3.Up(), angle);
}

