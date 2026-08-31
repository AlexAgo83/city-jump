import type { BuildingKind } from "./buildingKinds";
import type { BuildingParcel } from "./slots";

type WorkforceParcel = Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">;

export interface Staffing {
  readonly workforce: number;
  readonly demand: number;
  readonly staffedDemand: number;
  readonly byKind: Record<Exclude<BuildingKind, "residential">, { readonly demand: number; readonly staffedDemand: number; readonly staffed: number; readonly idle: number }>;
}

const PRIORITY: readonly Exclude<BuildingKind, "residential">[] = ["military", "agricultural", "industrial", "commercial"];
type MutableBucket = { demand: number; staffedDemand: number; staffed: number; idle: number };

export function workforceFromPopulation(population: number): number {
  return Math.floor(population / 2);
}

export function workforceDemand(parcel: WorkforceParcel): number {
  if (parcel.kind === "residential") return 0;
  const cells = parcel.frontageCells * parcel.depthCells;
  const perCell = parcel.kind === "military" ? 8 : parcel.kind === "industrial" ? 6 : parcel.kind === "commercial" ? 4 : 3;
  return cells * perCell;
}

export function allocateWorkforce(parcels: readonly WorkforceParcel[], population: number): Staffing {
  let available = workforceFromPopulation(population);
  const byKind = Object.fromEntries(PRIORITY.map((kind) => [kind, { demand: 0, staffedDemand: 0, staffed: 0, idle: 0 }])) as Record<Exclude<BuildingKind, "residential">, MutableBucket>;
  const jobs = parcels
    .map((parcel, index) => ({ parcel, index, demand: workforceDemand(parcel) }))
    .filter((job): job is { parcel: WorkforceParcel & { kind: Exclude<BuildingKind, "residential"> }; index: number; demand: number } => job.demand > 0)
    .sort((a, b) => PRIORITY.indexOf(a.parcel.kind) - PRIORITY.indexOf(b.parcel.kind) || b.demand - a.demand || a.index - b.index);

  for (const job of jobs) {
    const bucket = byKind[job.parcel.kind];
    bucket.demand += job.demand;
    if (available >= job.demand) {
      available -= job.demand;
      bucket.staffedDemand += job.demand;
      bucket.staffed += 1;
    } else {
      bucket.idle += 1;
    }
  }

  return {
    workforce: workforceFromPopulation(population),
    demand: jobs.reduce((sum, job) => sum + job.demand, 0),
    staffedDemand: Object.values(byKind).reduce((sum, bucket) => sum + bucket.staffedDemand, 0),
    byKind,
  };
}
