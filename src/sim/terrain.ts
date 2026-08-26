/**
 * Every elevation in the game comes through `terrainHeight`. The first pass is flat;
 * swapping in a heightmap is a call to `setTerrain` and nothing else in the graph moves.
 */
export interface Terrain {
  heightAt(x: number, z: number): number;
}

export const flatTerrain: Terrain = { heightAt: () => 0 };

let active: Terrain = flatTerrain;

export function setTerrain(terrain: Terrain): void {
  active = terrain;
}

export function terrainHeight(x: number, z: number): number {
  return active.heightAt(x, z);
}
