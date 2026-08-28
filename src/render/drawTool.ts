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
import { terrainHeight } from "../sim/terrain";
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
  readonly mode: () => ToolMode;
  cancel(): void;
  setMode(mode: ToolMode): void;
  setGridSnap(enabled: boolean): void;
  setRoadType(type: RoadTypeId): void;
  setTreeSpecies(species: string): void;
}

export type DrawMode = "straight" | "curve";
export type PlantMode = "plant" | "spray";
export type ToolMode = "view" | "bulldoze" | DrawMode | PlantMode;
export type RoadTypeId = "street" | "avenue" | "tunnel" | "pedestrian";

/** The spray brush: trees land at random inside this radius, so the ring shows where they can go. */
const SPRAY_RADIUS = 45;
/** Trees attempted per press, and again each time the brush has moved half its own width. */
const SPRAY_PER_BURST = 8;
const SPRAY_RING_POINTS = 56;

/** How far from the pointer the bulldozer will look for a tree, once it has found no road. */
export const TREE_REACH = 8;

/**
 * Planting and clearing, which the tool drives but does not own. Both refresh the scenery
 * themselves rather than going through `onCommitted`: a tree changes no road, so re-solving
 * parcels and reshaping terrain for one sapling would make spray unusable.
 */
export interface NatureTools {
  /** False if a tree cannot go here -- underwater, mainly. */
  plant(x: number, z: number, species: string): boolean;
  /** True if a tree was actually cleared. */
  clearTree(x: number, z: number): boolean;
}

