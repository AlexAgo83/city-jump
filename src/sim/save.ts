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
import { DEFAULT_TREE_SPECIES, Plantings, type Planting } from "./plantings";
import { v3 } from "./vec";
import { Zones, type SavedZone } from "./zones";

export const SAVE_VERSION = 5;

/** Tuples rather than objects: this lands in localStorage, and it is ~40% of the JSON. */
/**
 * The trailing flag marks a roundabout; absent means an ordinary node, which is what v3 had.
 * `lanes` only means anything alongside that flag, and is omitted rather than written as 1.
 */
export type SavedNode = [id: NodeId, x: number, y: number, z: number, roundabout?: 1, lanes?: 2];
export type SavedSegment = [a: NodeId, b: NodeId, cx: number, cy: number, cz: number, type: string];
/**
 * A hand-planted tree or a cleared spot. The species is optional so that saves written before
 * there was a choice still load; they were all firs.
 */
export type SavedPlanting = [x: number, z: number, species?: string];

export interface CitySave {
  readonly v: number;
  readonly terrain: string;
  readonly hour: number;
  readonly nodes: readonly SavedNode[];
  readonly segments: readonly SavedSegment[];
  readonly planted: readonly SavedPlanting[];
  readonly cleared: readonly SavedPlanting[];
  readonly zones: readonly SavedZone[];
}

export function serializeCity(graph: RoadGraph, plantings: Plantings, zones: Zones, terrain: string, hour: number): CitySave {
  return {
    v: SAVE_VERSION,
    terrain,
    hour,
    planted: plantings.plantedTrees.map((tree) => [tree.x, tree.z, tree.species]),
    cleared: plantings.clearedPoints.map((point) => [point.x, point.z]),
    zones: zones.toJSON(),
    nodes: graph
      .allNodes()
      .map((node) =>
        node.roundabout
          ? node.roundaboutLanes === 2
            ? [node.id, node.pos.x, node.pos.y, node.pos.z, 1, 2]
            : [node.id, node.pos.x, node.pos.y, node.pos.z, 1]
          : [node.id, node.pos.x, node.pos.y, node.pos.z],
      ),
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
export function restoreCity(graph: RoadGraph, plantings: Plantings, zones: Zones, save: CitySave): void {
  replayCity(new RoadGraph(), new Plantings(), new Zones(), save);
  replayCity(graph, plantings, zones, save);
}

function replayCity(graph: RoadGraph, plantings: Plantings, zones: Zones, save: CitySave): void {
  plantings.replaceWith(toPlantings(save.planted), toPlantings(save.cleared));
  zones.replaceWith(save.zones);
  for (const segment of graph.allSegments()) graph.removeSegment(segment.id);
  const ids = new Map<NodeId, NodeId>();
  const roundabouts: { id: NodeId; lanes: 1 | 2 }[] = [];
  for (const [id, x, y, z, roundabout, lanes] of save.nodes) {
    const placed = graph.addNodeAt(v3(x, y, z));
    ids.set(id, placed);
    if (roundabout) roundabouts.push({ id: placed, lanes: lanes === 2 ? 2 : 1 });
  }
  for (const [a, b, cx, cy, cz, type] of save.segments) {
    const from = ids.get(a);
    const to = ids.get(b);
    if (from === undefined || to === undefined) throw new Error(`segment references a missing node (${a} -> ${b})`);
    graph.addSegment(from, to, v3(cx, cy, cz), type);
  }
  // After the segments, since a roundabout is refused on a node with nothing meeting it yet.
  for (const node of roundabouts) graph.setRoundabout(node.id, true, node.lanes);
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
  const zones = readZones(value.zones);
  if (planted === null || cleared === null || zones === null) return null;

  const nodes = value.nodes.filter(
    (node): node is SavedNode =>
      Array.isArray(node) && node.length >= 4 && node.length <= 6 && node.every(Number.isFinite),
  );
  const segments = value.segments.filter(
    (segment): segment is SavedSegment =>
      Array.isArray(segment) &&
      segment.length === 6 &&
      segment.slice(0, 5).every(Number.isFinite) &&
      typeof segment[5] === "string",
  );
  if (nodes.length !== value.nodes.length || segments.length !== value.segments.length) return null;

  return { v: SAVE_VERSION, terrain: value.terrain, hour: value.hour as number, nodes, segments, planted, cleared, zones };
}

function toPlantings(points: readonly SavedPlanting[]): Planting[] {
  return points.map(([x, z, species]) => ({ x, z, species: species ?? DEFAULT_TREE_SPECIES }));
}

/** Absent is fine and means none; present but malformed is not. */
function readPlantings(value: unknown): SavedPlanting[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const points = value.filter(
    (point): point is SavedPlanting =>
      Array.isArray(point) &&
      (point.length === 2 || (point.length === 3 && typeof point[2] === "string")) &&
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1]),
  );
  return points.length === value.length ? points : null;
}

function readZones(value: unknown): SavedZone[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const zones = value.filter(
    (zone): zone is SavedZone =>
      Array.isArray(zone) &&
      zone.length === 3 &&
      Number.isFinite(zone[0]) &&
      Number.isFinite(zone[1]) &&
      (zone[2] === "low" || zone[2] === "dense"),
  );
  return zones.length === value.length ? zones : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
