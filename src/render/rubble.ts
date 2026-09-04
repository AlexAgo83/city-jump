import type { Scene } from "@babylonjs/core/scene";
import { Matrix, Quaternion, Vector3, Color3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

import type { SavedRubble } from "../sim/rubble";

export function createRubbleRenderer(scene: Scene, heightAt: (x: number, z: number) => number) {
  const mesh = MeshBuilder.CreateBox("rubble", { size: 1 }, scene);
  const material = new StandardMaterial("rubble", scene);
  material.diffuseColor = new Color3(0.24, 0.22, 0.2);
  material.specularColor = Color3.Black();
  mesh.material = material;
  mesh.isPickable = false;
  mesh.setEnabled(false);

  return {
    rebuild(rubble: readonly SavedRubble[]): void {
      const matrices = new Float32Array(rubble.length * 16);
      for (const [[x, z], i] of rubble.map((point, index) => [point, index] as const)) {
        Matrix.Compose(new Vector3(5.5, 1.4, 5.5), Quaternion.Identity(), new Vector3(x, heightAt(x, z) + 0.7, z)).copyToArray(matrices, i * 16);
      }
      mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
      mesh.thinInstanceCount = rubble.length;
      mesh.setEnabled(rubble.length > 0);
    },
    dispose(): void {
      mesh.dispose();
      material.dispose();
    },
  };
}
