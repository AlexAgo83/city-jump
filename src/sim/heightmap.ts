import type { Terrain } from "./terrain";
import type { RoadGraph } from "./graph";
import { roadType } from "./roadTypes";
import { allJunctions, ringElevation, type JunctionGeometry } from "./junction";
import type { BuildingParcel } from "./slots";
import type { Vec3 } from "./vec";

/** How far past the kerb the ground blends back to what it was. */
export const EMBANKMENT = 10;
/**
 * The road bed is cut a little below the carriageway, so the ground cannot poke through
 * the surface laid over it. Bilinear sampling between cells otherwise lifts the terrain
 * above a road drawn at exactly the same elevation, and it shows as speckle.
 */
export const ROAD_BED_DROP = 0.3;
export const BUILDING_PAD_EMBANKMENT = 8;

/**
 * Earth a tunnel needs overhead before the ground is left alone. The tube's outer shell stands
 * about 9.5m above the roadway, so anything less than this and the hill would be sitting on the
 * portal rather than over it.
 */
export const TUNNEL_COVER = 12;
export const SEA_LEVEL = 0;
/**
 * How much closer a junction's own stamp counts itself, so it always beats an arm's stamp
 * landing in the same disc. Comfortably larger than any real reach (junction radii top out
 * around 30-40m), so it never lets a junction win against another junction by anything but
 * genuine distance -- two overlapping junctions both get this same bias and still resolve by
 * who is actually closer.
 */
const JUNCTION_PRIORITY = 1000;

export interface TerrainBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface HeightmapOptions {
  /** Side of the square map, in metres. */
  readonly size: number;
  /** Spacing between samples, in metres. */
  readonly cell: number;
  /** Ground before any road touched it. */
  readonly generator: (x: number, z: number) => number;
}

/**
 * A square grid of elevations, in two layers: the ground as authored, and the ground as
 * the roads have left it. Roads are cut into the second from the first, so removing a
 * road restores what was under it without anyone having to remember what that was.
 */
export class Heightmap implements Terrain {
  readonly size: number;
  readonly cell: number;
  readonly count: number;
  private readonly base: Float32Array;
  private readonly current: Float32Array;
  /** Distance from the nearest road that claimed each cell, so the nearest one wins. */
  private readonly claim: Float32Array;

  constructor(options: HeightmapOptions) {
    this.size = options.size;
    this.cell = options.cell;
    this.count = Math.floor(options.size / options.cell) + 1;

    const total = this.count * this.count;
    this.base = new Float32Array(total);
    this.current = new Float32Array(total);
    this.claim = new Float32Array(total);
    this.regenerate(options.generator);
  }

  regenerate(generator: (x: number, z: number) => number): void {
    for (let iz = 0; iz < this.count; iz++) {
      for (let ix = 0; ix < this.count; ix++) {
        this.base[iz * this.count + ix] = generator(this.worldX(ix), this.worldZ(iz));
      }
    }
    this.current.set(this.base);
    this.claim.fill(Infinity);
  }

  worldX(ix: number): number {
    return -this.size / 2 + ix * this.cell;
  }

  worldZ(iz: number): number {
    return -this.size / 2 + iz * this.cell;
  }

  /** Bilinear sample of the current ground, clamped at the edges. */
  heightAt(x: number, z: number): number {
    return this.sample(x, z, (ix, iz) => this.at(ix, iz));
  }

  /** The same sample against the untouched ground, before any road was cut into it. */
  baseHeightAt(x: number, z: number): number {
    return this.sample(x, z, (ix, iz) => this.baseAt(ix, iz));
  }

  private sample(x: number, z: number, read: (ix: number, iz: number) => number): number {
    const fx = (x + this.size / 2) / this.cell;
    const fz = (z + this.size / 2) / this.cell;
    const ix = Math.min(this.count - 2, Math.max(0, Math.floor(fx)));
    const iz = Math.min(this.count - 2, Math.max(0, Math.floor(fz)));
    const tx = Math.min(1, Math.max(0, fx - ix));
    const tz = Math.min(1, Math.max(0, fz - iz));

    const h00 = read(ix, iz);
    const h10 = read(ix + 1, iz);
    const h01 = read(ix, iz + 1);
    const h11 = read(ix + 1, iz + 1);
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  }

