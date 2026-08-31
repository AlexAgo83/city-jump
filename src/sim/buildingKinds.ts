import type { BuildingParcel } from "./slots";

export type BuildingKind = "residential" | "commercial" | "industrial" | "agricultural" | "military";

/** One colour per business, so the zone overlay and the buildings themselves never disagree. */
export const BUILDING_KIND_COLOR: Record<BuildingKind, readonly [number, number, number]> = {
  residential: [0.32, 0.78, 0.42],
  commercial: [0.26, 0.55, 0.95],
  industrial: [0.93, 0.82, 0.24],
  agricultural: [0.95, 0.6, 0.18],
  military: [0.6, 0.35, 0.85],
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
