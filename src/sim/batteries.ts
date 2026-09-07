import type { BuildingParcel } from "./slots";
import { distXZ, type Vec3 } from "./vec.js";
import { WAVE_STARTING_VALUES } from "./wave.js";
import { allocateWorkforce, type Staffing } from "./workforce.js";

export interface Battery {
  readonly position: Vec3;
  readonly range: number;
  readonly damage: number;
}

/**
 * @param wasStaffed Passed straight to the allocation, so the guns that fire are the ones the
 * city says are staffed rather than a second, independent deal of the same workforce.
 */
export function batteriesForParcels<T extends Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells" | "position">>(parcels: readonly T[], population?: number, wasStaffed?: (parcel: T) => boolean): Battery[] {
  return batteriesForStaffing(parcels, population === undefined ? null : allocateWorkforce(parcels, population, wasStaffed));
}

/**
 * The same batteries from an allocation the caller already has. The needs panel deals one every
 * frame and then asked for a second, identical one just to learn which barracks are staffed.
 */
export function batteriesForStaffing<T extends Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells" | "position">>(parcels: readonly T[], staffing: Staffing | null): Battery[] {
  const staffed = staffing === null ? null : new Set(staffing.parcels.filter((parcel) => parcel.staffed).map((parcel) => parcel.index));
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
