// Side-effect import: without it `scene.pick` silently returns nothing and every click
// is swallowed. Babylon only warns, so the tool looks broken rather than unconfigured.
import "@babylonjs/core/Culling/ray";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";

import type { RoadGraph, Segment } from "../sim/graph";
import type { Snap } from "../sim/rules";
import { baseRoadTypeId, roadType } from "../sim/roadTypes";
import type { Terrain } from "../sim/terrain";
import { addressForParcel, streetForSegment } from "../sim/streets";
import { buildingBuildCost, demolitionRefund } from "../sim/economy";
import { UTILITY_CATALOG, type SavedUtility, type UtilityKind, type UtilityRole } from "../sim/utilities";
import type { BuildingKind } from "../sim/buildingKinds";
import { workforceDemand } from "../sim/workforce";
import type { BuildingStatus } from "../sim/buildingLifecycle";
import type { TerrainBounds } from "../sim/heightmap";
import { type Vec3, lerp } from "../sim/vec";
import type { ZoneKind } from "../sim/zones";
import { GRID } from "../sim/slots";
import { toBabylon } from "./convert";

const ACCEPTED = new Color3(0.45, 0.85, 0.5);
const REFUSED = new Color3(0.95, 0.35, 0.25);
const SELECTED = new Color3(0.4, 0.7, 0.95);
const PREVIEW_LIFT = 0.35; // keeps the preview off the ground it is drawn over
const TERRAIN_DIRTY_PAD = 140;
const DEMOLITION_MS = 1_000;

/**
 * Three clicks: start, control point, end. No drag state to manage, and the bend is
 * explicit rather than inferred from how the pointer moved.
 */
type BulldozeTarget =
  | { kind: "road"; segment: Segment }
  | { kind: "building"; status: BuildingStatus }
  | { kind: "utility"; utility: SavedUtility }
  | { kind: "tree"; x: number; z: number }
  | { kind: "roundabout"; node: number; x: number; z: number; radius: number; lanes: 1 | 2 };

export type FollowTarget = () => { x: number; y: number; z: number; heading: number; segment: Segment } | null;

type SelectTarget =
  | BulldozeTarget
  | { kind: "building"; status: BuildingStatus }
  | { kind: "vehicle"; segment: Segment; vehicle: string; model: string; target: FollowTarget };

/** What the select tool shows in its panel -- one summary per kind of thing it can pick. */
export type SelectionInfo =
  | { kind: "road"; name: string; street: string; baseId: string; lanes: 1 | 2; oneWay: boolean; length: number }
  | { kind: "building"; address: string; footprint: string; buildingKind: BuildingKind; state: BuildingStatus["state"]; reason?: BuildingStatus["reason"]; x: number; z: number; progress: number; remainingSeconds: number; workers: number; staffed: boolean }
  | { kind: "utility"; role: UtilityRole; utility: UtilityKind; staff: number }
  | { kind: "vehicle"; name: string; model: string; street: string; target: FollowTarget }
  | { kind: "tree" }
  | { kind: "roundabout"; lanes: 1 | 2; radius: number };

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
  setSprayRadius(radius: number): void;
  setZoneKind(kind: ZoneKind | "clear"): void;
  setZoneRadius(radius: number): void;
  paintZoneAt(x: number, z: number, radius: number, kind: ZoneKind | null): void;
  setUtility(kind: UtilityKind, role: UtilityRole): void;
}

export type DrawMode = "straight" | "curve";
export type PlantMode = "plant" | "spray";
export type ToolMode = "view" | "bulldoze" | "roundabout" | "zone" | "utility" | DrawMode | PlantMode;
/** Any key `ROAD_TYPES` recognizes -- a base id, or one composed with lanes/one-way. */
export type RoadTypeId = string;

