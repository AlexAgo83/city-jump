// Side-effect import: without it `scene.pick` silently returns nothing and every click
// is swallowed. Babylon only warns, so the tool looks broken rather than unconfigured.
import "@babylonjs/core/Culling/ray";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";

import { RoadGraph } from "../sim/graph";
import { resolveSnap, validateSegment, commitSegment, type Snap } from "../sim/rules";
import { roadType } from "../sim/roadTypes";
import { type Vec3, v3, lerp } from "../sim/vec";
import { toBabylon } from "./convert";

const ACCEPTED = new Color3(0.45, 0.85, 0.5);
const REFUSED = new Color3(0.95, 0.35, 0.25);
const PREVIEW_LIFT = 0.35; // keeps the preview off the ground it is drawn over

/**
 * Three clicks: start, control point, end. No drag state to manage, and the bend is
 * explicit rather than inferred from how the pointer moved.
 */
type Stage =
  | { phase: "idle" }
  | { phase: "control"; from: Snap }
  | { phase: "end"; from: Snap; control: Vec3 };

export interface DrawTool {
  readonly stageLabel: () => string;
  readonly mode: () => ToolMode;
  cancel(): void;
  setMode(mode: ToolMode): void;
  setGridSnap(enabled: boolean): void;
  setRoadType(type: RoadTypeId): void;
}

export type DrawMode = "straight" | "curve";
export type ToolMode = "view" | DrawMode;
export type RoadTypeId = "street" | "avenue";

export function createDrawTool(
  scene: Scene,
  graph: RoadGraph,
  ground: Mesh,
  onCommitted: () => void,
  onRefused: (reason: string) => void,
  initialTypeId: RoadTypeId = "street",
): DrawTool {
  let stage: Stage = { phase: "idle" };
  let mode: ToolMode = "view";
  let gridSnap = true;
  let typeId = initialTypeId;
  let preview: LinesMesh | null = null;
  let leftPointerDown = false;
  const nodeHighlight = MeshBuilder.CreateLines(
    "node-highlight",
    {
      points: Array.from({ length: 33 }, (_, i) => {
        const angle = (i / 32) * Math.PI * 2;
        return new Vector3(Math.cos(angle) * 3, 0, Math.sin(angle) * 3);
      }),
    },
    scene,
  );
  nodeHighlight.color = ACCEPTED;
  nodeHighlight.isPickable = false;
  nodeHighlight.setEnabled(false);

  function clearPreview(): void {
    preview?.dispose();
    preview = null;
  }

  function drawPreview(points: Vec3[], ok: boolean): void {
    clearPreview();
    if (points.length < 2) return;
    preview = MeshBuilder.CreateLines(
      "preview",
      { points: points.map((p) => toBabylon(p).addInPlaceFromFloats(0, PREVIEW_LIFT, 0)) },
      scene,
    );
    preview.color = ok ? ACCEPTED : REFUSED;
    preview.isPickable = false;
  }

  function groundPoint(): { x: number; z: number } | null {
    const pick = scene.pick(scene.pointerX, scene.pointerY, (m) => m === ground);
    if (!pick?.hit || !pick.pickedPoint) return null;
    return { x: pick.pickedPoint.x, z: pick.pickedPoint.z };
  }

  function onMove(): void {
    if (mode === "view") return;
    const at = groundPoint();
    if (!at) {
      nodeHighlight.setEnabled(false);
      return clearPreview();
    }
    const snap = resolveSnap(graph, at.x, at.z, gridSnap);
    nodeHighlight.setEnabled(snap.kind === "node");
    if (snap.kind === "node") {
      nodeHighlight.position.copyFromFloats(snap.position.x, snap.position.y + PREVIEW_LIFT, snap.position.z);
    }
    if (stage.phase === "idle") return clearPreview();

    if (stage.phase === "control") {
      // Before the control point is placed, the preview is the straight it would be.
      const mid = lerp(stage.from.position, snap.position, 0.5);
      const check = validateSegment(stage.from.position, mid, snap.position, typeId);
      drawPreview(sampleQuadratic(stage.from.position, mid, snap.position), check.ok);
      return;
    }

    const check = validateSegment(stage.from.position, stage.control, snap.position, typeId);
    drawPreview(sampleQuadratic(stage.from.position, stage.control, snap.position), check.ok);
  }

  function onClick(): void {
    if (mode === "view") return;
    const at = groundPoint();
    if (!at) return;
    const snap = resolveSnap(graph, at.x, at.z, gridSnap);

    if (stage.phase === "idle") {
      stage = { phase: "control", from: snap };
      return;
    }
    if (stage.phase === "control") {
      if (mode === "straight") {
        finish(stage.from, snap, lerp(stage.from.position, snap.position, 0.5));
        return;
      }
      stage = { phase: "end", from: stage.from, control: snap.position };
      return;
    }

    finish(stage.from, snap, stage.control);
  }

  function finish(from: Snap, to: Snap, control: Vec3): void {
    const result = commitSegment(graph, from, to, control, typeId);
    if (!result.ok) {
      onRefused(result.reason);
      return; // the refused segment never entered the graph; keep drawing from the same start
    }
    stage = { phase: "idle" };
    clearPreview();
    onCommitted();
  }

  function cancel(): void {
    stage = { phase: "idle" };
    clearPreview();
  }

  scene.onPointerObservable.add((info) => {
    if (info.type === PointerEventTypes.POINTERMOVE) return onMove();
    if (info.type === PointerEventTypes.POINTERDOWN) {
      leftPointerDown = (info.event as PointerEvent).button === 0;
      return;
    }
    if (info.type !== PointerEventTypes.POINTERUP) return;
    const isLeftClick = leftPointerDown && (info.event as PointerEvent).button === 0;
    leftPointerDown = false;
    if (isLeftClick) onClick();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cancel();
  });

  // Right-click cancels rather than opening the browser menu.
  scene.getEngine().getRenderingCanvas()?.addEventListener("contextmenu", (e) => e.preventDefault());

  void roadType(typeId); // fail here rather than at the first commit
  void Vector3;

  return {
    mode: () => mode,
    stageLabel: () =>
      mode === "view"
        ? "view: camera only"
        : stage.phase === "idle"
        ? "click: start a road"
        : stage.phase === "control"
          ? mode === "straight"
            ? "click: finish the road"
            : "click: place the bend"
          : "click: finish the road",
    cancel,
    setMode(next) {
      mode = next;
      cancel();
    },
    setGridSnap(enabled) {
      gridSnap = enabled;
      cancel();
    },
    setRoadType(next) {
      typeId = next;
      cancel();
    },
  };
}

/** Preview sampling only; the graph builds its own table once the segment is accepted. */
function sampleQuadratic(a: Vec3, c: Vec3, b: Vec3, steps = 32): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push(
      v3(
        a.x * u * u + c.x * 2 * u * t + b.x * t * t,
        a.y * u * u + c.y * 2 * u * t + b.y * t * t,
        a.z * u * u + c.z * 2 * u * t + b.z * t * t,
      ),
    );
  }
  return out;
}
