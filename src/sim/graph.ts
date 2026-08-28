import { type Vec3, v3, lerp, distXZ, normalizeXZ, sub } from "./vec";
import { terrainHeight } from "./terrain";
import { DEFAULT_ROAD_TYPE, roadType } from "./roadTypes";

export type NodeId = number;
export type SegmentId = number;

export interface RoadNode {
  readonly id: NodeId;
  readonly pos: Vec3;
  /** Segments incident to this node. Three or more makes it a junction. */
  readonly segments: Set<SegmentId>;
}

export interface Segment {
  readonly id: SegmentId;
  readonly a: NodeId;
  readonly b: NodeId;
  /** The single control point of the quadratic Bezier. */
  readonly control: Vec3;
  readonly type: string;
  /** Polyline sample of the curve, roughly one point per metre. */
  readonly samples: readonly Vec3[];
  /** Curve parameter of each sample, so a distance can be turned back into a `t`. */
  readonly ts: readonly number[];
  /** Cumulative ground distance at each sample; last entry is the segment length. */
  readonly cumulative: readonly number[];
  readonly length: number;
}

export interface PointOnSegment {
  readonly position: Vec3;
  /** Unit direction along the road, in the a -> b sense. */
  readonly tangent: Vec3;
}

/** Point of a quadratic Bezier in the ground plane; elevation is handled separately. */
function bezierXZ(a: Vec3, c: Vec3, b: Vec3, t: number): Vec3 {
  const u = 1 - t;
  const w0 = u * u;
  const w1 = 2 * u * t;
  const w2 = t * t;
  return v3(a.x * w0 + c.x * w1 + b.x * w2, 0, a.z * w0 + c.z * w1 + b.z * w2);
}

const SAMPLE_SPACING_M = 1;
const MIN_SAMPLES = 8;
const MAX_SAMPLES = 512;

/**
 * Samples the curve and builds its cumulative-distance table. Elevation follows the
 * terrain at each sample, with one tiny smoothing pass so rugged ground is driveable.
 * ponytail: two passes (shape, then elevation) rather than solving arc length in closed
 * form -- the table is what every consumer wants anyway.
 */
function buildSamples(a: Vec3, control: Vec3, b: Vec3, type = DEFAULT_ROAD_TYPE) {
  const spec = roadType(type);
  const chord = distXZ(a, b) + distXZ(a, control) + distXZ(control, b);
  const count = Math.min(MAX_SAMPLES, Math.max(MIN_SAMPLES, Math.ceil(chord / 2 / SAMPLE_SPACING_M)));

  const flat: Vec3[] = [];
  const ts: number[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    ts.push(t);
    flat.push(bezierXZ(a, control, b, t));
  }

  const cumulative: number[] = [0];
  for (let i = 1; i < flat.length; i++) {
    cumulative.push(cumulative[i - 1]! + distXZ(flat[i - 1]!, flat[i]!));
  }
  const length = cumulative[cumulative.length - 1]!;

  const heights = spec.tunnelDepth
    ? flat.map((p, i) => terrainHeight(p.x, p.z) - Math.sin((Math.PI * i) / count) * spec.tunnelDepth!)
    : smoothHeights(flat.map((p) => terrainHeight(p.x, p.z)));
  heights[0] = a.y;
  heights[heights.length - 1] = b.y;
  const samples: Vec3[] = flat.map((p, i) => v3(p.x, heights[i]!, p.z));

  return { samples, ts, cumulative, length };
}

function smoothHeights(heights: number[]): number[] {
  if (heights.length < 3) return heights;
  return heights.map((h, i) => (i === 0 || i === heights.length - 1 ? h : (heights[i - 1]! + h * 2 + heights[i + 1]!) / 4));
}

export class RoadGraph {
  private readonly nodes = new Map<NodeId, RoadNode>();
  private readonly segments = new Map<SegmentId, Segment>();
  private nextNodeId = 1;
  private nextSegmentId = 1;

