import { type Vec3, v3, lerp, distXZ, normalizeXZ, sub, smoothstep01 } from "./vec";
import { terrainHeight } from "./terrain";
import { DEFAULT_ROAD_TYPE, roadType } from "./roadTypes";
import { angleBetween, OPPOSITE_BEARING_TOLERANCE } from "./facing";

export type NodeId = number;
export type SegmentId = number;

export interface RoadNode {
  readonly id: NodeId;
  readonly pos: Vec3;
  /** Segments incident to this node. Three or more makes it a junction. */
  readonly segments: Set<SegmentId>;
  /** Every arm is pulled back to the ring radius and the node is drawn as one. */
  roundabout: boolean;
  /** Lanes around the ring. Only meaningful while `roundabout` is set. */
  roundaboutLanes: 1 | 2;
}

export interface Segment {
  readonly id: SegmentId;
  readonly a: NodeId;
  readonly b: NodeId;
  /** The single control point of the quadratic Bezier. */
  readonly control: Vec3;
  readonly type: string;
  readonly streetId: number;
  /** Polyline sample of the curve, roughly one point per metre. */
  readonly samples: readonly Vec3[];
  /** Curve parameter of each sample, so a distance can be turned back into a `t`. */
  readonly ts: readonly number[];
  /** Cumulative ground distance at each sample; last entry is the segment length. */
  readonly cumulative: readonly number[];
  readonly length: number;
  /** A rendered road deck that must not reshape the terrain below it. */
  readonly elevated?: boolean;
  /** Bitmask of utilities carried by this road segment. */
  utilities: number;
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
const ELEVATED_CLEARANCE = 2;

/**
 * Samples the curve and builds its cumulative-distance table. Elevation follows the
 * terrain at each sample, with one tiny smoothing pass so rugged ground is driveable.
 * ponytail: two passes (shape, then elevation) rather than solving arc length in closed
 * form -- the table is what every consumer wants anyway.
 */
function buildSamples(a: Vec3, control: Vec3, b: Vec3, type = DEFAULT_ROAD_TYPE, elevated = false) {
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

  const heights = elevated
    ? ts.map((t, i) => {
        const u = 1 - t;
        const p = flat[i]!;
        return Math.max(a.y * u * u + control.y * 2 * u * t + b.y * t * t, terrainHeight(p.x, p.z) + ELEVATED_CLEARANCE);
      })
    : spec.tunnelDepth
    ? flat.map((_, i) => a.y + (b.y - a.y) * (i / count) - tunnelDrop(i / count, spec.tunnelDepth!))
    : smoothHeights(flat.map((p) => terrainHeight(p.x, p.z)));
  heights[0] = a.y;
  heights[heights.length - 1] = b.y;
  const samples: Vec3[] = flat.map((p, i) => v3(p.x, heights[i]!, p.z));

  return { samples, ts, cumulative, length };
}

function tunnelDrop(t: number, depth: number): number {
  return depth * 2.2 * Math.min(smoothstep01(t / 0.18), smoothstep01((1 - t) / 0.18));
}

function smoothHeights(heights: number[]): number[] {
  if (heights.length < 3) return heights;
  return heights.map((h, i) => (i === 0 || i === heights.length - 1 ? h : (heights[i - 1]! + h * 2 + heights[i + 1]!) / 4));
}

export class RoadGraph {
  /**
   * Bumped by every change to the roads, so a caller can tell whether an answer it derived from
   * the graph -- the buildable cells, above all, which cost 65ms to solve -- is still current.
   */
  revision = 0;
  private readonly nodes = new Map<NodeId, RoadNode>();
  private readonly segments = new Map<SegmentId, Segment>();
  private nextNodeId = 1;
  private nextSegmentId = 1;

  /** Places a node, sampling its elevation once. A placed road is a fixed road. */
  addNode(x: number, z: number): NodeId {
    return this.addNodeAt(v3(x, terrainHeight(x, z), z));
  }

  /** Places a node at an exact position, bypassing the terrain sample. Used to replay a save. */
  addNodeAt(pos: Vec3): NodeId {
    const id = this.nextNodeId++;
    this.nodes.set(id, { id, pos, segments: new Set(), roundabout: false, roundaboutLanes: 1 });
    this.revision++;
    return id;
  }

  addSegment(a: NodeId, b: NodeId, control: Vec3, type: string = DEFAULT_ROAD_TYPE, streetId?: number, utilities = 0): SegmentId {
    const na = this.node(a);
    const nb = this.node(b);
    roadType(type); // rejects an unknown type here rather than at render time
    const id = streetId ?? this.inheritedStreetId(a, b, control, type) ?? this.nextStreetId++;
    this.nextStreetId = Math.max(this.nextStreetId, id + 1);
    return this.addBuiltSegment(a, b, control, type, id, buildSamples(na.pos, control, nb.pos, type), false, utilities);
  }

