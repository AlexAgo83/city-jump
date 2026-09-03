/**
 * What the player has done to the trees by hand. The scenery itself is generated from the terrain
 * and the roads, so only the edits are state: trees planted where none grew, and trees cleared
 * that otherwise would.
 *
 * Removals are stored as points rather than ids because the generated trees have no stable
 * identity -- regenerate the terrain and they are all different trees. A point survives that.
 */
export interface Planting {
  readonly x: number;
  readonly z: number;
  /** Which tree stands here. Cleared points carry the default and never use it. */
  readonly species: TreeSpecies;
}

/**
 * Kept as a bare string rather than importing the renderer's union: sim must not depend on
 * render, and the renderer validates the id when it looks the species up.
 */
export type TreeSpecies = string;

/** What a planting means when a save does not name a species. */
export const DEFAULT_TREE_SPECIES: TreeSpecies = "fir";

/** How close a removal point has to be to a tree to count as that tree. */
export const REMOVAL_RADIUS = 3;

export class Plantings {
  private readonly added: Planting[] = [];
  private readonly removed: Planting[] = [];
  private readonly removedBuckets = new Map<string, Planting[]>();

  plant(x: number, z: number, species: TreeSpecies): void {
    this.added.push({ x, z, species });
  }

  /**
   * Records that whatever grows at this point has been cleared. If it was a hand-planted tree it
   * is dropped outright, since nothing else would ever put one back there.
   */
  clear(x: number, z: number, generated = false): boolean {
    const index = this.added.findIndex((tree) => Math.hypot(tree.x - x, tree.z - z) <= REMOVAL_RADIUS);
    if (index >= 0) {
      this.added.splice(index, 1);
      return true;
    }
    if (!generated || this.isCleared(x, z)) return false;
    const point = { x, z, species: DEFAULT_TREE_SPECIES };
    this.removed.push(point);
    const key = bucketKey(x, z);
    this.removedBuckets.set(key, [...(this.removedBuckets.get(key) ?? []), point]);
    return true;
  }

  isCleared(x: number, z: number): boolean {
    const bx = Math.floor(x / REMOVAL_RADIUS);
    const bz = Math.floor(z / REMOVAL_RADIUS);
    for (let oz = -1; oz <= 1; oz++) {
      for (let ox = -1; ox <= 1; ox++) {
        if ((this.removedBuckets.get(`${bx + ox}:${bz + oz}`) ?? []).some((point) => Math.hypot(point.x - x, point.z - z) <= REMOVAL_RADIUS)) return true;
      }
    }
    return false;
  }

  get plantedTrees(): readonly Planting[] {
    return this.added;
  }

  get clearedPoints(): readonly Planting[] {
    return this.removed;
  }

  get isEmpty(): boolean {
    return this.added.length === 0 && this.removed.length === 0;
  }

  replaceWith(added: readonly Planting[], removed: readonly Planting[]): void {
    this.added.length = 0;
    this.removed.length = 0;
    this.removedBuckets.clear();
    this.added.push(...added);
    for (const point of removed) {
      this.removed.push(point);
      const key = bucketKey(point.x, point.z);
      this.removedBuckets.set(key, [...(this.removedBuckets.get(key) ?? []), point]);
    }
  }
}

function bucketKey(x: number, z: number): string {
  return `${Math.floor(x / REMOVAL_RADIUS)}:${Math.floor(z / REMOVAL_RADIUS)}`;
}