  /** Places a node, sampling its elevation once. A placed road is a fixed road. */
  addNode(x: number, z: number): NodeId {
    return this.addNodeAt(v3(x, terrainHeight(x, z), z));
  }

  private addNodeAt(pos: Vec3): NodeId {
    const id = this.nextNodeId++;
    this.nodes.set(id, { id, pos, segments: new Set() });
    return id;
  }

  addSegment(a: NodeId, b: NodeId, control: Vec3, type: string = DEFAULT_ROAD_TYPE): SegmentId {
    const na = this.node(a);
    const nb = this.node(b);
    roadType(type); // rejects an unknown type here rather than at render time
    return this.addBuiltSegment(a, b, control, type, buildSamples(na.pos, control, nb.pos, type));
  }

  private addBuiltSegment(
    a: NodeId,
    b: NodeId,
    control: Vec3,
    type: string,
    built: Pick<Segment, "samples" | "ts" | "cumulative" | "length">,
  ): SegmentId {
    const id = this.nextSegmentId++;
    this.segments.set(id, { id, a, b, control, type, ...built });
    this.node(a).segments.add(id);
    this.node(b).segments.add(id);
    return id;
  }

  removeSegment(id: SegmentId): void {
    const seg = this.segments.get(id);
    if (!seg) return;
    this.segments.delete(id);
    for (const nodeId of [seg.a, seg.b]) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;
      node.segments.delete(id);
      if (node.segments.size === 0) this.nodes.delete(nodeId);
    }
  }

  node(id: NodeId): RoadNode {
    const n = this.nodes.get(id);
    if (!n) throw new Error(`unknown node: ${id}`);
    return n;
  }

  segment(id: SegmentId): Segment {
    const s = this.segments.get(id);
    if (!s) throw new Error(`unknown segment: ${id}`);
    return s;
  }

  allNodes(): RoadNode[] {
    return [...this.nodes.values()];
  }

  allSegments(): Segment[] {
    return [...this.segments.values()];
  }

  /** Three or more incident segments. Junctions are never placed, only produced. */
  isJunction(id: NodeId): boolean {
    return this.node(id).segments.size >= 3;
  }

  /** Position and direction at a ground distance along the segment. */
  pointAt(id: SegmentId, distance: number): PointOnSegment {
    const seg = this.segment(id);
    const d = Math.min(Math.max(distance, 0), seg.length);
    const i = upperIndex(seg.cumulative, d);
    const prev = seg.cumulative[i - 1]!;
    const span = seg.cumulative[i]! - prev;
    const f = span < 1e-9 ? 0 : (d - prev) / span;
    const position = lerp(seg.samples[i - 1]!, seg.samples[i]!, f);
    const tangent = normalizeXZ(sub(seg.samples[i]!, seg.samples[i - 1]!));
    return { position, tangent };
  }

  /** Evenly spaced points along the segment, spacing measured on the ground. */
  pointsEvery(id: SegmentId, spacing: number, from = 0, to?: number): PointOnSegment[] {
    const seg = this.segment(id);
    const end = to ?? seg.length;
    const out: PointOnSegment[] = [];
    for (let d = from; d <= end + 1e-9; d += spacing) out.push(this.pointAt(id, d));
    return out;
  }

  /** Steepest sampled rise over run, using planimetric distance. */
  gradient(id: SegmentId): number {
    const seg = this.segment(id);
    let steepest = 0;
    for (let i = 1; i < seg.samples.length; i++) {
      const run = seg.cumulative[i]! - seg.cumulative[i - 1]!;
      if (run > 1e-9) steepest = Math.max(steepest, Math.abs(seg.samples[i]!.y - seg.samples[i - 1]!.y) / run);
    }
    return steepest;
  }

  /** Curve parameter at a ground distance, via the sample table. */
  private paramAt(seg: Segment, distance: number): number {
    const d = Math.min(Math.max(distance, 0), seg.length);
    const i = upperIndex(seg.cumulative, d);
    const prev = seg.cumulative[i - 1]!;
    const span = seg.cumulative[i]! - prev;
    const f = span < 1e-9 ? 0 : (d - prev) / span;
    return seg.ts[i - 1]! + (seg.ts[i]! - seg.ts[i - 1]!) * f;
  }

  /**
   * Splits a segment at a ground distance, keeping the shape of the original curve on
   * both sides (de Casteljau on the quadratic). Returns the new shared node.
   */
  splitSegment(id: SegmentId, distance: number): NodeId {
    const seg = this.segment(id);
    const t = this.paramAt(seg, distance);
    const a = seg.samples[0]!;
    const b = seg.samples[seg.samples.length - 1]!;

    const q0 = lerp(a, seg.control, t);
    const q1 = lerp(seg.control, b, t);
    const mid = this.pointAt(id, distance).position;
    const split = splitBuilt(seg, mid, t, distance);

    const midId = this.addNodeAt(mid);
    // Attach the halves before dropping the original: `removeSegment` collects nodes
    // that are left with nothing, and a and b would be collected here.
    this.addBuiltSegment(seg.a, midId, q0, seg.type, split.left);
    this.addBuiltSegment(midId, seg.b, q1, seg.type, split.right);
    this.removeSegment(id);
    return midId;
  }

  /** Nearest node within a radius. ponytail: linear scan; add a grid index if it shows up in a profile. */
  nearestNode(x: number, z: number, radius: number): RoadNode | null {
    let best: RoadNode | null = null;
    let bestDist = radius;
    const p = v3(x, 0, z);
    for (const node of this.nodes.values()) {
      const d = distXZ(node.pos, p);
      if (d <= bestDist) {
        best = node;
        bestDist = d;
      }
    }
    return best;
  }

  /** Nearest point on any segment within a radius, as a segment plus a distance along it. */
  nearestOnSegment(
    x: number,
    z: number,
    radius: number,
    accept: (segment: Segment) => boolean = () => true,
  ): { segment: Segment; distance: number; position: Vec3 } | null {
    const p = v3(x, 0, z);
    let best: { segment: Segment; distance: number; position: Vec3 } | null = null;
    let bestDist = radius;
    for (const seg of this.segments.values()) {
      if (!accept(seg)) continue;
      for (let i = 1; i < seg.samples.length; i++) {
        const s0 = seg.samples[i - 1]!;
        const s1 = seg.samples[i]!;
        const dx = s1.x - s0.x;
        const dz = s1.z - s0.z;
        const lenSq = dx * dx + dz * dz;
        const f = lenSq < 1e-12 ? 0 : Math.min(1, Math.max(0, ((p.x - s0.x) * dx + (p.z - s0.z) * dz) / lenSq));
        const hit = lerp(s0, s1, f);
        const d = distXZ(hit, p);
        if (d <= bestDist) {
          bestDist = d;
          const along = seg.cumulative[i - 1]! + f * (seg.cumulative[i]! - seg.cumulative[i - 1]!);
          best = { segment: seg, distance: along, position: hit };
        }
      }
    }
    return best;
  }
}

/** First index whose cumulative distance reaches `d`; never returns 0. */
function upperIndex(cumulative: readonly number[], d: number): number {
  let lo = 1;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid]! < d) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function splitBuilt(seg: Segment, mid: Vec3, t: number, distance: number) {
  const i = upperIndex(seg.cumulative, distance);
  const leftSamples = [...seg.samples.slice(0, i), mid];
  const rightSamples = [mid, ...seg.samples.slice(i)];
  const leftTs = [...seg.ts.slice(0, i), t];
  const rightTs = [t, ...seg.ts.slice(i)];
  return {
    left: rebuildBuilt(leftSamples, leftTs),
    right: rebuildBuilt(rightSamples, rightTs),
  };
}

function rebuildBuilt(samples: Vec3[], ts: number[]) {
  const cumulative = [0];
  for (let i = 1; i < samples.length; i++) cumulative.push(cumulative[i - 1]! + distXZ(samples[i - 1]!, samples[i]!));
  return { samples, ts, cumulative, length: cumulative[cumulative.length - 1]! };
}
