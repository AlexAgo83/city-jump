import type { RoadGraph, SegmentId } from "./graph";
import { roadType } from "./roadTypes";
import { junctionRadius } from "./junction";
import { type Vec3, v3, normalizeXZ, perpXZ, distXZ } from "./vec";
import { terrainHeight } from "./terrain";
import type { ZoneKind, Zones } from "./zones";

export interface Slot {
  readonly segment: SegmentId;
  /** Ground position of the slot's frontage centre. */
  readonly position: Vec3;
  /** Yaw, in radians, that turns the model's front to face the road. */
  readonly rotationY: number;
  /** -1 for the right-hand side of the segment, +1 for the left. */
  readonly side: -1 | 1;
  /** Frontage width available, so a model wider than this is not put here. */
  readonly frontage: number;
}

export const SLOT = {
  /** Frontage each building occupies along the road. */
  spacing: 16,
  /** Gap between the kerb and the building line. */
  setback: 5,
} as const;

export const GRID = {
  cellSize: SLOT.spacing / 2,
  depth: 4,
  maxBlockSlots: 3,
  maxBlockTurn: Math.PI / 18,
} as const;

export interface BuildableCell {
  /** Set on cells fronting a pedestrian path, which only carries low buildings. */
  readonly lowRise: boolean;
  readonly segment: SegmentId;
  readonly side: -1 | 1;
  readonly block: number;
  readonly column: number;
  readonly row: number;
  readonly rotationY: number;
  readonly corners: readonly [Vec3, Vec3, Vec3, Vec3];
  readonly zone?: ZoneKind;
}

export interface BuildingParcel {
  readonly position: Vec3;
  readonly rotationY: number;
  readonly frontageCells: number;
  readonly depthCells: number;
  /** The buildable cells this parcel consumed, so the grid can highlight them as taken. */
  readonly cells: readonly BuildableCell[];
}

export const PARCEL_SIZES = Array.from({ length: 4 }, (_, frontage) =>
  Array.from({ length: 4 }, (_, depth) => ({ frontageCells: frontage + 1, depthCells: depth + 1 })),
).flat();

/**
 * Parcel sizes whose building model is short. A parcel picks its model by size, and model height
 * does NOT follow parcel area -- 1x1 is 9.5m while 4x2 is 28m and 4x4 only 14m -- so a low-rise
 * street has to name the sizes rather than cap the dimensions.
 *
 * Measured from the loaded models; if a model is reshaped, re-measure with the bounding box of
 * each `building_lot_*` mesh and update this list. Everything here is 14m or under.
 */
export const LOW_RISE_SIZES = new Set(["1x1", "2x2", "1x3", "4x1", "4x4", "3x3"]);
export const DENSE_SIZES = new Set(["2x3", "2x4", "3x2", "3x4", "4x2", "4x3"]);

const sizeKey = (frontageCells: number, depthCells: number): string => `${frontageCells}x${depthCells}`;

/**
 * Slots derived from the segment: evenly spaced by arc length, offset to the side,
 * turned to face the road. A building fronts a road by construction, so nothing here
 * has to resolve a collision or check that the plot has access.
 */
export function slotsForSegment(graph: RoadGraph, id: SegmentId): Slot[] {
  const seg = graph.segment(id);
  const type = roadType(seg.type);
  // No frontage on a highway: nothing gets to build against a road with guardrails, not sidewalks.
  if (type.tunnelDepth || type.highway) return [];
  const half = type.width / 2;
  const offset = half + SLOT.setback;

  // Keep clear of whatever covers each end, so no building lands in a junction.
  const clearStart = clearance(graph, seg.a);
  const clearEnd = clearance(graph, seg.b);
  const usable = seg.length - clearStart - clearEnd;
  if (usable < SLOT.spacing) return [];

  // Centre the run of slots in the space that is left.
  const count = Math.floor(usable / SLOT.spacing);
  const margin = clearStart + (usable - count * SLOT.spacing) / 2;

  const slots: Slot[] = [];
  for (let i = 0; i < count; i++) {
    const d = margin + (i + 0.5) * SLOT.spacing;
    const { position, tangent } = graph.pointAt(id, d);
    const normal = normalizeXZ(perpXZ(tangent));
    for (const side of [1, -1] as const) {
      const n = v3(normal.x * side, 0, normal.z * side);
      slots.push({
        segment: id,
        position: v3(position.x + n.x * offset, position.y, position.z + n.z * offset),
        // The model faces +Z; turn that to point back at the road, against the offset.
        rotationY: Math.atan2(-n.x, -n.z),
        side,
        frontage: SLOT.spacing,
      });
    }
  }
  return slots;
}

