import type { RoadGraph, SegmentId } from "./graph";
import { roadType } from "./roadTypes";
import { junctionRadius } from "./junction";
import { type Vec3, v3, normalizeXZ, perpXZ } from "./vec";
import { terrainHeight } from "./terrain";

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
  depth: 5,
  maxBlockSlots: 3,
  maxBlockTurn: Math.PI / 18,
} as const;

export interface BuildableCell {
  readonly segment: SegmentId;
  readonly side: -1 | 1;
  readonly row: number;
  readonly corners: readonly [Vec3, Vec3, Vec3, Vec3];
}

/**
 * Slots derived from the segment: evenly spaced by arc length, offset to the side,
 * turned to face the road. A building fronts a road by construction, so nothing here
 * has to resolve a collision or check that the plot has access.
 */
export function slotsForSegment(graph: RoadGraph, id: SegmentId): Slot[] {
  const seg = graph.segment(id);
  const half = roadType(seg.type).width / 2;
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
export function buildableCells(graph: RoadGraph): BuildableCell[] {
  const accepted: BuildableCell[] = [];
  const buckets = new Map<string, BuildableCell[]>();

  for (const segment of graph.allSegments()) {
    for (const block of slotBlocks(graph, segment.id)) {
      for (const candidate of cellsForBlock(block)) {
        if (cellTouchesOtherRoad(graph, candidate)) continue;
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

function cellTouchesOtherRoad(graph: RoadGraph, cell: BuildableCell): boolean {
  for (const seg of graph.allSegments()) {
    if (seg.id === cell.segment) continue;
    const reserve = roadType(seg.type).width / 2;
    if (seg.samples.some((p) => pointInCell(p, cell))) return true;
    if (cell.corners.some((p) => distanceToSamples(p, seg.samples) < reserve)) return true;
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

function distanceToSamples(p: Vec3, samples: readonly Vec3[]): number {
  let best = Infinity;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lenSq = dx * dx + dz * dz;
    const t = lenSq ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.z - a.z) * dz) / lenSq)) : 0;
    best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t)));
  }
  return best;
}

function cellsForBlock(block: Slot[]): BuildableCell[] {
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
    for (let along = -width / 2; along < width / 2; along += GRID.cellSize) {
      cells.push({
        segment: block[0]!.segment,
        side: block[0]!.side,
        row,
        corners: [
          point(along, row * GRID.cellSize),
          point(along + GRID.cellSize, row * GRID.cellSize),
          point(along + GRID.cellSize, (row + 1) * GRID.cellSize),
          point(along, (row + 1) * GRID.cellSize),
        ],
      });
    }
  }
  return cells;
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
