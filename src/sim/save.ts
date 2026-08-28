/**
 * Turning a city into plain data and back. Only what cannot be recomputed is stored: a segment's
 * `samples`, `ts`, `cumulative` and `length` all come back out of `buildSamples`, so persisting
 * them would multiply the payload ~20x and force a migration every time the curve maths changes.
 *
 * Node elevations ARE stored. During play each road is drawn onto a terrain already conformed to
 * the roads before it, so replaying onto pristine terrain would put the junctions at different
 * heights. Storing them makes a reload deterministic and idempotent: save -> load -> save is a
 * fixed point. Only the heights *between* two nodes can differ slightly from the original session,
 * and `conformToRoads` reshapes the ground under them anyway.
 */
import { RoadGraph, type NodeId } from "./graph";
import type { Planting, Plantings } from "./plantings";
import { v3 } from "./vec";

export const SAVE_VERSION = 2;

/** Tuples rather than objects: this lands in localStorage, and it is ~40% of the JSON. */
export type SavedNode = [id: NodeId, x: number, y: number, z: number];
export type SavedSegment = [a: NodeId, b: NodeId, cx: number, cy: number, cz: number, type: string];
/** A hand-planted tree or a cleared spot: ground position only, the rest is generated. */
export type SavedPlanting = [x: number, z: number];

export interface CitySave {
  readonly v: number;
  readonly terrain: string;
  readonly hour: number;
  readonly nodes: readonly SavedNode[];
  readonly segments: readonly SavedSegment[];
  readonly planted: readonly SavedPlanting[];
  readonly cleared: readonly SavedPlanting[];
}

export function serializeCity(graph: RoadGraph, plantings: Plantings, terrain: string, hour: number): CitySave {
  return {
    v: SAVE_VERSION,
    terrain,
    hour,
    planted: plantings.plantedTrees.map((tree) => [tree.x, tree.z]),
    cleared: plantings.clearedPoints.map((point) => [point.x, point.z]),
    nodes: graph.allNodes().map((node) => [node.id, node.pos.x, node.pos.y, node.pos.z]),
    segments: graph
      .allSegments()
      .map((segment) => [segment.a, segment.b, segment.control.x, segment.control.y, segment.control.z, segment.type]),
  };
}

/**
 * Replays a save into `graph`, clearing whatever it held. Ids are remapped, because a graph that
 * has had segments removed no longer numbers its nodes from 1.
 * Throws on a segment the current rules reject, so a partially replayed city never passes silently.
 */
export function restoreCity(graph: RoadGraph, plantings: Plantings, save: CitySave): void {
  plantings.replaceWith(toPlantings(save.planted), toPlantings(save.cleared));
  for (const segment of graph.allSegments()) graph.removeSegment(segment.id);
  const ids = new Map<NodeId, NodeId>();
  for (const [id, x, y, z] of save.nodes) ids.set(id, graph.addNodeAt(v3(x, y, z)));
  for (const [a, b, cx, cy, cz, type] of save.segments) {
    const from = ids.get(a);
    const to = ids.get(b);
    if (from === undefined || to === undefined) throw new Error(`segment references a missing node (${a} -> ${b})`);
    graph.addSegment(from, to, v3(cx, cy, cz), type);
  }
}

/**
 * Validates untrusted text into a save. localStorage is editable by anyone at the console, so a
 * malformed city has to be refused here rather than crash the replay half way through.
 */
export function parseCity(text: string): CitySave | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  // Any version up to the current one is readable: the fields added since are all optional and
  // default to empty, so an older city loads as itself. Only a save from a NEWER build is refused,
  // because that one may carry state this build would silently drop.
  if (!isRecord(value) || typeof value.v !== "number" || value.v < 1 || value.v > SAVE_VERSION) return null;
  if (typeof value.terrain !== "string" || !Number.isFinite(value.hour)) return null;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.segments)) return null;
  const planted = readPlantings(value.planted);
  const cleared = readPlantings(value.cleared);
  if (planted === null || cleared === null) return null;

  const nodes = value.nodes.filter(
    (node): node is SavedNode => Array.isArray(node) && node.length === 4 && node.every(Number.isFinite),
  );
  const segments = value.segments.filter(
    (segment): segment is SavedSegment =>
      Array.isArray(segment) &&
      segment.length === 6 &&
      segment.slice(0, 5).every(Number.isFinite) &&
      typeof segment[5] === "string",
  );
  if (nodes.length !== value.nodes.length || segments.length !== value.segments.length) return null;

  return { v: SAVE_VERSION, terrain: value.terrain, hour: value.hour as number, nodes, segments, planted, cleared };
}

function toPlantings(points: readonly SavedPlanting[]): Planting[] {
  return points.map(([x, z]) => ({ x, z }));
}

/** Absent is fine and means none; present but malformed is not. */
function readPlantings(value: unknown): SavedPlanting[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const points = value.filter(
    (point): point is SavedPlanting => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite),
  );
  return points.length === value.length ? points : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