export function allSlots(graph: RoadGraph): Slot[] {
  return graph.allSegments().flatMap((seg) => slotsForSegment(graph, seg.id));
}

/** Buildable cells in road creation order; an older cell wins any overlap. */
export function buildableCells(graph: RoadGraph, zones?: Zones): BuildableCell[] {
  const accepted: BuildableCell[] = [];
  const buckets = new Map<string, BuildableCell[]>();
  const roads = indexRoadSamples(graph);

  for (const segment of graph.allSegments()) {
    const lowRise = roadType(segment.type).pedestrian === true;
    for (const [blockIndex, block] of slotBlocks(graph, segment.id).entries()) {
      for (const candidate of cellsForBlock(block, blockIndex, lowRise, zones)) {
        if (cellTouchesOtherRoad(roads, candidate)) continue;
        const keys = bucketKeys(candidate);
        const nearby = new Set(keys.flatMap((key) => buckets.get(key) ?? []));
        if ([...nearby].some((cell) => cellsOverlap(candidate, cell))) continue;
        accepted.push(candidate);
        for (const key of keys) {
          const bucket = buckets.get(key) ?? [];
          bucket.push(candidate);
          buckets.set(key, bucket);
        }
      }
    }
  }
  return accepted;
}

/** Packs the roadside cells into a stable random mix of rectangular 1x1 to 4x4 parcels. */
export function buildingParcels(cells: readonly BuildableCell[], zones?: Zones): BuildingParcel[] {
  const groups = new Map<string, BuildableCell[]>();
  for (const cell of cells) {
    const key = `${cell.segment}:${cell.side}:${cell.block}`;
    const group = groups.get(key) ?? [];
    group.push(cell);
    groups.set(key, group);
  }

  const parcels: BuildingParcel[] = [];
  for (const group of groups.values()) {
    const free = new Map(group.map((cell) => [`${cell.column}:${cell.row}`, cell]));
    const first = group[0]!;
    const random = seededRandom(`${first.corners[0].x.toFixed(2)}:${first.corners[0].z.toFixed(2)}`);
    const roadside = group.filter((cell) => cell.row === 0).sort((a, b) => a.column - b.column);

    for (const origin of roadside) {
      if (!free.has(`${origin.column}:${origin.row}`)) continue;
      const allowed = allowedSizes(origin.zone ?? zoneForCell(zones, origin), first.lowRise);
      const size = shuffled(allowed, random).find(({ frontageCells, depthCells }) =>
        rectangle(origin, frontageCells, depthCells).every(([column, row]) => free.has(`${column}:${row}`)),
      ) ?? PARCEL_SIZES.find(({ frontageCells, depthCells }) =>
        rectangle(origin, frontageCells, depthCells).every(([column, row]) => free.has(`${column}:${row}`)),
      )!; // 1x1 always fits the free origin
      const occupied = rectangle(origin, size.frontageCells, size.depthCells).map(([column, row]) => free.get(`${column}:${row}`)!);
      for (const cell of occupied) free.delete(`${cell.column}:${cell.row}`);

      const frontRight = occupied.find(
        (cell) => cell.row === origin.row && cell.column === origin.column + size.frontageCells - 1,
      )!;
      parcels.push({
        position: v3(
          (origin.corners[0].x + frontRight.corners[1].x) / 2,
          (origin.corners[0].y + frontRight.corners[1].y) / 2,
          (origin.corners[0].z + frontRight.corners[1].z) / 2,
        ),
        rotationY: origin.rotationY,
        ...size,
        cells: occupied,
      });
    }
  }
  return parcels;
}

export function buildableCellCentre(cell: Pick<BuildableCell, "corners">): { x: number; z: number } {
  return {
    x: cell.corners.reduce((sum, p) => sum + p.x, 0) / 4,
    z: cell.corners.reduce((sum, p) => sum + p.z, 0) / 4,
  };
}

