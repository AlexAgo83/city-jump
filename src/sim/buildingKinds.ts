import type { BuildingParcel } from "./slots";
import { allocateWorkforce } from "./workforce";
import { housingCapacity } from "./economy";
import { parcelDemandLimits } from "./slots";

export type BuildingKind = "residential" | "commercial" | "industrial" | "agricultural" | "military";

/**
 * One colour per business, so the zone overlay and the buildings themselves never disagree.
 *
 * They are also spread in *lightness*, not only in hue: an eye that does not separate red from
 * green still separates dark from light, and so does a greyscale screenshot. Agriculture was
 * orange, which put it within 0.012 relative luminance of residential green -- the same
 * brightness, and so the same colour to a good share of players. Brown is the same idea as orange
 * with the lightness the palette needed, and commerce moved a little to keep its own distance
 * from military purple. Relative luminance runs 0.31, 0.44, 0.55, 0.66, 0.80: no two closer than
 * a tenth.
 */
export const BUILDING_KIND_COLOR: Record<BuildingKind, readonly [number, number, number]> = {
  agricultural: [0.45, 0.28, 0.14],
  military: [0.6, 0.35, 0.85],
  commercial: [0.28, 0.58, 0.97],
  residential: [0.32, 0.78, 0.42],
  industrial: [0.93, 0.82, 0.24],
};

export interface BuildingNeed {
  readonly kind: BuildingKind;
  readonly supply: number;
  readonly need: number;
  readonly ratio: number;
}

export function buildingNeeds(parcels: readonly Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">[], residents = population(parcels)): BuildingNeed[] {
  const staffing = allocateWorkforce(parcels, residents);
  const limits = parcelDemandLimits(residents);
  return [
    need("residential", staffing.workforce, staffing.demand),
    need("commercial", parcels.filter((parcel) => parcel.kind === "commercial").length, limits.commercial),
    need("agricultural", parcels.filter((parcel) => parcel.kind === "agricultural").length, limits.agricultural),
    need("industrial", parcels.filter((parcel) => parcel.kind === "industrial").length, limits.industrial),
    need("military", staffing.byKind.military.staffed, staffing.byKind.military.staffed + staffing.byKind.military.idle),
  ];
}

export function population(parcels: readonly Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">[]): number {
  return housingCapacity(parcels);
}

function need(kind: BuildingKind, supply: number, need: number): BuildingNeed {
  return { kind, supply, need, ratio: need <= 0 ? (supply > 0 ? 1 : 0) : Math.min(1, supply / need) };
}
