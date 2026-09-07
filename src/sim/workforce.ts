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
 * The last allocation, returned again when nothing it depends on has moved.
 *
 * The panel asks for this every frame -- twice, until the batteries started sharing the answer --
 * with the same parcels and a population that only matters to the whole resident. The allocation
 * is a pure function of the parcel list, the whole-resident workforce and the incumbency callback,
 * so an identical call has an identical answer. Two things are taken on trust, and both hold in
 * the city: a parcel array is replaced on every rebuild rather than mutated in place, and an
 * incumbency callback whose answers move between ticks is a fresh closure each tick -- the
 * building lifecycle builds one per `sync`, so its allocation is always dealt afresh.
 */
let lastAllocation: { parcels: readonly unknown[]; workforce: number; wasStaffed: unknown; staffing: Staffing } | null = null;

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
  if (lastAllocation && lastAllocation.parcels === parcels && lastAllocation.workforce === available && lastAllocation.wasStaffed === wasStaffed) {
    return lastAllocation.staffing;
  }
  const byKind = Object.fromEntries(PRIORITY.map((kind) => [kind, { demand: 0, staffedDemand: 0, staffed: 0, idle: 0 }])) as Record<Exclude<BuildingKind, "residential">, MutableBucket>;
  const staffed = new Map<number, boolean>();
  // Priority and incumbency are settled before the sort, not inside its comparator: both were
  // being asked for O(n log n) times per frame for an answer that cannot change mid-sort, and
  // incumbency is a coordinate key built to look up a map.
  const jobs = parcels
    .map((parcel, index) => ({ parcel, index, demand: workforceDemand(parcel), priority: PRIORITY.indexOf(parcel.kind as Exclude<BuildingKind, "residential">), incumbent: 0 }))
    .filter((job): job is { parcel: T & { kind: Exclude<BuildingKind, "residential"> }; index: number; demand: number; priority: number; incumbent: number } => job.demand > 0);
  if (wasStaffed) for (const job of jobs) job.incumbent = wasStaffed(job.parcel as T) ? 1 : 0;
  jobs.sort((a, b) => a.priority - b.priority || b.incumbent - a.incumbent || b.demand - a.demand || a.index - b.index);

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

  const staffing: Staffing = {
    workforce: workforceFromPopulation(population),
    demand: jobs.reduce((sum, job) => sum + job.demand, 0),
    staffedDemand: Object.values(byKind).reduce((sum, bucket) => sum + bucket.staffedDemand, 0),
    parcels: jobs.map((job) => ({ index: job.index, demand: job.demand, staffed: staffed.get(job.index) === true })),
    byKind,
  };
  lastAllocation = { parcels, workforce: workforceFromPopulation(population), wasStaffed, staffing };
  return staffing;
}
