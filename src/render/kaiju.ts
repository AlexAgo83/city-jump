import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import type { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math";

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
    show(position: Vec3, heading: number, seconds: number): void {
      root.position.set(position.x, position.y, position.z);
      root.rotationQuaternion = Quaternion.FromEulerAngles(0, heading, 0);
      root.setEnabled(true);
      const stride = Math.sin(seconds * 2.8) * 0.16;
      swing(parts.get("kaiju_left_leg"), stride);
      swing(parts.get("kaiju_right_leg"), -stride);
      swing(parts.get("kaiju_left_arm"), -stride * 0.7);
      swing(parts.get("kaiju_right_arm"), stride * 0.7);
      swing(parts.get("kaiju_tail"), Math.sin(seconds * 1.4) * 0.12, "y");
      swing(parts.get("kaiju_jaw"), (Math.sin(seconds * 1.7) + 1) * 0.045);
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
