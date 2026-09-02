import type { BuildingKind } from "./buildingKinds";

export type ZoneKind = BuildingKind;
export type SavedZoneKind = ZoneKind | "low" | "dense";
export type SavedZone = [x: number, z: number, kind: SavedZoneKind];

/** A lot, as far as zoning is concerned: something with a footprint on the ground. */
export interface ZonableLot {
  readonly corners: readonly { readonly x: number; readonly z: number }[];
}

/**
 * What each lot is zoned for.
 *
 * A zone belongs to a lot, not to the ground under it. It used to be stamped onto an eight-metre
 * grid of its own, which is the same size as a lot but never aligned with one: a stroke could
 * cover a lot without landing on the grid square the lot would be read from, so the lot came back
 * unzoned and the map showed paint on the grass with an empty grid on top of it. Keyed by the lot
 * itself, the question "what is this lot zoned for" has one answer and no geometry in the way.
 */
export class Zones {
  /** Bumped by every change, so a caller can tell whether what it derived from the zoning holds. */
  revision = 0;
  private readonly lots = new Map<string, ZoneKind>();

  constructor(saved: readonly SavedZone[] = []) {
    this.replaceWith(saved);
  }

  /** Zones the given lots, or clears them when the kind is null. */
  paintLots(lots: Iterable<ZonableLot>, kind: ZoneKind | null): void {
    this.revision++;
    for (const lot of lots) {
      const id = lotKey(lot);
      if (kind) this.lots.set(id, kind);
      else this.lots.delete(id);
    }
  }

  /** What a lot is zoned for. */
  ofLot(lot: ZonableLot): ZoneKind | undefined {
    return this.lots.get(lotKey(lot));
  }

  /** What the lot centred on this point is zoned for, for callers that only carry a position. */
  at(x: number, z: number): ZoneKind | undefined {
    return this.lots.get(key(x, z));
  }

  replaceWith(saved: readonly SavedZone[]): void {
    this.revision++;
    this.lots.clear();
    for (const [x, z, kind] of saved) {
      const migrated = migrateZoneKind(kind);
      if (migrated) this.lots.set(key(x, z), migrated);
    }
  }

  /** Migration happens on the way in, so what comes out is always a current kind. */
  toJSON(): [x: number, z: number, kind: ZoneKind][] {
    return [...this.lots.entries()]
      .map(([lot, kind]) => {
        // Written back in metres, not in key units, so a save reads the same way it was written.
        const [x, z] = lot.split(":").map(Number);
        return [x! * KEY_STEP, z! * KEY_STEP, kind] as [number, number, ZoneKind];
      })
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  count(): number {
    return this.lots.size;
  }

  /**
   * Re-attaches the zoning to the lots that are actually on the ground.
   *
   * A city replayed from a save does not cut itself into exactly the same lots: junction trims
   * come out a hair different, and the lots along a street slide by about a metre -- measured at
   * a median of 1.07 m, 2.06 m at the ninetieth percentile. A lot keyed to four metres survives
   * that only when the slide does not cross a bucket boundary, and one in seven does: 1537 of
   * 10760 lots lost their zone on a reload, which is what the holes in a painted district were.
   *
   * So the zoning is moved onto the lot that is nearest to where it was painted, within a
   * tolerance well under the eight metres that separate two lots. Returns how many entries moved.
   *
   * ponytail: heals the drift rather than removing it. The lots would have to come out identical
   * for that, which is a junction-geometry question, not a zoning one.
   */
  snapTo(lots: Iterable<ZonableLot>, tolerance = 3): number {
    const centres = new Map<string, { x: number; z: number }>();
    const buckets = new Map<string, { x: number; z: number }[]>();
    for (const lot of lots) {
      const x = lot.corners.reduce((sum, corner) => sum + corner.x, 0) / lot.corners.length;
      const z = lot.corners.reduce((sum, corner) => sum + corner.z, 0) / lot.corners.length;
      const centre = { x, z };
      centres.set(key(x, z), centre);
      const bucket = bucketKey(x, z);
      const list = buckets.get(bucket);
      if (list) list.push(centre);
      else buckets.set(bucket, [centre]);
    }
    let moved = 0;
    for (const [id, kind] of [...this.lots]) {
      if (centres.has(id)) continue; // a lot is still there to carry it
      const [bx, bz] = id.split(":").map(Number);
      const x = bx! * KEY_STEP;
      const z = bz! * KEY_STEP;
      let best: { x: number; z: number } | null = null;
      let bestDistance = tolerance;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          for (const centre of buckets.get(bucketKey(x + ox * tolerance, z + oz * tolerance)) ?? []) {
            const distance = Math.hypot(centre.x - x, centre.z - z);
            if (distance > bestDistance) continue;
            bestDistance = distance;
            best = centre;
          }
        }
      }
      if (!best) continue;
      this.lots.delete(id);
      this.lots.set(key(best.x, best.z), kind);
      moved += 1;
    }
    if (moved) this.revision++;
    return moved;
  }
}

/** A coarse bucket for the nearest-lot search, so it looks at a handful of lots and not at ten thousand. */
function bucketKey(x: number, z: number): string {
  return `${Math.floor(x / 8)}:${Math.floor(z / 8)}`;
}

/** A lot's identity: the centre of its footprint, to the metre. */
export function lotKey(lot: ZonableLot): string {
  const x = lot.corners.reduce((sum, corner) => sum + corner.x, 0) / lot.corners.length;
  const z = lot.corners.reduce((sum, corner) => sum + corner.z, 0) / lot.corners.length;
  return key(x, z);
}

/**
 * Snapped to four metres, which is half a lot.
 *
 * Splitting a road shifts the lots along it by a metre or two without moving the district anyone
 * drew, so an exact key would drop the zoning of every lot on that street. Lots sit eight metres
 * apart, so half of that separates neighbours while tolerating the shift.
 */
const KEY_STEP = 4;

function key(x: number, z: number): string {
  return `${Math.round(x / KEY_STEP)}:${Math.round(z / KEY_STEP)}`;
}

/**
 * Zones used to be painted as densities (`low`/`dense`). Old saves still carry those names, so
 * they are read as what they always meant.
 */
function migrateZoneKind(kind: SavedZoneKind): ZoneKind {
  if (kind === "low") return "residential";
  if (kind === "dense") return "commercial";
  return kind;
}
