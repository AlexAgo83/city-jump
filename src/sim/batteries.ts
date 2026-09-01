import type { BuildingParcel } from "./slots";
import { distXZ, type Vec3 } from "./vec.js";
import { WAVE_STARTING_VALUES } from "./wave.js";
import { allocateWorkforce } from "./workforce.js";

export interface Battery {
  readonly position: Vec3;
  readonly range: number;
  readonly damage: number;
}

export function batteriesForParcels(parcels: readonly Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells" | "position">[], population?: number): Battery[] {
  const staffed = population === undefined ? null : new Set(allocateWorkforce(parcels, population).parcels.filter((parcel) => parcel.staffed).map((parcel) => parcel.index));
  return parcels
    .filter((parcel, index) => parcel.kind === "military" && (!staffed || staffed.has(index)))
    .map((parcel) => ({
      position: parcel.position,
      range: WAVE_STARTING_VALUES.batteryRangeM,
      damage: parcel.frontageCells * parcel.depthCells * WAVE_STARTING_VALUES.damagePerParcelCell,
    }));
}

export function batteriesInRange(batteries: readonly Battery[], target: Vec3): Battery[] {
  return batteries.filter((battery) => distXZ(battery.position, target) <= battery.range);
}

export function firepowerPerMinute(batteries: readonly Battery[]): number {
  return batteries.reduce((sum, battery) => sum + battery.damage, 0) * (60 / WAVE_STARTING_VALUES.reloadSeconds);
}