export interface DrawController {
  resolveSnap(x: number, z: number, gridSnap: boolean): Snap;
  previewRoad(from: Snap, to: Snap, control: Vec3, type: RoadTypeId): { points: Vec3[]; ok: boolean };
  junctionNodeAt(x: number, z: number): number | null;
  roundaboutEnabled(node: number): boolean;
  roundaboutAt(x: number, z: number): Extract<BulldozeTarget, { kind: "roundabout" }> | null;
  nearestRoad(x: number, z: number, reach: number): { segment: Segment; position: Vec3 } | null;
  roadAt(x: number, z: number): Segment | null;
  commitRoad(from: Snap, to: Snap, control: Vec3, type: RoadTypeId, effects?: boolean): { ok: true } | { ok: false; reason: string };
  removeRoad(segment: Segment, effects?: boolean): boolean;
  setRoundabout(node: number, enabled: boolean, lanes?: 1 | 2): boolean;
}

/** The spray brush: trees land at random inside this radius, so the ring shows where they can go. */
const SPRAY_RADIUS = 45;
/**
 * Kept equal to the `#zone-radius` slider's own default in `index.html`.
 *
 * The tool used to start on the tree brush's radius while the slider read something else, so what
 * was painted and what the slider said were two different numbers until the slider was first
 * dragged. `bindControls` now emits the slider's value at startup as well; this keeps them equal
 * even if that emit is ever lost.
 */
const ZONE_RADIUS = 32;
/** Trees attempted per press, and again each time the brush has moved half its own width. */
const SPRAY_PER_BURST = 8;
const SPRAY_RING_POINTS = 56;

/**
 * Pointer travel, in pixels, still counted as a click rather than a drag. Left-drag also orbits
 * the camera, so without this every time you swing the view in a build mode you would also place
 * a node, plant a tree, or bulldoze whatever you happened to release over.
 */
const CLICK_SLOP = 5;

/** How far from the pointer the bulldozer will look for a tree, once it has found no road. */
export const TREE_REACH = 8;
/** Standing this close to a tree means you are pointing AT it, and it wins over the road behind. */
const TREE_HIT = 3.5;

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
  /** Where the nearest tree stands, for aiming and for showing what would go. */
  treeAt(x: number, z: number, within: number): { x: number; z: number } | null;
}

export interface ZoneTools {
  paint(x: number, z: number, radius: number, kind: ZoneKind | null): void;
  /**
   * What a stroke of the brush actually changes: the zoning, and the lots that follow from it. The
   * ordinary commit rebuilds the world over its dirty box -- terrain, trees, roads, traffic,
   * signals -- and a zone moves none of that, so painting made the trees blink as they were torn
   * down and put back under the brush.
   */
  painted(): void;
}

export interface SelectionTools {
  buildingAt(x: number, z: number): BuildingStatus | null;
  vehicleAt(x: number, z: number): { segment: Segment; kind: string; vehicle: string; target: FollowTarget } | null;
  vehicleByMesh(name: string): { segment: Segment; kind: string; vehicle: string; target: FollowTarget } | null;
}

export interface HistoryTools {
  beforeChange(): void;
  afterChange(changed: boolean): void;
}

export interface EconomyTools {
  canSpend(cost: number): boolean;
  spend(cost: number, allowDebt?: boolean): boolean;
  refund(amount: number): void;
  money(): number;
}

export interface DemolitionTools {
  building(status: BuildingStatus): boolean;
}

export interface UtilityTools {
  place(role: UtilityRole, kind: UtilityKind, x: number, z: number): boolean;
  removeAt(x: number, z: number): SavedUtility | null;
  nearest(x: number, z: number, within: number): SavedUtility | null;
  refresh(): void;
}