function allowedSizes(zone: ZoneKind | undefined, lowRise: boolean): typeof PARCEL_SIZES {
  if (zone === "dense") return PARCEL_SIZES.filter(({ frontageCells, depthCells }) => DENSE_SIZES.has(sizeKey(frontageCells, depthCells)));
  if (zone === "low" || lowRise) return PARCEL_SIZES.filter(({ frontageCells, depthCells }) => LOW_RISE_SIZES.has(sizeKey(frontageCells, depthCells)));
  return PARCEL_SIZES;
}

function zoneForCell(zones: Zones | undefined, cell: BuildableCell): ZoneKind | undefined {
  if (!zones) return undefined;
  // Reached when cells were built without zones, then packed with zones.
  const { x, z } = buildableCellCentre(cell);
  return zones.at(x, z);
}

export function cellsOverlap(a: BuildableCell, b: BuildableCell): boolean {
  for (const corners of [a.corners, b.corners]) {
    for (let i = 0; i < 4; i++) {
      const p = corners[i]!;
      const q = corners[(i + 1) % 4]!;
      const axisX = -(q.z - p.z);
      const axisZ = q.x - p.x;
      const project = (cell: BuildableCell) => cell.corners.map((c) => c.x * axisX + c.z * axisZ);
      const pa = project(a);
      const pb = project(b);
      if (Math.max(...pa) <= Math.min(...pb) + 1e-6 || Math.max(...pb) <= Math.min(...pa) + 1e-6) {
        return false;
      }
    }
  }
  return true;
}

/**
 * One road sample, with the segment it belongs to and that road's half width.
 * Testing a cell used to walk every segment's every sample, so the cost was
 * cells x segments x samples -- tens of millions of distance tests on a modest city, and the
 * single biggest cost in a rebuild. The samples go into a grid instead, so a cell only ever looks
 * at the handful of buckets it overlaps.
 * ponytail: a Map keyed by grid square, not an R-tree. Roads are already roughly uniform.
 */
interface RoadSample {
  readonly point: Vec3;
  readonly segment: number;
  readonly reserve: number;
}

/** Bucket size: a cell's own reach plus the widest reserve, so neighbours never need a wider scan. */
const ROAD_INDEX_CELL = 24;

function indexRoadSamples(graph: RoadGraph): Map<string, RoadSample[]> {
  const index = new Map<string, RoadSample[]>();
  for (const seg of graph.allSegments()) {
    const type = roadType(seg.type);
    if (type.tunnelDepth) continue;
    const reserve = type.width / 2;
    for (const point of seg.samples) {
      const key = `${Math.floor(point.x / ROAD_INDEX_CELL)},${Math.floor(point.z / ROAD_INDEX_CELL)}`;
      const bucket = index.get(key);
      if (bucket) bucket.push({ point, segment: seg.id, reserve });
      else index.set(key, [{ point, segment: seg.id, reserve }]);
    }
  }
  return index;
}

function cellTouchesOtherRoad(roads: Map<string, RoadSample[]>, cell: BuildableCell): boolean {
  const xs = cell.corners.map((p) => p.x);
  const zs = cell.corners.map((p) => p.z);
  // Widen by the largest reserve, so a sample just outside the cell that still reserves into it
  // lands in a bucket we look at.
  const pad = ROAD_INDEX_CELL;
  const x0 = Math.floor((Math.min(...xs) - pad) / ROAD_INDEX_CELL);
  const x1 = Math.floor((Math.max(...xs) + pad) / ROAD_INDEX_CELL);
  const z0 = Math.floor((Math.min(...zs) - pad) / ROAD_INDEX_CELL);
  const z1 = Math.floor((Math.max(...zs) + pad) / ROAD_INDEX_CELL);

  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      for (const sample of roads.get(`${x},${z}`) ?? []) {
        if (sample.segment === cell.segment) continue;
        if (pointInCell(sample.point, cell)) return true;
        // Distance to the nearest sample rather than to the polyline between samples. Samples sit
        // about a metre apart, so this can under-reserve by at most half that against a reserve
        // several metres wide.
        if (cell.corners.some((corner) => distXZ(corner, sample.point) < sample.reserve)) return true;
      }
    }
  }
  return false;
}

