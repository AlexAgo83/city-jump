import type { BuildingKind } from "./buildingKinds";

export type ZoneKind = BuildingKind;
export type SavedZoneKind = ZoneKind | "low" | "dense";
export type SavedZone = [x: number, z: number, kind: SavedZoneKind];

export const ZONE_CELL_SIZE = 8;

export class Zones {
  private readonly cells = new Map<string, ZoneKind>();

  constructor(saved: readonly SavedZone[] = []) {
    this.replaceWith(saved);
  }

  /**
   * A rectangle of land, for laying a district along a street rather than dropping a circle on it.
   * The brush is round because a brush should be; a planned block is not.
   */
  paintRect(minX: number, minZ: number, maxX: number, maxZ: number, kind: ZoneKind | null): void {
    for (let gx = Math.floor(minX / ZONE_CELL_SIZE); gx <= Math.floor(maxX / ZONE_CELL_SIZE); gx++) {
      for (let gz = Math.floor(minZ / ZONE_CELL_SIZE); gz <= Math.floor(maxZ / ZONE_CELL_SIZE); gz++) {
        if (kind) this.cells.set(key(gx, gz), kind);
        else this.cells.delete(key(gx, gz));
      }
    }
  }

  paint(x: number, z: number, radius: number, kind: ZoneKind | null): void {
    const minX = Math.floor((x - radius) / ZONE_CELL_SIZE);
    const maxX = Math.floor((x + radius) / ZONE_CELL_SIZE);
    const minZ = Math.floor((z - radius) / ZONE_CELL_SIZE);
    const maxZ = Math.floor((z + radius) / ZONE_CELL_SIZE);
    for (let gx = minX; gx <= maxX; gx++) {
      for (let gz = minZ; gz <= maxZ; gz++) {
        const cx = (gx + 0.5) * ZONE_CELL_SIZE;
        const cz = (gz + 0.5) * ZONE_CELL_SIZE;
        if (Math.hypot(cx - x, cz - z) > radius) continue;
        if (kind) this.cells.set(key(gx, gz), kind);
        else this.cells.delete(key(gx, gz));
      }
    }
  }

  at(x: number, z: number): ZoneKind | undefined {
    return this.cells.get(key(Math.floor(x / ZONE_CELL_SIZE), Math.floor(z / ZONE_CELL_SIZE)));
  }

  replaceWith(saved: readonly SavedZone[]): void {
    this.cells.clear();
    for (const [x, z, kind] of saved) {
      const migrated = migrateZoneKind(kind);
      if (migrated) this.cells.set(key(x, z), migrated);
    }
  }

  /** Migration happens on the way in, so what comes out is always a current kind. */
  toJSON(): [x: number, z: number, kind: ZoneKind][] {
    return [...this.cells.entries()]
      .map(([cell, kind]) => {
        const [x, z] = cell.split(":").map(Number);
        return [x!, z!, kind] as [number, number, ZoneKind];
      })
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  count(): number {
    return this.cells.size;
  }
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

function key(x: number, z: number): string {
  return `${x}:${z}`;
}