  at(ix: number, iz: number): number {
    const cx = Math.min(this.count - 1, Math.max(0, ix));
    const cz = Math.min(this.count - 1, Math.max(0, iz));
    return this.current[cz * this.count + cx]!;
  }

  baseAt(ix: number, iz: number): number {
    const cx = Math.min(this.count - 1, Math.max(0, ix));
    const cz = Math.min(this.count - 1, Math.max(0, iz));
    return this.base[cz * this.count + cx]!;
  }

  /**
   * Cuts every road in the graph into the ground, starting again from the untouched
   * ground each time. A road that has been removed simply is not cut, and the ground
   * beneath it comes back.
   */
  conformToRoads(
    graph: RoadGraph,
    parcels: readonly BuildingParcel[] = [],
    dirty?: TerrainBounds,
    junctions: Map<number, JunctionGeometry> = allJunctions(graph),
  ): void {
    const region = dirty ? this.gridBounds(dirty) : null;
    if (region) {
      for (let iz = region.minIz; iz <= region.maxIz; iz++) {
        const offset = iz * this.count;
        for (let ix = region.minIx; ix <= region.maxIx; ix++) {
          const index = offset + ix;
          this.current[index] = this.base[index]!;
          this.claim[index] = Infinity;
        }
      }
    } else {
      this.current.set(this.base);
      this.claim.fill(Infinity);
    }

    for (const seg of graph.allSegments()) {
      if (seg.elevated) continue;
      const type = roadType(seg.type);
      const half = type.width / 2;
      const reach = half + EMBANKMENT;
      const step = Math.max(1, this.cell / 2);

      for (let d = 0; d <= seg.length; d += step) {
        const { position } = graph.pointAt(seg.id, d);
        // A tunnel cuts the ground only where it has not buried itself yet, which is the approach
        // trench at each end. Under the middle of the hill there is earth overhead and the ground
        // is left whole, which is the whole point of a tunnel.
        // ponytail: one depth test per sample, reusing the same stamp as a surface road.
        if (type.tunnelDepth && this.baseHeightAt(position.x, position.z) - position.y > TUNNEL_COVER) {
          continue;
        }
        this.stamp(position.x, position.z, position.y, half, reach, 0, region);
      }
    }

    // An ordinary junction's true footprint is the same irregular polygon it is rendered as
    // (`junction.ring`), not a circle -- a wide-angle corner sits further from the node than any
    // arm's own half-width, offset sideways as well as out, and a circular flatten sized off the
    // widest arm's trim undercounts exactly that corner. Flattening the real polygon instead
    // means the ground can never disagree with the surface drawn over it, whatever angle the
    // roads meet at. A roundabout has no filler polygon (it is drawn as a ring, not a hull), so it
    // keeps the circular stamp -- which already matches its perfectly circular render.
    for (const [nodeId, junction] of junctions) {
      const node = graph.node(nodeId);
      if (junction.ring.length >= 3) {
        // Forced: an arm still samples and stamps itself right up to the node it ends at, so its
        // (denser, more numerous) stamps land inside the junction's own footprint too and would
        // otherwise win the ordinary nearest-wins race almost everywhere except the exact centre,
        // leaving jagged slivers of the arm's own grade poking through the polygon.
        this.stampPolygon(junction.ring, EMBANKMENT, JUNCTION_PRIORITY, region);
      } else {
        const elevationAt = ringElevation(junction.arms, node.pos.y);
        this.stamp(node.pos.x, node.pos.z, elevationAt, junction.roundabout, junction.roundabout + EMBANKMENT, JUNCTION_PRIORITY, region);
      }
    }

    for (const parcel of parcels) this.stampParcel(parcel, region);
  }

  private gridBounds(bounds: TerrainBounds): { minIx: number; maxIx: number; minIz: number; maxIz: number } {
    const lo = (v: number) => Math.min(this.count - 1, Math.max(0, Math.floor((v + this.size / 2) / this.cell)));
    const hi = (v: number) => Math.min(this.count - 1, Math.max(0, Math.ceil((v + this.size / 2) / this.cell)));
    return { minIx: lo(bounds.minX), maxIx: hi(bounds.maxX), minIz: lo(bounds.minZ), maxIz: hi(bounds.maxZ) };
  }