function pointInCell(p: Vec3, cell: BuildableCell): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = cell.corners[i]!;
    const b = cell.corners[(i + 1) % 4]!;
    const cross = (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
    if (Math.abs(cross) < 1e-6) continue;
    const next = Math.sign(cross);
    if (sign && next !== sign) return false;
    sign = next;
  }
  return true;
}


function cellsForBlock(block: Slot[], blockIndex: number, lowRise: boolean, zones?: Zones): BuildableCell[] {
  const rotationY = averageRotation(block);
  const alongX = Math.cos(rotationY);
  const alongZ = -Math.sin(rotationY);
  const outX = -Math.sin(rotationY);
  const outZ = -Math.cos(rotationY);
  const originX = block.reduce((sum, slot) => sum + slot.position.x, 0) / block.length;
  const originZ = block.reduce((sum, slot) => sum + slot.position.z, 0) / block.length;
  const width = block.length * SLOT.spacing;
  const point = (along: number, out: number) => {
    const x = originX + alongX * along + outX * out;
    const z = originZ + alongZ * along + outZ * out;
    return v3(x, terrainHeight(x, z), z);
  };
  const cells: BuildableCell[] = [];
  for (let row = 0; row < GRID.depth; row++) {
    let column = 0;
    for (let along = -width / 2; along < width / 2; along += GRID.cellSize) {
      const corners = [
        point(along, row * GRID.cellSize),
        point(along + GRID.cellSize, row * GRID.cellSize),
        point(along + GRID.cellSize, (row + 1) * GRID.cellSize),
        point(along, (row + 1) * GRID.cellSize),
      ] as const;
      const centre = buildableCellCentre({ corners });
      cells.push({
        lowRise,
        segment: block[0]!.segment,
        side: block[0]!.side,
        block: blockIndex,
        column: column++,
        row,
        rotationY,
        corners,
        zone: zones?.at(centre.x, centre.z),
      });
    }
  }
  return cells;
}

function rectangle(origin: BuildableCell, width: number, depth: number): [number, number][] {
  return Array.from({ length: width * depth }, (_, i) => [
    origin.column + (i % width),
    origin.row + Math.floor(i / width),
  ]);
}

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function seededRandom(text: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < text.length; i++) state = Math.imul(state ^ text.charCodeAt(i), 16777619);
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function slotBlocks(graph: RoadGraph, segment: SegmentId): Slot[][] {
  const blocks: Slot[][] = [];
  const slots = slotsForSegment(graph, segment);
  for (const side of [1, -1] as const) {
    let block: Slot[] = [];
    for (const slot of slots.filter((candidate) => candidate.side === side)) {
      const turn = block.length ? angleDifference(slot.rotationY, averageRotation(block)) : 0;
      if (block.length >= GRID.maxBlockSlots || turn > GRID.maxBlockTurn) {
        blocks.push(block);
        block = [];
      }
      block.push(slot);
    }
    if (block.length) blocks.push(block);
  }
  return blocks;
}

function averageRotation(slots: Slot[]): number {
  return Math.atan2(
    slots.reduce((sum, slot) => sum + Math.sin(slot.rotationY), 0),
    slots.reduce((sum, slot) => sum + Math.cos(slot.rotationY), 0),
  );
}

function angleDifference(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function bucketKeys(cell: BuildableCell): string[] {
  const xs = cell.corners.map((p) => p.x);
  const zs = cell.corners.map((p) => p.z);
  const keys: string[] = [];
  for (let x = Math.floor(Math.min(...xs) / GRID.cellSize); x <= Math.floor(Math.max(...xs) / GRID.cellSize); x++) {
    for (let z = Math.floor(Math.min(...zs) / GRID.cellSize); z <= Math.floor(Math.max(...zs) / GRID.cellSize); z++) {
      keys.push(`${x},${z}`);
    }
  }
  return keys;
}

/** How far from a node the frontage has to start. A junction needs its whole radius. */
function clearance(graph: RoadGraph, nodeId: number): number {
  const node = graph.node(nodeId);
  if (node.segments.size < 2) return SLOT.spacing / 2;
  return junctionRadius(graph, nodeId) + SLOT.spacing / 2;
}