export function createDrawTool(
  scene: Scene,
  graph: RoadGraph,
  ground: Mesh,
  heightAt: Terrain["heightAt"],
  onCommitted: (dirty?: TerrainBounds) => void,
  onRefused: (reason: string) => void,
  nature: NatureTools,
  zones: ZoneTools,
  selection: SelectionTools,
  onSelect: (info: SelectionInfo | null) => void,
  initialTypeId: RoadTypeId = "street",
  history?: HistoryTools,
  economy?: EconomyTools,
  demolition?: DemolitionTools,
  utilities?: UtilityTools,
  controller?: DrawController,
): DrawTool {
  let stage: Stage = { phase: "idle" };
  let mode: ToolMode = "view";
  let gridSnap = true;
  let typeId = initialTypeId;
  let treeSpecies = "fir";
  let zoneKind: ZoneKind | "clear" = "residential";
  let utilityKind: UtilityKind = "power";
  let utilityRole: UtilityRole = "producer";
  let sprayRadius = SPRAY_RADIUS;
  let zoneRadius = ZONE_RADIUS;
  let preview: LinesMesh | null = null;
  let leftPointerDown = false;
  let lastSprayed: { x: number; z: number } | null = null;
  let pressedAt: { x: number; y: number } | null = null;
  const pendingDemolitions = new Set<number>();
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

  // One unit circle, moved and scaled to outline whatever the bulldozer is about to take.
  // ponytail: scale one mesh, rather than rebuilding a ring per hover.
  const targetHighlight = MeshBuilder.CreateLines(
    "bulldoze-highlight",
    {
      points: Array.from({ length: 49 }, (_, i) => {
        const angle = (i / 48) * Math.PI * 2;
        return new Vector3(Math.cos(angle), 0, Math.sin(angle));
      }),
    },
    scene,
  );
  targetHighlight.color = REFUSED;
  targetHighlight.isPickable = false;
  targetHighlight.setEnabled(false);

  function highlightCircle(x: number, z: number, radius: number): void {
    targetHighlight.position.set(x, heightAt(x, z) + PREVIEW_LIFT, z);
    targetHighlight.scaling.set(radius, 1, radius);
    targetHighlight.setEnabled(true);
  }

  // Its own mesh, not `targetHighlight`: a selection has to survive other modes' hover logic
  // touching that one, and stay lit until the player picks something else or clicks the terrain.
  const selectRing = MeshBuilder.CreateLines(
    "select-highlight",
    { points: Array.from({ length: 49 }, (_, i) => new Vector3(Math.cos((i / 48) * Math.PI * 2), 0, Math.sin((i / 48) * Math.PI * 2))) },
    scene,
  );
  selectRing.color = SELECTED;
  selectRing.isPickable = false;
  selectRing.setEnabled(false);
  let selectLine: LinesMesh | null = null;

  function clearSelection(): void {
    selectRing.setEnabled(false);
    selectLine?.dispose();
    selectLine = null;
    onSelect(null);
  }

  function showSelection(target: SelectTarget): void {
    selectLine?.dispose();
    selectLine = null;
    selectRing.setEnabled(false);
    if (target.kind === "road") {
      selectLine = MeshBuilder.CreateLines(
        "select-road",
        { points: target.segment.samples.map((p) => toBabylon(p).addInPlaceFromFloats(0, PREVIEW_LIFT, 0)) },
        scene,
      );
      selectLine.color = SELECTED;
      selectLine.isPickable = false;
      const type = roadType(target.segment.type);
      onSelect({
        kind: "road",
        name: type.name,
        street: streetForSegment(graph, target.segment.id).name,
        baseId: baseRoadTypeId(target.segment.type),
        lanes: type.lanes,
        oneWay: Boolean(type.oneWay),
        length: target.segment.length,
      });
      return;
    }
    if (target.kind === "building") {
      const address = addressForParcel(graph, target.status.parcel);
      onSelect({
        kind: "building",
        address: `${address.number} ${address.street.name}`,
        footprint: `${target.status.parcel.frontageCells}x${target.status.parcel.depthCells}`,
        buildingKind: target.status.parcel.kind,
        state: target.status.state,
        x: target.status.parcel.position.x,
        z: target.status.parcel.position.z,
        progress: target.status.progress,
        remainingSeconds: target.status.remainingSeconds,
        workers: workforceDemand(target.status.parcel),
        staffed: target.status.staffed,
        ...(target.status.reason ? { reason: target.status.reason } : {}),
      });
      return;
    }
    if (target.kind === "utility") {
      onSelect({ kind: "utility", role: target.utility[0], utility: target.utility[1], staff: UTILITY_CATALOG[target.utility[1]][target.utility[0]].staff });
      return;
    }
    if (target.kind === "vehicle") {
      onSelect({ kind: "vehicle", name: target.vehicle, model: target.model, street: streetForSegment(graph, target.segment.id).name, target: target.target });
      return;
    }
    if (target.kind === "tree") {
      selectRing.position.set(target.x, heightAt(target.x, target.z) + PREVIEW_LIFT, target.z);
      selectRing.scaling.set(3, 1, 3);
      selectRing.setEnabled(true);
      onSelect({ kind: "tree" });
      return;
    }
    selectRing.position.set(target.x, heightAt(target.x, target.z) + PREVIEW_LIFT, target.z);
    selectRing.scaling.set(target.radius, 1, target.radius);
    selectRing.setEnabled(true);
    onSelect({ kind: "roundabout", lanes: target.lanes, radius: target.radius });
  }

  function selectAt(x: number, z: number): void {
    const onTree = nature.treeAt(x, z, TREE_HIT);
    if (onTree) return showSelection({ kind: "tree", ...onTree });
    const vehicle = selection.vehicleAt(x, z);
    if (vehicle) return showSelection({ kind: "vehicle", segment: vehicle.segment, vehicle: vehicle.kind, model: vehicle.vehicle, target: vehicle.target });
    const building = selection.buildingAt(x, z);
    if (building) return showSelection({ kind: "building", status: building });
    const target = bulldozeTarget(x, z);
    if (!target) return clearSelection();
    showSelection(target);
  }
  function selectMesh(): boolean {
    const pick = scene.pick(scene.pointerX, scene.pointerY, (m) => m.name.startsWith("traffic_"));
    const vehicle = pick?.pickedMesh ? selection.vehicleByMesh(pick.pickedMesh.name) : null;
    if (!vehicle) return false;
    showSelection({ kind: "vehicle", segment: vehicle.segment, vehicle: vehicle.kind, model: vehicle.vehicle, target: vehicle.target });
    return true;
  }

  // The spray brush. Rebuilt in place every time the pointer moves so it lies on the terrain
  // rather than cutting through it. ponytail: an updatable line loop, not a decal or a projector.
  let sprayRing = MeshBuilder.CreateLines(
    "spray-ring",
    { points: ringPoints(0, 0, sprayRadius), updatable: true },
    scene,
  );
  sprayRing.color = ACCEPTED;
  sprayRing.isPickable = false;
  sprayRing.alwaysSelectAsActiveMesh = true;
  sprayRing.setEnabled(false);

  function ringPoints(cx: number, cz: number, radius: number): Vector3[] {
    return Array.from({ length: SPRAY_RING_POINTS + 1 }, (_, i) => {
      const angle = (i / SPRAY_RING_POINTS) * Math.PI * 2;
      const x = cx + Math.cos(angle) * radius;
      const z = cz + Math.sin(angle) * radius;
      return new Vector3(x, heightAt(x, z) + PREVIEW_LIFT, z);
    });
  }

  function moveSprayRing(centre: { x: number; z: number } | null, radius: number): void {
    if (!centre) {
      sprayRing.setEnabled(false);
      return;
    }
    sprayRing = MeshBuilder.CreateLines("spray-ring", { points: ringPoints(centre.x, centre.z, radius), instance: sprayRing });
    sprayRing.setEnabled(true);
  }

  /** One burst: scattered evenly over the disc, so the middle is not denser than the edge. */
  let gestureChanged = false;

  function sprayBurst(centre: { x: number; z: number }): boolean {
    let changed = false;
    for (let i = 0; i < SPRAY_PER_BURST; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * sprayRadius;
      changed = nature.plant(centre.x + Math.cos(angle) * distance, centre.z + Math.sin(angle) * distance, treeSpecies) || changed;
    }
    return changed;
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
    moveSprayRing(at, sprayRadius);
    if (!at || !painting) return;
    // Wait until the brush has moved half its width before laying down another burst.
    if (!brushMovedFarEnough(lastSprayed, at, sprayRadius)) return;
    if (!lastSprayed) history?.beforeChange();
    gestureChanged = sprayBurst(at) || gestureChanged;
    lastSprayed = at;
  }

  function onZoneMove(painting: boolean): void {
    const at = groundPoint();
    moveSprayRing(at, zoneRadius);
    if (!at || !painting) return;
    if (!lastSprayed) history?.beforeChange();
    zones.paint(at.x, at.z, zoneRadius, zoneKind === "clear" ? null : zoneKind);
    lastSprayed = at;
    gestureChanged = true;
    onCommitted(expandBounds({ minX: at.x - zoneRadius, maxX: at.x + zoneRadius, minZ: at.z - zoneRadius, maxZ: at.z + zoneRadius }, TERRAIN_DIRTY_PAD));
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
      clearPreview();
      targetHighlight.setEnabled(false);
      if (!target) return;
      if (target.kind === "road") return drawPreview([...target.segment.samples], false);
      if (target.kind === "building") return highlightCircle(target.status.parcel.position.x, target.status.parcel.position.z, Math.max(target.status.parcel.frontageCells, target.status.parcel.depthCells) * GRID.cellSize * 0.5);
      if (target.kind === "utility") return highlightCircle(target.utility[2], target.utility[3], target.utility[0] === "diffuser" ? target.utility[4] ?? UTILITY_CATALOG[target.utility[1]].diffuser.radius : 8);
      if (target.kind === "tree") return highlightCircle(target.x, target.z, 3);
      return highlightCircle(target.x, target.z, target.radius);
    }
    if (mode === "utility") {
      nodeHighlight.setEnabled(false);
      const hit = controller?.nearestRoad(at.x, at.z, 24);
      clearPreview();
      if (!hit) return moveSprayRing(null, 1);
      drawPreview([...hit.segment.samples], true);
      moveSprayRing(utilityRole === "diffuser" ? hit.position : null, UTILITY_CATALOG[utilityKind].diffuser.radius);
      return;
    }
    targetHighlight.setEnabled(false);
    const snap = controller?.resolveSnap(at.x, at.z, gridSnap);
    if (!snap) return clearPreview();
    nodeHighlight.setEnabled(snap.kind === "node");
    if (snap.kind === "node") {
      nodeHighlight.position.copyFromFloats(snap.position.x, snap.position.y + PREVIEW_LIFT, snap.position.z);
    }
    if (stage.phase === "idle") return clearPreview();

    if (stage.phase === "control") {
      // Before the control point is placed, the preview is the straight it would be.
      const mid = lerp(stage.from.position, snap.position, 0.5);
      const preview = controller?.previewRoad(stage.from, snap, mid, typeId);
      if (preview) drawPreview(preview.points, preview.ok);
      return;
    }

    const preview = controller?.previewRoad(stage.from, snap, stage.control, typeId);
    if (preview) drawPreview(preview.points, preview.ok);
  }

  function onClick(): void {
    if (mode === "view") {
      if (selectMesh()) return;
      const at = groundPoint();
      if (at) selectAt(at.x, at.z);
      return;
    }
    const at = groundPoint();
    if (!at) return;
    if (mode === "bulldoze") {
      const target = bulldozeTarget(at.x, at.z);
      if (!target) return;
      clearPreview();
      targetHighlight.setEnabled(false);
      if (target.kind === "tree") {
        history?.beforeChange();
        history?.afterChange(nature.clearTree(target.x, target.z));
        return;
      }
      if (target.kind === "building") {
        const refund = demolitionRefund(buildingBuildCost(target.status.parcel));
        scheduleDemolition(() => {
          const changed = demolition?.building(target.status) ?? false;
          if (changed) economy?.refund(refund);
          return changed;
        });
        return;
      }
      if (target.kind === "utility") {
        scheduleDemolition(() => {
          const removed = utilities?.removeAt(target.utility[2], target.utility[3]);
          if (removed?.[0] === "diffuser") onRefused(`${removed[1] === "power" ? "Power" : "Water"} diffuser destroyed. Covered district went dark.`);
          utilities?.refresh();
          return Boolean(removed);
        });
        return;
      }
      if (target.kind === "roundabout") {
        history?.beforeChange();
        history?.afterChange(controller?.setRoundabout(target.node, false) ?? false);
      } else {
        scheduleDemolition(() => controller?.removeRoad(target.segment) ?? false);
      }
      return;
    }
    if (mode === "roundabout") {
      const node = controller?.junctionNodeAt(at.x, at.z);
      if (!node) return onRefused("Click where two or more roads meet.");
      history?.beforeChange();
      // The road panel's lane choice applies here too -- a roundabout has no type of its own,
      // so it takes lanes from whatever is currently selected to draw with.
      history?.afterChange(controller?.setRoundabout(node, !controller.roundaboutEnabled(node), roadType(typeId).lanes) ?? false);
      return;
    }
    if (mode === "plant") {
      history?.beforeChange();
      const planted = nature.plant(at.x, at.z, treeSpecies);
      if (!planted) onRefused("A tree needs dry ground.");
      history?.afterChange(planted);
      return;
    }
    if (mode === "spray") {
      history?.beforeChange();
      history?.afterChange(sprayBurst(at));
      lastSprayed = at;
      return;
    }
    if (mode === "zone") {
      history?.beforeChange();
      zones.paint(at.x, at.z, zoneRadius, zoneKind === "clear" ? null : zoneKind);
      history?.afterChange(true);
      zones.painted();
      return;
    }
    if (mode === "utility") {
      const cost = UTILITY_CATALOG[utilityKind][utilityRole].cost;
      if (!economy?.canSpend(cost)) return onRefused(`Need $${cost.toLocaleString()} for ${utilityKind} ${utilityRole}; treasury has $${Math.floor(economy?.money() ?? 0).toLocaleString()}.`);
      history?.beforeChange();
      const placed = utilities?.place(utilityRole, utilityKind, at.x, at.z) ?? false;
      if (!placed) onRefused("Place utilities on a road.");
      else {
        economy?.spend(cost);
        utilities?.refresh();
      }
      history?.afterChange(placed);
      return;
    }
    const snap = controller?.resolveSnap(at.x, at.z, gridSnap);
    if (!snap) return onRefused("Road drawing is unavailable.");

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
    history?.beforeChange();
    const result = controller?.commitRoad(from, to, control, typeId) ?? { ok: false, reason: "Road drawing is unavailable." };
    if (!result.ok) {
      onRefused(result.reason);
      history?.afterChange(false);
      return; // the refused segment never entered the graph; keep drawing from the same start
    }
    stage = { phase: "idle" };
    clearPreview();
    history?.afterChange(true);
  }

  /** Drawing state only -- never the selection, which an option change has no business erasing. */
  function resetDrawing(): void {
    stage = { phase: "idle" };
    lastSprayed = null;
    pressedAt = null;
    targetHighlight.setEnabled(false);
    sprayRing.setEnabled(false);
    nodeHighlight.setEnabled(false);
    clearPreview();
  }

  function cancel(): void {
    for (const id of pendingDemolitions) window.clearTimeout(id);
    pendingDemolitions.clear();
    resetDrawing();
    clearSelection();
  }

  function scheduleDemolition(commit: () => boolean): void {
    const revision = graph.revision;
    const timer = window.setTimeout(() => {
      pendingDemolitions.delete(timer);
      if (graph.revision !== revision) return;
      history?.beforeChange();
      let changed = false;
      try {
        changed = commit();
      } catch (error) {
        onRefused((error as Error).message);
      } finally {
        history?.afterChange(changed);
      }
    }, DEMOLITION_MS);
    pendingDemolitions.add(timer);
  }

  /**
   * What the bulldozer would take, in the order a player means them. A tree right under the
   * pointer beats the road it stands beside; a roundabout beats the roads running into it, since
   * their geometry still passes through the node under the ring; and a tree merely nearby is the
   * last resort, so clicking beside a road does not silently fell something several metres off.
   */
  function bulldozeTarget(x: number, z: number): BulldozeTarget | null {
    const onTree = nature.treeAt(x, z, TREE_HIT);
    if (onTree) return { kind: "tree", ...onTree };

    const roundabout = controller?.roundaboutAt(x, z);
    if (roundabout) return roundabout;

    const building = selection.buildingAt(x, z);
    if (building) return { kind: "building", status: building };

    const utility = utilities?.nearest(x, z, 10);
    if (utility) return { kind: "utility", utility };

    const road = controller?.roadAt(x, z);
    if (road) return { kind: "road", segment: road };

    const nearTree = nature.treeAt(x, z, TREE_REACH);
    return nearTree ? { kind: "tree", ...nearTree } : null;
  }

  scene.onPointerObservable.add((info) => {
    if (info.type === PointerEventTypes.POINTERMOVE) {
      // The brush follows the pointer whatever the button is doing; it only paints while held.
      if (mode === "spray") return onSprayMove(leftPointerDown);
      if (mode === "zone") return onZoneMove(leftPointerDown);
      return onMove();
    }
    if (info.type === PointerEventTypes.POINTERDOWN) {
      leftPointerDown = (info.event as PointerEvent).button === 0;
      pressedAt = { x: scene.pointerX, y: scene.pointerY };
      lastSprayed = null;
      return;
    }
    if (info.type !== PointerEventTypes.POINTERUP) return;
    const isLeftClick = leftPointerDown && (info.event as PointerEvent).button === 0;
    leftPointerDown = false;
    const travelled = pressedAt
      ? Math.hypot(scene.pointerX - pressedAt.x, scene.pointerY - pressedAt.y)
      : 0;
    pressedAt = null;
    // A drag that already sprayed must not also fire a burst on release.
    const sprayed = (mode === "spray" || mode === "zone") && lastSprayed !== null;
    if (sprayed) history?.afterChange(gestureChanged);
    gestureChanged = false;
    lastSprayed = null;
    if (isLeftClick && !sprayed && travelled <= CLICK_SLOP) onClick();
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
      setCameraDrag(next !== "spray" && next !== "zone");
      cancel();
    },
    setGridSnap(enabled) {
      gridSnap = enabled;
      resetDrawing();
    },
    setRoadType(next) {
      typeId = next;
      resetDrawing();
    },
    setTreeSpecies(next) {
      treeSpecies = next;
    },
    setSprayRadius(next) {
      sprayRadius = next;
      resetDrawing();
    },
    setZoneKind(next) {
      zoneKind = next;
      resetDrawing();
    },
    /** The same paint the brush commits, addressable from a script. */
    paintZoneAt(x: number, z: number, radius: number, kind: ZoneKind | null) {
      zones.paint(x, z, radius, kind);
      zones.painted(); // the same light path a brush stroke takes: see `ZoneTools.painted`
    },
    setZoneRadius(next) {
      zoneRadius = next;
      resetDrawing();
    },
    setUtility(kind, role) {
      utilityKind = kind;
      utilityRole = role;
      resetDrawing();
    },
  };
}

function expandBounds(bounds: TerrainBounds, by: number): TerrainBounds {
  return { minX: bounds.minX - by, maxX: bounds.maxX + by, minZ: bounds.minZ - by, maxZ: bounds.maxZ + by };
}

export function brushMovedFarEnough(last: { x: number; z: number } | null, at: { x: number; z: number }, radius: number): boolean {
  return !last || Math.hypot(at.x - last.x, at.z - last.z) >= radius / 2;
}