  addElevatedSegment(a: NodeId, b: NodeId, control: Vec3, type: string = DEFAULT_ROAD_TYPE, streetId?: number, utilities = 0): SegmentId {
    const na = this.node(a);
    const nb = this.node(b);
    roadType(type);
    const id = streetId ?? this.inheritedStreetId(a, b, control, type) ?? this.nextStreetId++;
    this.nextStreetId = Math.max(this.nextStreetId, id + 1);
    return this.addBuiltSegment(a, b, control, type, id, buildSamples(na.pos, control, nb.pos, type, true), true, utilities);
  }

  private nextStreetId = 1;

  private addBuiltSegment(
    a: NodeId,
    b: NodeId,
    control: Vec3,
    type: string,
    streetId: number,
    built: Pick<Segment, "samples" | "ts" | "cumulative" | "length">,
    elevated = false,
    utilities = 0,
  ): SegmentId {
    const id = this.nextSegmentId++;
    this.segments.set(id, { id, a, b, control, type, streetId, utilities, ...built, ...(elevated ? { elevated } : {}) });
    this.node(a).segments.add(id);
    this.node(b).segments.add(id);
    this.revision++;
    return id;
  }

  setSegmentUtilities(id: SegmentId, utilities: number): void {
    this.segment(id).utilities = utilities;
    this.revision++;
  }

  /** Returns false when the node cannot carry one, which the caller reports to the player. */
  setRoundabout(id: NodeId, on: boolean, lanes: 1 | 2 = 1): boolean {
    const node = this.node(id);
    if (on && node.segments.size < 2) return false;
    node.roundabout = on;
    if (on) node.roundaboutLanes = lanes;
    this.revision++;
    return true;
  }

  removeSegment(id: SegmentId): void {
    const seg = this.segments.get(id);
    if (!seg) return;
    this.revision++;
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

  hasSegment(id: SegmentId): boolean {
    return this.segments.has(id);
  }

  /**
   * Live node views are internal to the sim; callers may read `segments`, but only RoadGraph
   * mutates it. Returning clones would widen every render path for no runtime safety.
   */
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
    const t = seg.ts[i - 1]! + (seg.ts[i]! - seg.ts[i - 1]!) * f;
    const u = 1 - t;
    const a = this.node(seg.a).pos;
    const b = this.node(seg.b).pos;
    const tangent = normalizeXZ(v3(
      2 * (u * (seg.control.x - a.x) + t * (b.x - seg.control.x)),
      0,
      2 * (u * (seg.control.z - a.z) + t * (b.z - seg.control.z)),
    ));
    if (tangent.x === 0 && tangent.z === 0) return { position, tangent: normalizeXZ(sub(seg.samples[i]!, seg.samples[i - 1]!)) };
    return { position, tangent };
  }

  /** Evenly spaced points along the segment, spacing measured on the ground. */
  pointsEvery(id: SegmentId, spacing: number, from = 0, to?: number): PointOnSegment[] {
    // Fail closed on caller bugs: spacing <= 0 would never advance this loop.
    if (spacing <= 0) return [];
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

    const midId = this.addNodeAt(mid);
    // Each half is sampled afresh from its own curve, not sliced out of the parent's samples.
    // Slicing gave the same curve with the samples in different places, and everything downstream
    // is laid out by walking those samples: a replayed save cut its lots about a metre from where
    // the live city had them, so the zoning fell off them and every building started its
    // construction over. Only 249 of 1806 lots came back in the same place; now they all do.
    const elevated = !!seg.elevated;
    // Attach the halves before dropping the original: `removeSegment` collects nodes
    // that are left with nothing, and a and b would be collected here.
    this.addBuiltSegment(seg.a, midId, q0, seg.type, seg.streetId, buildSamples(this.node(seg.a).pos, q0, mid, seg.type, elevated), elevated, seg.utilities);
    this.addBuiltSegment(midId, seg.b, q1, seg.type, seg.streetId, buildSamples(mid, q1, this.node(seg.b).pos, seg.type, elevated), elevated, seg.utilities);
    this.removeSegment(id);
    return midId;
  }

  private inheritedStreetId(a: NodeId, b: NodeId, control: Vec3, type: string): number | null {
    const candidates = [
      ...this.continuationsAt(a, Math.atan2(control.x - this.node(a).pos.x, control.z - this.node(a).pos.z), type),
      ...this.continuationsAt(b, Math.atan2(control.x - this.node(b).pos.x, control.z - this.node(b).pos.z), type),
    ].sort((l, r) => l.off - r.off);
    return candidates[0]?.streetId ?? null;
  }

  private continuationsAt(nodeId: NodeId, bearing: number, type: string): { streetId: number; off: number }[] {
    const node = this.node(nodeId);
    if (node.roundabout) return [];
    return [...node.segments]
      .map((id) => this.segment(id))
      .filter((seg) => seg.type === type)
      .map((seg) => {
        const point = seg.a === nodeId ? this.pointAt(seg.id, 1) : this.pointAt(seg.id, seg.length - 1);
        const tangent = seg.a === nodeId ? point.tangent : v3(-point.tangent.x, -point.tangent.y, -point.tangent.z);
        return { streetId: seg.streetId, off: Math.abs(Math.PI - angleBetween(bearing, Math.atan2(tangent.x, tangent.z))) };
      })
      .filter(({ off }) => off <= OPPOSITE_BEARING_TOLERANCE);
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