export function createDrawTool(
  scene: Scene,
  graph: RoadGraph,
  ground: Mesh,
  onCommitted: () => void,
  onRefused: (reason: string) => void,
  nature: NatureTools,
  initialTypeId: RoadTypeId = "street",
): DrawTool {
  let stage: Stage = { phase: "idle" };
  let mode: ToolMode = "view";
  let gridSnap = true;
  let typeId = initialTypeId;
  let treeSpecies = "fir";
  let preview: LinesMesh | null = null;
  let leftPointerDown = false;
  let lastSprayed: { x: number; z: number } | null = null;
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

  // The spray brush. Rebuilt in place every time the pointer moves so it lies on the terrain
  // rather than cutting through it. ponytail: an updatable line loop, not a decal or a projector.
  let sprayRing = MeshBuilder.CreateLines(
    "spray-ring",
    { points: ringPoints(0, 0), updatable: true },
    scene,
  );
  sprayRing.color = ACCEPTED;
  sprayRing.isPickable = false;
  sprayRing.alwaysSelectAsActiveMesh = true;
  sprayRing.setEnabled(false);

  function ringPoints(cx: number, cz: number): Vector3[] {
    return Array.from({ length: SPRAY_RING_POINTS + 1 }, (_, i) => {
      const angle = (i / SPRAY_RING_POINTS) * Math.PI * 2;
      const x = cx + Math.cos(angle) * SPRAY_RADIUS;
      const z = cz + Math.sin(angle) * SPRAY_RADIUS;
      return new Vector3(x, terrainHeight(x, z) + PREVIEW_LIFT, z);
    });
  }

  function moveSprayRing(centre: { x: number; z: number } | null): void {
    if (!centre) {
      sprayRing.setEnabled(false);
      return;
    }
    sprayRing = MeshBuilder.CreateLines("spray-ring", { points: ringPoints(centre.x, centre.z), instance: sprayRing });
    sprayRing.setEnabled(true);
  }

  /** One burst: scattered evenly over the disc, so the middle is not denser than the edge. */
  function sprayBurst(centre: { x: number; z: number }): void {
    for (let i = 0; i < SPRAY_PER_BURST; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * SPRAY_RADIUS;
      nature.plant(centre.x + Math.cos(angle) * distance, centre.z + Math.sin(angle) * distance, treeSpecies);
    }
  }

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

  function onSprayMove(painting: boolean): void {
    const at = groundPoint();
    moveSprayRing(at);
    if (!at || !painting) return;
    // Wait until the brush has moved half its width before laying down another burst.
    if (lastSprayed && Math.hypot(at.x - lastSprayed.x, at.z - lastSprayed.z) < SPRAY_RADIUS / 2) return;
    sprayBurst(at);
    lastSprayed = at;
  }

  function onMove(): void {
    if (mode === "view") return;
    const at = groundPoint();
    if (!at) {
      nodeHighlight.setEnabled(false);
      return clearPreview();
    }
    if (mode === "bulldoze") {
      nodeHighlight.setEnabled(false);
      const target = bulldozeTarget(at.x, at.z);
      return target ? drawPreview([...target.samples], false) : clearPreview();
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
    if (mode === "bulldoze") {
      const target = bulldozeTarget(at.x, at.z);
      if (target) {
        graph.removeSegment(target.id);
        clearPreview();
        onCommitted();
        return;
      }
      // Nothing paved under the pointer, so the bulldozer takes a tree instead.
      nature.clearTree(at.x, at.z);
      return;
    }
    if (mode === "plant") {
      if (!nature.plant(at.x, at.z, treeSpecies)) onRefused("A tree needs dry ground.");
      return;
    }
    if (mode === "spray") {
      sprayBurst(at);
      lastSprayed = at;
      return;
    }
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
    lastSprayed = null;
    sprayRing.setEnabled(false);
    nodeHighlight.setEnabled(false);
    clearPreview();
  }

  function bulldozeTarget(x: number, z: number) {
    const nearest = graph.nearestOnSegment(x, z, 20);
    if (!nearest) return null;
    const hitDistance = Math.hypot(x - nearest.position.x, z - nearest.position.z);
    return hitDistance <= roadType(nearest.segment.type).width / 2 + 3 ? nearest.segment : null;
  }

  scene.onPointerObservable.add((info) => {
    if (info.type === PointerEventTypes.POINTERMOVE) {
      // The brush follows the pointer whatever the button is doing; it only paints while held.
      if (mode === "spray") return onSprayMove(leftPointerDown);
      return onMove();
    }
    if (info.type === PointerEventTypes.POINTERDOWN) {
      leftPointerDown = (info.event as PointerEvent).button === 0;
      lastSprayed = null;
      return;
    }
    if (info.type !== PointerEventTypes.POINTERUP) return;
    const isLeftClick = leftPointerDown && (info.event as PointerEvent).button === 0;
    leftPointerDown = false;
    // A drag that already sprayed must not also fire a burst on release.
    const sprayed = mode === "spray" && lastSprayed !== null;
    lastSprayed = null;
    if (isLeftClick && !sprayed) onClick();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cancel();
  });

  // Right-click cancels rather than opening the browser menu.
  scene.getEngine().getRenderingCanvas()?.addEventListener("contextmenu", (e) => e.preventDefault());

  /**
   * Spray paints with a held left drag, which is also how the camera orbits. Taking button 0 off
   * the camera for the duration means a spray stroke does not swing the view out from under it.
   * Middle and right drags still orbit, and the wheel still zooms.
   * ponytail: drop one button from the existing input, rather than detaching the camera.
   */
  function setCameraDrag(allowLeft: boolean): void {
    const pointers = scene.activeCamera?.inputs?.attached?.pointers as { buttons?: number[] } | undefined;
    if (pointers) pointers.buttons = allowLeft ? [0, 1, 2] : [1, 2];
  }

  void roadType(typeId); // fail here rather than at the first commit
  void Vector3;

  return {
    mode: () => mode,
    cancel,
    setMode(next) {
      mode = next;
      setCameraDrag(next !== "spray");
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
    setTreeSpecies(next) {
      treeSpecies = next;
    },
  };
}

/** Preview sampling only; the graph builds its own table once the segment is accepted. */
function sampleQuadratic(a: Vec3, c: Vec3, b: Vec3, steps = 32): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = a.x * u * u + c.x * 2 * u * t + b.x * t * t;
    const z = a.z * u * u + c.z * 2 * u * t + b.z * t * t;
    out.push(v3(x, terrainHeight(x, z), z));
  }
  return out;
}
