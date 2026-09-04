import type { RoadGraph, Segment } from "../sim/graph";
import type { TerrainBounds } from "../sim/heightmap";
import type { Snap } from "../sim/rules";
import { commitSegment, quadraticLengthXZ, resolveSnap, validateSegment } from "../sim/rules";
import { roundaboutRadius } from "../sim/junction";
import { demolitionRefund } from "../sim/economy";
import { roadType } from "../sim/roadTypes";
import { v3, type Vec3 } from "../sim/vec";
import type { RoadTypeId, DrawController } from "../render/drawTool";
import type { DebugRoadController } from "../render/debugApi";

type Controller = DrawController & DebugRoadController;
const ROAD_DIRTY_PAD = 140;
const NODE_REACH = 22;
const BRIDGE_NODE_REACH = 60;

interface DrawControllerOptions {
  roadCost(type: RoadTypeId, metres: number): number;
  spend(cost: number, allowDebt?: boolean): boolean;
  refund(amount: number): void;
  onCommitted(dirty?: TerrainBounds): void;
}

export function createDrawController(graph: RoadGraph, options: DrawControllerOptions): Controller {
  return {
    resolveSnap(x: number, z: number, gridSnap: boolean) {
      const snap = resolveSnap(graph, x, z, gridSnap);
      if (snap.kind !== "free") return snap;
      return nearestElevatedEndpoint(graph, x, z) ?? snap;
    },
    previewRoad(from: Snap, to: Snap, control: Vec3, type: RoadTypeId) {
      const elevated = touchesElevated(graph, from) || touchesElevated(graph, to);
      const points = sampleQuadratic(from.position, control, to.position, 32, graph.heightAt);
      return { points, ok: validateSegment(from.position, control, to.position, type, elevated, graph.heightAt).ok };
    },
    junctionNodeAt: (x: number, z: number) => nearestJunctionNode(graph, x, z),
    roundaboutEnabled: (node: number) => graph.node(node).roundabout,
    roundaboutAt(x: number, z: number) {
      for (const node of graph.allNodes()) {
        if (!node.roundabout) continue;
        const radius = roundaboutRadius(graph, node.id);
        if (Math.hypot(node.pos.x - x, node.pos.z - z) <= radius) {
          return { kind: "roundabout", node: node.id, x: node.pos.x, z: node.pos.z, radius, lanes: node.roundaboutLanes };
        }
      }
      return null;
    },
    nearestRoad: (x: number, z: number, reach: number) => graph.nearestOnSegment(x, z, reach),
    roadAt(x: number, z: number) {
      const nearest = graph.nearestOnSegment(x, z, 20);
      if (!nearest) return null;
      const hit = Math.hypot(x - nearest.position.x, z - nearest.position.z);
      return hit <= roadType(nearest.segment.type).width / 2 + 3 ? nearest.segment : null;
    },
    addRoad(x0: number, z0: number, cx: number, cz: number, x1: number, z1: number, type: string) {
      return commitSegment(graph, resolveSnap(graph, x0, z0), resolveSnap(graph, x1, z1), v3(cx, 0, cz), type);
    },
    clearRoads() {
      for (const segment of graph.allSegments()) graph.removeSegment(segment.id);
    },
    commitRoad(from: Snap, to: Snap, control: Vec3, type: RoadTypeId, effects = true) {
      const cost = options.roadCost(type, quadraticLengthXZ(from.position, control, to.position));
      const result = commitSegment(graph, from, to, control, type);
      if (!result.ok) return result;
      if (effects) {
        if (cost > 0) options.spend(cost, true);
        options.onCommitted(expandBounds(boundsOf(sampleQuadratic(from.position, control, to.position, 32, graph.heightAt)), ROAD_DIRTY_PAD));
      }
      return { ok: true };
    },
    removeRoad(segment: Segment, effects = true) {
      const refund = demolitionRefund(options.roadCost(segment.type, segment.length));
      graph.removeSegment(segment.id);
      if (effects) {
        if (refund > 0) options.refund(refund);
        options.onCommitted(expandBounds(boundsOf(segment.samples), ROAD_DIRTY_PAD));
      }
      return true;
    },
    setRoundabout(node: number, enabled: boolean, lanes?: 1 | 2) {
      const pos = graph.node(node).pos;
      const radius = roundaboutRadius(graph, node) + ROAD_DIRTY_PAD;
      graph.setRoundabout(node, enabled, lanes);
      options.onCommitted({ minX: pos.x - radius, maxX: pos.x + radius, minZ: pos.z - radius, maxZ: pos.z + radius });
      return true;
    },
  };
}

function expandBounds(bounds: TerrainBounds, by: number): TerrainBounds {
  return { minX: bounds.minX - by, maxX: bounds.maxX + by, minZ: bounds.minZ - by, maxZ: bounds.maxZ + by };
}

function boundsOf(points: readonly Vec3[]): TerrainBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX, maxX, minZ, maxZ };
}

function nearestElevatedEndpoint(graph: RoadGraph, x: number, z: number): Snap | null {
  let best: Snap | null = null;
  let bestDistance = BRIDGE_NODE_REACH;
  for (const node of graph.allNodes()) {
    if (![...node.segments].some((id) => graph.segment(id).elevated)) continue;
    const distance = Math.hypot(node.pos.x - x, node.pos.z - z);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { kind: "node", nodeId: node.id, position: node.pos };
    }
  }
  return best;
}

function touchesElevated(graph: RoadGraph, snap: Snap): boolean {
  if (snap.kind === "segment") return !!graph.segment(snap.segmentId).elevated;
  if (snap.kind !== "node") return false;
  return [...graph.node(snap.nodeId).segments].some((id) => graph.segment(id).elevated);
}

function nearestJunctionNode(graph: RoadGraph, x: number, z: number): number | null {
  let best: number | null = null;
  let bestDistance = NODE_REACH;
  for (const node of graph.allNodes()) {
    if (node.segments.size < 2) continue;
    const distance = Math.hypot(node.pos.x - x, node.pos.z - z);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = node.id;
    }
  }
  return best;
}

export function sampleQuadratic(a: Vec3, c: Vec3, b: Vec3, steps: number, heightAt: (x: number, z: number) => number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = a.x * u * u + c.x * 2 * u * t + b.x * t * t;
    const z = a.z * u * u + c.z * 2 * u * t + b.z * t * t;
    out.push(v3(x, heightAt(x, z), z));
  }
  return out;
}
