import type { Terrain } from "./terrain";
import type { RoadGraph } from "./graph";
import { roadType } from "./roadTypes";

/** How far past the kerb the ground blends back to what it was. */
export const EMBANKMENT = 10;
/**
 * The road bed is cut a little below the carriageway, so the ground cannot poke through
 * the surface laid over it. Bilinear sampling between cells otherwise lifts the terrain
 * above a road drawn at exactly the same elevation, and it shows as speckle.
 */
export const ROAD_BED_DROP = 0.3;

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

  /** Bilinear sample, clamped at the edges. */
  heightAt(x: number, z: number): number {
    const fx = (x + this.size / 2) / this.cell;
    const fz = (z + this.size / 2) / this.cell;
    const ix = Math.min(this.count - 2, Math.max(0, Math.floor(fx)));
    const iz = Math.min(this.count - 2, Math.max(0, Math.floor(fz)));
    const tx = Math.min(1, Math.max(0, fx - ix));
    const tz = Math.min(1, Math.max(0, fz - iz));

    const h00 = this.at(ix, iz);
    const h10 = this.at(ix + 1, iz);
    const h01 = this.at(ix, iz + 1);
    const h11 = this.at(ix + 1, iz + 1);
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
  conformToRoads(graph: RoadGraph): void {
    this.current.set(this.base);
    this.claim.fill(Infinity);

    for (const seg of graph.allSegments()) {
      const half = roadType(seg.type).width / 2;
      const reach = half + EMBANKMENT;
      const step = Math.max(1, this.cell / 2);

      for (let d = 0; d <= seg.length; d += step) {
        const { position } = graph.pointAt(seg.id, d);
        this.stamp(position.x, position.z, position.y, half, reach);
      }
    }
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
}

const smoothstep = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/**
 * Gentle rolling ground. Deliberately not steeper than the drawing rules allow over the
 * distance a road spans, so a map is buildable rather than mostly refused.
 */
export function rollingHills(amplitude = 6, wavelength = 900): (x: number, z: number) => number {
  const k = (Math.PI * 2) / wavelength;
  return (x, z) =>
    amplitude * (Math.sin(x * k) * Math.cos(z * k * 0.8) + 0.45 * Math.sin((x + z) * k * 1.7));
}