  /**
   * Levels the cells around one point of road, blending out across the embankment.
   * `priority` biases the nearest-wins claim inside the hard-flat radius (`half`) only, not the
   * embankment blend beyond it: a junction's own arms keep sampling and stamping themselves
   * right up to the node they end at, so their stamps land inside the junction's own flat disc
   * too -- and being denser (one every half a cell, against the disc's single stamp), they win
   * the ordinary distance race almost everywhere except the exact centre. The flat disc has to
   * beat any arm there regardless, so its claim is recorded as though it were `priority` metres
   * closer than it really is -- but only up to `half`. Past it, in the embankment, the nearby
   * connecting road is normally the more locally-accurate source (it grades between the
   * junction's height and the natural terrain along its own path, not radially from the node),
   * so that band is left as ordinary, unbiased nearest-wins -- biasing it too pushed the
   * junction's flat plateau out past where the road's own surface actually starts, leaving a
   * visible seam of raw terrain right at that boundary.
   */
  private stamp(
    x: number,
    z: number,
    elevation: number | ((angle: number) => number),
    half: number,
    reach: number,
    priority = 0,
    region: ReturnType<Heightmap["gridBounds"]> | null = null,
  ): void {
    const lo = (v: number) => Math.max(0, Math.floor((v - reach + this.size / 2) / this.cell));
    const hi = (v: number) => Math.min(this.count - 1, Math.ceil((v + reach + this.size / 2) / this.cell));
    const minIx = region ? Math.max(region.minIx, lo(x)) : lo(x);
    const maxIx = region ? Math.min(region.maxIx, hi(x)) : hi(x);
    const minIz = region ? Math.max(region.minIz, lo(z)) : lo(z);
    const maxIz = region ? Math.min(region.maxIz, hi(z)) : hi(z);

    for (let iz = minIz; iz <= maxIz; iz++) {
      for (let ix = minIx; ix <= maxIx; ix++) {
        const dx = this.worldX(ix) - x;
        const dz = this.worldZ(iz) - z;
        const distance = Math.hypot(dx, dz);
        if (distance > reach) continue;

        const index = iz * this.count + ix;
        const claim = distance - (distance <= half ? priority : 0);
        if (claim >= this.claim[index]!) continue; // a nearer (or higher-priority) road already owns this cell
        this.claim[index] = claim;

        // A roundabout's ring varies its own elevation by angle (it matches each arm's actual
        // approach height, see `ringElevation`), so the ground under it has to read the same
        // function at the same angle, not one fixed elevation, or the flat parts of the ground
        // sit above or below the ring wherever it dips or rises.
        const bed = (typeof elevation === "function" ? elevation(Math.atan2(dz, dx)) : elevation) - ROAD_BED_DROP;
        if (distance <= half) {
          this.current[index] = bed;
        } else {
          const t = smoothstep((distance - half) / (reach - half));
          this.current[index] = bed + (this.base[index]! - bed) * t;
        }
      }
    }
  }

  /**
   * Flattens the ground under an arbitrary polygon -- a junction's actual rendered footprint --
   * exactly, blending outward over `reach` beyond its boundary. Matches `junctionMesh`'s own
   * triangle fan from the polygon's centroid vertex for vertex, so a corner can never come out
   * higher on the ground than it is drawn on the road.
   */
  private stampPolygon(ring: readonly Vec3[], reach: number, priority: number, region: ReturnType<Heightmap["gridBounds"]> | null = null): void {
    if (ring.length < 3) return;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const p of ring) {
      cx += p.x;
      cy += p.y;
      cz += p.z;
    }
    cx /= ring.length;
    cy /= ring.length;
    cz /= ring.length;

