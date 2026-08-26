import type { RoadGraph, SegmentId } from "./graph";
import { roadType } from "./roadTypes";
import { junctionRadius } from "./junction";
import { type Vec3, v3, normalizeXZ, perpXZ } from "./vec";

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

/** How far from a node the frontage has to start. A junction needs its whole radius. */
function clearance(graph: RoadGraph, nodeId: number): number {
  const node = graph.node(nodeId);
  if (node.segments.size < 2) return SLOT.spacing / 2;
  return junctionRadius(graph, nodeId) + SLOT.spacing / 2;
}
