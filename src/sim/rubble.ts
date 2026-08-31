import { buildableCellCentre, type BuildingParcel } from "./slots";

export type SavedRubble = [x: number, z: number];

export class Rubble {
  private readonly cells = new Set<string>();

  constructor(saved: readonly SavedRubble[] = []) {
    this.replaceWith(saved);
  }

  destroy(parcel: Pick<BuildingParcel, "cells">): void {
    for (const cell of parcel.cells) {
      const { x, z } = buildableCellCentre(cell);
      this.cells.add(key(x, z));
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
    for (const [x, z] of saved) this.cells.add(key(x, z));
  }

  toJSON(): SavedRubble[] {
    return [...this.cells].map((cell) => cell.split(":").map(Number) as SavedRubble).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }

  count(): number {
    return this.cells.size;
  }
}

function key(x: number, z: number): string {
  return `${Math.round(x * 100) / 100}:${Math.round(z * 100) / 100}`;
}

