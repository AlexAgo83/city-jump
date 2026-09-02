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
