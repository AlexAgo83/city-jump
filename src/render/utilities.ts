import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import type { Scene } from "@babylonjs/core/scene";

import type { RoadGraph } from "../sim/graph";
import { carriesUtility, type Utilities, type UtilityKind } from "../sim/utilities";
import { toBabylon } from "./convert";

const LIFT = 0.8;
const COLORS: Record<UtilityKind, Color3> = {
  power: new Color3(1, 0.82, 0.22),
  water: new Color3(0.25, 0.7, 1),
};

export function createUtilityRenderer(scene: Scene, graph: RoadGraph, utilities: Utilities, heightAt: (x: number, z: number) => number) {
  let visible = false;
  let lines: LinesMesh[] = [];

  function rebuild(supplied: ReadonlySet<string>): void {
    for (const line of lines) line.dispose();
    lines = [];
    for (const segment of graph.allSegments()) {
      for (const kind of ["power", "water"] as const) {
        if (!carriesUtility(segment, kind)) continue;
        const line = MeshBuilder.CreateLines(`utility-road-${kind}`, { points: segment.samples.map((p) => toBabylon(p).addInPlaceFromFloats(0, LIFT + (kind === "water" ? 0.25 : 0), 0)) }, scene);
        line.color = COLORS[kind];
        line.alpha = 0.85;
        line.isPickable = false;
        line.setEnabled(visible);
        lines.push(line);
      }
    }
    for (const diffuser of utilities.diffusers()) {
      const points = Array.from({ length: 65 }, (_, i) => {
        const angle = (i / 64) * Math.PI * 2;
        const x = diffuser.position.x + Math.cos(angle) * diffuser.radius;
        const z = diffuser.position.z + Math.sin(angle) * diffuser.radius;
        return new Vector3(x, heightAt(x, z) + LIFT, z);
      });
      const ring = MeshBuilder.CreateLines(`utility-radius-${diffuser.kind}`, { points }, scene);
      ring.color = supplied.has(diffuser.id) ? COLORS[diffuser.kind] : Color3.Red();
      ring.alpha = supplied.has(diffuser.id) ? 0.9 : 0.65;
      ring.isPickable = false;
      ring.setEnabled(visible);
      lines.push(ring);
    }
    for (const item of utilities.toJSON()) {
      const marker = MeshBuilder.CreateLines(`utility-marker-${item[1]}`, { points: ringPoints(item[2], item[3], item[0] === "producer" ? 10 : 6, heightAt) }, scene);
      marker.color = COLORS[item[1]];
      marker.isPickable = false;
      marker.setEnabled(visible);
      lines.push(marker);
    }
  }

  return {
    rebuild,
    setVisible(next: boolean) {
      visible = next;
      for (const line of lines) line.setEnabled(next);
    },
    dispose(): void {
      for (const line of lines) {
        line.material?.dispose();
        line.dispose();
      }
      lines = [];
    },
  };
}

function ringPoints(cx: number, z: number, radius: number, heightAt: (x: number, z: number) => number): Vector3[] {
  return Array.from({ length: 33 }, (_, i) => {
    const angle = (i / 32) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const zed = z + Math.sin(angle) * radius;
    return new Vector3(x, heightAt(x, zed) + LIFT, zed);
  });
}
