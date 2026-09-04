import type { TerrainBounds } from "../sim/heightmap";
import { buildingParcels, parcelsForDemand, type BuildableCell, type BuildingParcel } from "../sim/slots";
import type { Zones } from "../sim/zones";

export function admittedParcels(
  cells: readonly BuildableCell[],
  zones: Zones,
  population: number,
  seconds: number,
  standing?: (parcel: BuildingParcel) => boolean,
): BuildingParcel[] {
  return parcelsForDemand(buildingParcels(cells, zones), population, seconds, standing);
}

/** A lot's identity across re-packs: where it stands. */
export function parcelId(parcel: BuildingParcel): string {
  return `${Math.round(parcel.position.x)}:${Math.round(parcel.position.z)}`;
}

export function parcelBounds(parcel: BuildingParcel): TerrainBounds {
  const points = parcel.cells.flatMap((cell) => cell.corners);
  return {
    minX: Math.min(...points.map((point) => point.x)) - 16,
    maxX: Math.max(...points.map((point) => point.x)) + 16,
    minZ: Math.min(...points.map((point) => point.z)) - 16,
    maxZ: Math.max(...points.map((point) => point.z)) + 16,
  };
}

export function samePosition(a: { x: number; z: number }, b: { x: number; z: number }): boolean {
  return Math.abs(a.x - b.x) < 0.01 && Math.abs(a.z - b.z) < 0.01;
}
