import type { BuildingParcel } from "./slots";

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

/** Homes one farm can feed. A gauge in parcels, not a stock -- the real one arrives with the economy. */
const HOMES_PER_FARM = 3;

export function buildingNeeds(parcels: readonly Pick<BuildingParcel, "kind">[]): BuildingNeed[] {
  const count = (kind: BuildingKind): number => parcels.filter((parcel) => parcel.kind === kind).length;
  const residential = count("residential");
  const commercial = count("commercial");
  const industrial = count("industrial");
  const agricultural = count("agricultural");
  const military = count("military");
  return [
    need("residential", residential, commercial + industrial + agricultural + military * 2),
    need("commercial", commercial, industrial),
    need("agricultural", agricultural, Math.ceil(residential / HOMES_PER_FARM)),
    need("industrial", industrial, military),
    need("military", military, Math.min(Math.floor(residential / 2), industrial)),
  ];
}

export function population(parcels: readonly Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">[]): number {
  return parcels
    .filter((parcel) => parcel.kind === "residential")
    .reduce((sum, parcel) => sum + parcel.frontageCells * parcel.depthCells * 12, 0);
}

function need(kind: BuildingKind, supply: number, need: number): BuildingNeed {
  return { kind, supply, need, ratio: need <= 0 ? (supply > 0 ? 1 : 0) : Math.min(1, supply / need) };
}
