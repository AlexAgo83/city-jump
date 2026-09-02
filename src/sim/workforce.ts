import type { BuildingKind } from "./buildingKinds";
import type { BuildingParcel } from "./slots";

type WorkforceParcel = Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">;

export interface Staffing {
  readonly workforce: number;
  readonly demand: number;
  readonly staffedDemand: number;
  readonly parcels: readonly { readonly index: number; readonly demand: number; readonly staffed: boolean }[];
  readonly byKind: Record<Exclude<BuildingKind, "residential">, { readonly demand: number; readonly staffedDemand: number; readonly staffed: number; readonly idle: number }>;
}

const PRIORITY: readonly Exclude<BuildingKind, "residential">[] = ["military", "agricultural", "industrial", "commercial"];
type MutableBucket = { demand: number; staffedDemand: number; staffed: number; idle: number };

export function workforceFromPopulation(population: number): number {
  return Math.floor(population);
}

export function workforceDemand(parcel: WorkforceParcel): number {
  if (parcel.kind === "residential") return 0;
  const cells = parcel.frontageCells * parcel.depthCells;
  const perCell = parcel.kind === "military" ? 3 : parcel.kind === "industrial" ? 6 : parcel.kind === "commercial" ? 4 : 1;
  return cells * perCell;
}

/**
 * @param wasStaffed Which lots had the workforce a moment ago, if the caller remembers.
 *
 * The allocation is re-dealt from scratch every tick, and a lot is staffed whole or not at all, so
 * the lot sitting on the line where the pool runs out flipped between working and idle as the
 * population moved by a resident or two. It lands on the barracks by construction: military is
 * served first and asks for the most, so the cut falls inside it -- which is why a military
 * district read as flickering black, `idle` being drawn dark.
 *
 * Whoever had the shift keeps it, all else equal. No threshold to tune: the same number of lots is
 * staffed, it is simply the same lots from one tick to the next.
 */
export function allocateWorkforce<T extends WorkforceParcel>(parcels: readonly T[], population: number, wasStaffed?: (parcel: T) => boolean): Staffing {
  let available = workforceFromPopulation(population);
  const byKind = Object.fromEntries(PRIORITY.map((kind) => [kind, { demand: 0, staffedDemand: 0, staffed: 0, idle: 0 }])) as Record<Exclude<BuildingKind, "residential">, MutableBucket>;
  const staffed = new Map<number, boolean>();
  const jobs = parcels
    .map((parcel, index) => ({ parcel, index, demand: workforceDemand(parcel) }))
    .filter((job): job is { parcel: T & { kind: Exclude<BuildingKind, "residential"> }; index: number; demand: number } => job.demand > 0)
    .sort(
      (a, b) =>
        PRIORITY.indexOf(a.parcel.kind) - PRIORITY.indexOf(b.parcel.kind) ||
        Number(wasStaffed?.(b.parcel as T) ?? false) - Number(wasStaffed?.(a.parcel as T) ?? false) ||
        b.demand - a.demand ||
        a.index - b.index,
    );

  for (const job of jobs) {
    const bucket = byKind[job.parcel.kind];
    bucket.demand += job.demand;
    if (available >= job.demand) {
      available -= job.demand;
      staffed.set(job.index, true);
      bucket.staffedDemand += job.demand;
      bucket.staffed += 1;
    } else {
      staffed.set(job.index, false);
      bucket.idle += 1;
    }
  }

  return {
    workforce: workforceFromPopulation(population),
    demand: jobs.reduce((sum, job) => sum + job.demand, 0),
    staffedDemand: Object.values(byKind).reduce((sum, bucket) => sum + bucket.staffedDemand, 0),
    parcels: jobs.map((job) => ({ index: job.index, demand: job.demand, staffed: staffed.get(job.index) === true })),
    byKind,
  };
}
