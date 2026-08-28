import type { Terrain } from "./terrain";
import type { RoadGraph } from "./graph";
import { roadType } from "./roadTypes";
import { allJunctions, junctionRadius } from "./junction";
import type { BuildingParcel } from "./slots";

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
  conformToRoads(graph: RoadGraph, parcels: readonly BuildingParcel[] = []): void {
    this.current.set(this.base);
    this.claim.fill(Infinity);

    for (const seg of graph.allSegments()) {
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
        this.stamp(position.x, position.z, position.y, half, reach);
      }
    }

    // A junction polygon can reach further from the node than any single arm's own half-width
    // stamp covers -- a wide-angle corner sits well off every incident road's centerline. Left
    // alone, the ground there only gets the soft embankment blend, not a hard flatten, and pokes
    // through the road/sidewalk surface at the corner farthest from every arm. A roundabout is
    // the extreme case: no segment passes through its ring at all, so it got this treatment first;
    // ordinary junctions need exactly the same disc, just sized by `junctionRadius` instead.
    for (const nodeId of allJunctions(graph).keys()) {
      const node = graph.node(nodeId);
      const radius = junctionRadius(graph, nodeId);
      const step = Math.max(1, this.cell / 2);
      for (let z = -radius; z <= radius; z += step) {
        for (let x = -radius; x <= radius; x += step) {
          if (Math.hypot(x, z) > radius) continue;
          this.stamp(node.pos.x + x, node.pos.z + z, node.pos.y, step, step + EMBANKMENT);
        }
      }
    }

    for (const parcel of parcels) this.stampParcel(parcel);
  }

  /** Levels the cells around one point of road, blending out across the embankment. */
  private stamp(x: number, z: number, elevation: number, half: number, reach: number): void {
    const lo = (v: number) => Math.max(0, Math.floor((v - reach + this.size / 2) / this.cell));
    const hi = (v: number) => Math.min(this.count - 1, Math.ceil((v + reach + this.size / 2) / this.cell));

    for (let iz = lo(z); iz <= hi(z); iz++) {
      for (let ix = lo(x); ix <= hi(x); ix++) {
        const dx = this.worldX(ix) - x;
        const dz = this.worldZ(iz) - z;
        const distance = Math.hypot(dx, dz);
        if (distance > reach) continue;

        const index = iz * this.count + ix;
        if (distance >= this.claim[index]!) continue; // a nearer road already owns this cell
        this.claim[index] = distance;

        const bed = elevation - ROAD_BED_DROP;
        if (distance <= half) {
          this.current[index] = bed;
        } else {
          const t = smoothstep((distance - half) / (reach - half));
          this.current[index] = bed + (this.base[index]! - bed) * t;
        }
      }
    }
  }

  private stampParcel(parcel: BuildingParcel): void {
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

    for (let iz = lo(parcel.position.z); iz <= hi(parcel.position.z); iz++) {
      for (let ix = lo(parcel.position.x); ix <= hi(parcel.position.x); ix++) {
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
