import { buildableCellCentre, type BuildingParcel } from "./slots";

export type SavedRubble = [x: number, z: number, createdAt?: number];

export class Rubble {
  private readonly cells = new Map<string, number>();

  constructor(saved: readonly SavedRubble[] = []) {
    this.replaceWith(saved);
  }

  destroy(parcel: Pick<BuildingParcel, "cells">, createdAt = 0): void {
    for (const cell of parcel.cells) {
      const { x, z } = buildableCellCentre(cell);
      this.cells.set(key(x, z), createdAt);
    }
  }

  clear(parcel: Pick<BuildingParcel, "cells">): void {
    for (const cell of parcel.cells) {
      const { x, z } = buildableCellCentre(cell);
      this.cells.delete(key(x, z));
    }
  }

  blocks(parcel: Pick<BuildingParcel, "cells">): boolean {
    return parcel.cells.some((cell) => {
      const { x, z } = buildableCellCentre(cell);
      return this.cells.has(key(x, z));
    });
  }

  replaceWith(saved: readonly SavedRubble[]): void {
    this.cells.clear();
    for (const [x, z, createdAt = 0] of saved) this.cells.set(key(x, z), createdAt);
  }

  expireBefore(cutoff: number): boolean {
    let changed = false;
    for (const [cell, createdAt] of this.cells) {
      if (createdAt > cutoff) continue;
      this.cells.delete(cell);
      changed = true;
    }
    return changed;
  }

  toJSON(): SavedRubble[] {
    return [...this.cells].map(([cell, createdAt]) => {
      const [x, z] = cell.split(":").map(Number);
      return [x!, z!, createdAt] as SavedRubble;
    }).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  count(): number {
    return this.cells.size;
  }
}

function key(x: number, z: number): string {
  return `${Math.round(x * 100) / 100}:${Math.round(z * 100) / 100}`;
}