    let minX = cx;
    let maxX = cx;
    let minZ = cz;
    let maxZ = cz;
    for (const p of ring) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }

    const lo = (v: number) => Math.max(0, Math.floor((v - reach + this.size / 2) / this.cell));
    const hi = (v: number) => Math.min(this.count - 1, Math.ceil((v + reach + this.size / 2) / this.cell));

    const minIx = region ? Math.max(region.minIx, lo(minX)) : lo(minX);
    const maxIx = region ? Math.min(region.maxIx, hi(maxX)) : hi(maxX);
    const minIz = region ? Math.max(region.minIz, lo(minZ)) : lo(minZ);
    const maxIz = region ? Math.min(region.maxIz, hi(maxZ)) : hi(maxZ);

    for (let iz = minIz; iz <= maxIz; iz++) {
      for (let ix = minIx; ix <= maxIx; ix++) {
        const x = this.worldX(ix);
        const z = this.worldZ(iz);
        const { distance, y: edgeY } = nearestOnRingXZ(ring, x, z);
        const inside = pointInRingXZ(ring, x, z);
        if (!inside && distance > reach) continue;

        const index = iz * this.count + ix;
        const claim = inside ? -distance - priority : distance;
        if (claim >= this.claim[index]!) continue;
        this.claim[index] = claim;

        if (inside) {
          const y = ringInteriorY(ring, cx, cy, cz, x, z);
          this.current[index] = y - ROAD_BED_DROP;
        } else {
          const bed = edgeY - ROAD_BED_DROP;
          const t = smoothstep(distance / reach);
          this.current[index] = bed + (this.base[index]! - bed) * t;
        }
      }
    }
  }

  private stampParcel(parcel: BuildingParcel, region: ReturnType<Heightmap["gridBounds"]> | null = null): void {
    const halfWidth = (parcel.frontageCells * 8) / 2;
    const depth = parcel.depthCells * 8;
    const reach = BUILDING_PAD_EMBANKMENT;
    const alongX = Math.cos(parcel.rotationY);
    const alongZ = -Math.sin(parcel.rotationY);
    const outX = -Math.sin(parcel.rotationY);
    const outZ = -Math.cos(parcel.rotationY);
    const radius = Math.hypot(halfWidth, depth) + reach;
    const lo = (v: number) => Math.max(0, Math.floor((v - radius + this.size / 2) / this.cell));
    const hi = (v: number) => Math.min(this.count - 1, Math.ceil((v + radius + this.size / 2) / this.cell));

    const minIx = region ? Math.max(region.minIx, lo(parcel.position.x)) : lo(parcel.position.x);
    const maxIx = region ? Math.min(region.maxIx, hi(parcel.position.x)) : hi(parcel.position.x);
    const minIz = region ? Math.max(region.minIz, lo(parcel.position.z)) : lo(parcel.position.z);
    const maxIz = region ? Math.min(region.maxIz, hi(parcel.position.z)) : hi(parcel.position.z);

    for (let iz = minIz; iz <= maxIz; iz++) {
      for (let ix = minIx; ix <= maxIx; ix++) {
        const dx = this.worldX(ix) - parcel.position.x;
        const dz = this.worldZ(iz) - parcel.position.z;
        const along = dx * alongX + dz * alongZ;
        const out = dx * outX + dz * outZ;
        const outside = Math.hypot(Math.max(0, Math.abs(along) - halfWidth), Math.max(0, out - depth, -out));
        if (outside > reach) continue;

        const index = iz * this.count + ix;
        if (Number.isFinite(this.claim[index]!)) continue;
        const t = smoothstep(outside / reach);
        this.current[index] = parcel.position.y + (this.current[index]! - parcel.position.y) * t;
      }
    }
  }
}

