import type { Scene } from "@babylonjs/core/scene";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";

import type { KaijuPlan } from "../sim/kaiju";

const POINTS = Array.from({ length: 65 }, (_, i) => {
  const angle = (i / 64) * Math.PI * 2;
  return new Vector3(Math.cos(angle), 0, Math.sin(angle));
});

export function createWaveMarkerRenderer(scene: Scene, heightAt: (x: number, z: number) => number) {
  const edge = ring(scene, "wave-edge-marker", new Color3(1, 0.56, 0.32));
  const target = ring(scene, "wave-target-highlight", new Color3(1, 0.9, 0.35));

  return {
    show(plan: KaijuPlan): void {
      place(edge, plan.landing.x, plan.landing.z, 36);
      if (plan.target) place(target, plan.target.x, plan.target.z, 42);
      else target.setEnabled(false);
    },
    hide(): void {
      edge.setEnabled(false);
      target.setEnabled(false);
    },
  };

  function place(mesh: LinesMesh, x: number, z: number, radius: number): void {
    mesh.position.set(x, heightAt(x, z) + 0.7, z);
    mesh.scaling.set(radius, 1, radius);
    mesh.setEnabled(true);
  }
}

function ring(scene: Scene, name: string, color: Color3): LinesMesh {
  const mesh = MeshBuilder.CreateLines(name, { points: POINTS }, scene);
  mesh.color = color;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return mesh;
}
