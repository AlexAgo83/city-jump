import type { BuildingParcel } from "./slots";
import { distXZ, type Vec3 } from "./vec";
import { WAVE_STARTING_VALUES } from "./wave";

export interface Battery {
  readonly position: Vec3;
  readonly range: number;
  readonly damage: number;
}

export function batteriesForParcels(parcels: readonly Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells" | "position">[]): Battery[] {
  return parcels
    .filter((parcel) => parcel.kind === "military")
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