const smoothstep = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Ray-casting point-in-polygon test over the ground plane. Works for any simple ring. */
function pointInRingXZ(ring: readonly Vec3[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

/** Nearest point on segment ab to (x, z), with the elevation that point of the segment carries. */
function nearestOnSegmentXZ(a: Vec3, b: Vec3, x: number, z: number): { distance: number; y: number } {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const lenSq = abx * abx + abz * abz;
  const t = lenSq > 1e-9 ? Math.min(1, Math.max(0, ((x - a.x) * abx + (z - a.z) * abz) / lenSq)) : 0;
  const px = a.x + abx * t;
  const pz = a.z + abz * t;
  return { distance: Math.hypot(x - px, z - pz), y: a.y + (b.y - a.y) * t };
}

/** Nearest point on the ring's boundary to (x, z) -- the edge the ground blends from outside it. */
function nearestOnRingXZ(ring: readonly Vec3[], x: number, z: number): { distance: number; y: number } {
  let best = { distance: Infinity, y: 0 };
  for (let i = 0; i < ring.length; i++) {
    const candidate = nearestOnSegmentXZ(ring[i]!, ring[(i + 1) % ring.length]!, x, z);
    if (candidate.distance < best.distance) best = candidate;
  }
  return best;
}

/**
 * Elevation at (x, z), known to be inside the ring, read off the same centroid triangle fan
 * `junctionMesh` renders the polygon as -- so the ground under a corner comes out at exactly the
 * height the corner's own triangle draws there, not the ring's average.
 */
function ringInteriorY(ring: readonly Vec3[], cx: number, cy: number, cz: number, x: number, z: number): number {
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const bary = barycentricXZ(cx, cz, a.x, a.z, b.x, b.z, x, z);
    if (bary) return cy * bary[0] + a.y * bary[1] + b.y * bary[2];
  }
  return cy; // the fan should always cover an interior point; the centroid height is the safe fallback
}

/** Barycentric weights of (px, pz) in triangle (x0,z0)-(x1,z1)-(x2,z2), or null if outside it. */
function barycentricXZ(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  px: number,
  pz: number,
): [number, number, number] | null {
  const denom = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
  if (Math.abs(denom) < 1e-9) return null;
  const w0 = ((z1 - z2) * (px - x2) + (x2 - x1) * (pz - z2)) / denom;
  const w1 = ((z2 - z0) * (px - x2) + (x0 - x2) * (pz - z2)) / denom;
  const w2 = 1 - w0 - w1;
  const slack = 1e-6;
  if (w0 < -slack || w1 < -slack || w2 < -slack) return null;
  return [w0, w1, w2];
}

/**
 * Gentle rolling ground. Deliberately not steeper than the drawing rules allow over the
 * distance a road spans, so a map is buildable rather than mostly refused.
 */
export function rollingHills(amplitude = 6, wavelength = 900, roughness = 0): (x: number, z: number) => number {
  const k = (Math.PI * 2) / wavelength;
  const roughFeatures = Array.from({ length: roughness ? 18 : 0 }, (_, i) => ({
    x: (randomish(i, 1) - 0.5) * 1900,
    z: (randomish(i, 2) - 0.5) * 1900,
    height: (randomish(i, 3) * 2 - 1) * roughness,
    radius: 150 + randomish(i, 4) * 210,
  }));
  return (x, z) => {
    const hills = amplitude * (Math.sin(x * k) * Math.cos(z * k * 0.8) + 0.45 * Math.sin((x + z) * k * 1.7));
    const rough = roughFeatures.reduce(
      (sum, p) => sum + p.height * Math.exp(-((x - p.x) ** 2 + (z - p.z) ** 2) / (2 * p.radius * p.radius)),
      0,
    );
    const peak = (cx: number, cz: number, height: number, radius: number) =>
      height * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * radius * radius));
    const ridge = 64 * Math.exp(-((x + z * 0.28) ** 2) / (2 * 360 * 360)) * Math.exp(-(z * z) / (2 * 1520 * 1520));
    const mountain =
      peak(-180, -80, 19, 360) +
      peak(170, -60, 18, 350) +
      peak(20, 190, 17, 360) +
      peak(0, 0, 19, 300) +
      ridge;
    const r = Math.hypot(x, z);
    const coast = smoothstep((r - 1520) / 520);
    const deep = smoothstep((r - 1960) / 720);
    let base = 10 + mountain + hills - coast * 60 - deep * 90;
    if (roughness) {
      const lakeGuard = (SEA_LEVEL + 8 - base) * (1 - smoothstep((r - 1180) / 360));
      if (lakeGuard > 0) base += lakeGuard;
    }
    const mountainMask = smoothstep((base - 52) / 34);
    const inlandMask = 1 - smoothstep((r - 1120) / 520);
    return base + rough * mountainMask * inlandMask;
  };
}

function randomish(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}
