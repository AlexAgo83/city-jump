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
import { BuildingLifecycle, type SavedBuildingState } from "./buildingLifecycle";
import { CityEconomy, type CityResources, STARTING_MONEY, Treasury } from "./economy";
import { DEFAULT_TREE_SPECIES, Plantings, type Planting } from "./plantings";
import { Rubble, type SavedRubble } from "./rubble";
import { createRun, type RunState } from "./run";
import { Utilities, type SavedUtility } from "./utilities";
import { v3 } from "./vec";
import { Zones, type SavedZone } from "./zones";

export const SAVE_VERSION = 13;
const OFFSHORE_SCENERY_Z = 2000;

/** Tuples rather than objects: this lands in localStorage, and it is ~40% of the JSON. */
/**
 * The trailing flag marks a roundabout; absent means an ordinary node, which is what v3 had.
 * `lanes` only means anything alongside that flag, and is omitted rather than written as 1.
 */
export type SavedNode = [id: NodeId, x: number, y: number, z: number, roundabout?: 1, lanes?: 2];
export type SavedSegment = [a: NodeId, b: NodeId, cx: number, cy: number, cz: number, type: string, streetId?: number, elevated?: 0 | 1, utilities?: number];
/**
 * A hand-planted tree or a cleared spot. The species is optional so that saves written before
 * there was a choice still load; they were all firs.
 */
export type SavedPlanting = [x: number, z: number, species?: string];
export interface SavedCamera {
  readonly targetX: number;
  readonly targetY: number;
  readonly targetZ: number;
  readonly alpha: number;
  readonly beta: number;
  readonly radius: number;
}

export interface CitySave {
  readonly v: number;
  readonly terrain: string;
  readonly hour: number;
  readonly camera?: SavedCamera;
  readonly nodes: readonly SavedNode[];
  readonly segments: readonly SavedSegment[];
  readonly planted: readonly SavedPlanting[];
  readonly cleared: readonly SavedPlanting[];
  readonly zones: readonly SavedZone[];
  readonly rubble: readonly SavedRubble[];
  readonly buildingStates: readonly SavedBuildingState[];
  readonly money: number;
  readonly utilities?: readonly SavedUtility[];
  /** Absent on pre-resource saves; restore uses the bootstrap economy. */
  readonly resources?: CityResources;
  /** Absent on pre-run saves; restore starts at the first wave. */
  readonly run?: RunState;
}

export function serializeCity(graph: RoadGraph, plantings: Plantings, zones: Zones, terrain: string, hour: number, camera?: SavedCamera, rubble = new Rubble(), buildingLifecycle = new BuildingLifecycle(), treasury = new Treasury(), cityEconomy = new CityEconomy(), utilities = new Utilities(), run = createRun()): CitySave {
  return {
    v: SAVE_VERSION,
    terrain,
    hour,
    money: treasury.money,
    resources: cityEconomy.resources,
    run,
    ...(camera ? { camera } : {}),
    planted: plantings.plantedTrees.map((tree) => [tree.x, tree.z, tree.species]),
    cleared: plantings.clearedPoints.map((point) => [point.x, point.z]),
    zones: zones.toJSON(),
    rubble: rubble.toJSON(),
    buildingStates: buildingLifecycle.toJSON(),
    utilities: utilities.toJSON(),
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
      .filter((segment) => !isOffshoreSceneryRoad(graph, segment.a, segment.b))
      .map((segment): SavedSegment => {
        const base: SavedSegment = [segment.a, segment.b, segment.control.x, segment.control.y, segment.control.z, segment.type, segment.streetId];
        if (segment.elevated || segment.utilities) base.push(segment.elevated ? 1 : 0);
        if (segment.utilities) base.push(segment.utilities);
        return base;
      }),
  };
}

/**
 * Replays a save into `graph`, clearing whatever it held. Ids are remapped, because a graph that
 * has had segments removed no longer numbers its nodes from 1.
 * Throws on a segment the current rules reject, so a partially replayed city never passes silently.
 */
export function restoreCity(graph: RoadGraph, plantings: Plantings, zones: Zones, save: CitySave, rubble = new Rubble(), buildingLifecycle = new BuildingLifecycle(), treasury = new Treasury(), cityEconomy = new CityEconomy(), utilities = new Utilities()): void {
  replayCity(new RoadGraph(), new Plantings(), new Zones(), save, new Rubble(), new BuildingLifecycle(), new Treasury(), new CityEconomy(), new Utilities());
  replayCity(graph, plantings, zones, save, rubble, buildingLifecycle, treasury, cityEconomy, utilities);
}

function replayCity(graph: RoadGraph, plantings: Plantings, zones: Zones, save: CitySave, rubble: Rubble, buildingLifecycle = new BuildingLifecycle(), treasury = new Treasury(), cityEconomy = new CityEconomy(), utilities = new Utilities()): void {
  plantings.replaceWith(toPlantings(save.planted), toPlantings(save.cleared));
  zones.replaceWith(save.zones);
  rubble.replaceWith(save.rubble);
  buildingLifecycle.replaceWith(save.buildingStates);
  treasury.replaceWith(save.money);
  cityEconomy.replaceWith(save.resources);
  for (const segment of graph.allSegments()) graph.removeSegment(segment.id);
  const ids = new Map<NodeId, NodeId>();
  const roundabouts: { id: NodeId; lanes: 1 | 2 }[] = [];
  for (const [id, x, y, z, roundabout, lanes] of save.nodes) {
    const placed = graph.addNodeAt(v3(x, y, z));
    ids.set(id, placed);
    if (roundabout) roundabouts.push({ id: placed, lanes: lanes === 2 ? 2 : 1 });
  }
  for (const [a, b, cx, cy, cz, type, streetId, elevated, utilities] of save.segments) {
    const from = ids.get(a);
    const to = ids.get(b);
    if (from === undefined || to === undefined) throw new Error(`segment references a missing node (${a} -> ${b})`);
    if (elevated) graph.addElevatedSegment(from, to, v3(cx, cy, cz), type, streetId, utilities ?? 0);
    else graph.addSegment(from, to, v3(cx, cy, cz), type, streetId, utilities ?? 0);
  }
  // After the segments, since a roundabout is refused on a node with nothing meeting it yet.
  for (const node of roundabouts) graph.setRoundabout(node.id, true, node.lanes);
  utilities.replaceWith(save.utilities ?? [], graph);
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
  const money = value.money === undefined ? STARTING_MONEY : Number.isFinite(value.money) ? value.money as number : null;
  const resources = readResources(value.resources);
  if (money === null || resources === null) return null;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.segments)) return null;
  const planted = readPlantings(value.planted);
  const cleared = readPlantings(value.cleared);
  const zones = readZones(value.zones);
  const rubble = readRubble(value.rubble);
  const buildingStates = readBuildingStates(value.buildingStates);
  const utilities = readUtilities(value.utilities);
  const camera = readCamera(value.camera);
  if (planted === null || cleared === null || zones === null || rubble === null || buildingStates === null || utilities === null) return null;

  const nodes = value.nodes.filter(
    (node): node is SavedNode =>
      Array.isArray(node) && node.length >= 4 && node.length <= 6 && node.every(Number.isFinite),
  );
  const segments = value.segments.filter(
    (segment): segment is SavedSegment =>
      Array.isArray(segment) &&
      segment.length >= 6 &&
      segment.length <= 9 &&
      segment.slice(0, 5).every(Number.isFinite) &&
      typeof segment[5] === "string" &&
      (segment.length === 6 || Number.isFinite(segment[6])) &&
      (segment.length < 8 || segment[7] === 0 || segment[7] === 1) &&
      (segment.length < 9 || Number.isFinite(segment[8])),
  );
  if (nodes.length !== value.nodes.length || segments.length !== value.segments.length) return null;

  if (camera === null) return null;
  const run = readRun(value.run);
  if (run === null) return null;
  return { v: SAVE_VERSION, terrain: value.terrain, hour: value.hour as number, money, resources, run, nodes, segments, planted, cleared, zones, rubble, buildingStates, utilities, ...(camera ? { camera } : {}) };
}

function readRun(value: unknown): RunState | null {
  if (value === undefined) return createRun();
  if (!isRecord(value) || !Number.isFinite(value.wave) || !Number.isFinite(value.science)) return null;
  if (value.ended !== null && value.ended !== "evacuated" && value.ended !== "population_zero" && value.ended !== "defeated") return null;
  return { wave: value.wave as number, science: value.science as number, ended: value.ended };
}

function readResources(value: unknown): CityResources | null {
  if (value === undefined) return new CityEconomy().resources;
  if (!isRecord(value) || ![value.population, value.food, value.materials, value.services].every(Number.isFinite)) return null;
  return { population: value.population as number, food: value.food as number, materials: value.materials as number, services: value.services as number };
}

function isOffshoreSceneryRoad(graph: RoadGraph, a: NodeId, b: NodeId): boolean {
  return Math.max(graph.node(a).pos.z, graph.node(b).pos.z) > OFFSHORE_SCENERY_Z;
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
      ["residential", "commercial", "industrial", "agricultural", "military", "low", "dense"].includes(zone[2] as string),
  );
  return zones.length === value.length ? zones : null;
}

function readRubble(value: unknown): SavedRubble[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const rubble = value.filter(
    (point): point is SavedRubble =>
      Array.isArray(point) &&
      point.length === 2 &&
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1]),
  );
  return rubble.length === value.length ? rubble : null;
}

function readBuildingStates(value: unknown): SavedBuildingState[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const states = value.filter(
    (state): state is SavedBuildingState =>
      Array.isArray(state) &&
      state.length === 4 &&
      Number.isFinite(state[0]) &&
      Number.isFinite(state[1]) &&
      ["waiting", "rising", "working", "idle", "rebuilding"].includes(state[2] as string) &&
      Number.isFinite(state[3]),
  );
  return states.length === value.length ? states : null;
}

function readUtilities(value: unknown): SavedUtility[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const utilities = value.filter(
    (item): item is SavedUtility =>
      Array.isArray(item) &&
      (item.length === 4 || item.length === 5) &&
      (item[0] === "producer" || item[0] === "diffuser") &&
      (item[1] === "power" || item[1] === "water") &&
      Number.isFinite(item[2]) &&
      Number.isFinite(item[3]) &&
      (item.length === 4 || Number.isFinite(item[4])),
  );
  return utilities.length === value.length ? utilities : null;
}

function readCamera(value: unknown): SavedCamera | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const camera = value as Partial<SavedCamera>;
  return [camera.targetX, camera.targetY, camera.targetZ, camera.alpha, camera.beta, camera.radius].every(Number.isFinite)
    ? (camera as SavedCamera)
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
