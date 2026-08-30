import type { RoadGraph, Segment, SegmentId } from "./graph";
import { baseRoadTypeId } from "./roadTypes";
import { GRID, type BuildingParcel } from "./slots";

export interface Street {
  readonly id: number;
  readonly name: string;
  readonly segments: readonly Segment[];
}

export interface Address {
  readonly number: number;
  readonly street: Street;
}

const CORES = [
  "Ash",
  "Beech",
  "Cedar",
  "Elm",
  "Foundry",
  "Harbour",
  "Market",
  "Mill",
  "Oak",
  "Park",
  "Queen",
  "River",
];
const CARDINALS = ["North", "South", "East", "West"];

export function streets(graph: RoadGraph): Street[] {
  const groups = new Map<number, Segment[]>();
  for (const segment of graph.allSegments()) {
    const group = groups.get(segment.streetId);
    if (group) group.push(segment);
    else groups.set(segment.streetId, [segment]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, segments]) => ({ id, name: streetName(id, segments[0]?.type ?? "street"), segments }));
}

export function streetForSegment(graph: RoadGraph, segmentId: SegmentId): Street {
  const segment = graph.segment(segmentId);
  return streets(graph).find((street) => street.id === segment.streetId)!;
}

export function addressForParcel(graph: RoadGraph, parcel: BuildingParcel): Address {
  const front = parcel.cells.find((cell) => cell.row === 0) ?? parcel.cells[0]!;
  const street = streetForSegment(graph, front.segment);
  const offsets = segmentOffsets(graph, street);
  const near = graph.nearestOnSegment(parcel.position.x, parcel.position.z, GRID.cellSize * 2, (segment) => segment.id === front.segment);
  const along = (offsets.get(front.segment) ?? 0) + (near?.distance ?? front.column * GRID.cellSize);
  const index = Math.round(along / GRID.cellSize) + 1;
  return { number: index * 2 + (front.side === 1 ? 1 : 0), street };
}

export function streetName(streetId: number, type: string): string {
  const suffix = suffixFor(type);
  const index = Math.max(0, streetId - 1);
  if (index < CORES.length) return `${CORES[index]} ${suffix}`;
  const cardinal = index - CORES.length;
  if (cardinal < CORES.length * CARDINALS.length) {
    return `${CARDINALS[Math.floor(cardinal / CORES.length)]} ${CORES[cardinal % CORES.length]} ${suffix}`;
  }
  return `${ordinal(cardinal - CORES.length * CARDINALS.length + 1)} ${suffix}`;
}

function suffixFor(type: string): string {
  const base = baseRoadTypeId(type);
  if (base === "avenue") return "Avenue";
  if (base === "highway") return "Expressway";
  if (base === "pedestrian") return "Walk";
  if (base === "tunnel") return "Tunnel";
  if (base === "industrial") return "Way";
  if (base === "dirt") return "Trail";
  if (base === "military") return "Range";
  return "Street";
}

function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

function segmentOffsets(graph: RoadGraph, street: Street): Map<SegmentId, number> {
  const ordered = [...street.segments].sort((a, b) => originKey(graph, a).localeCompare(originKey(graph, b)));
  let offset = 0;
  const out = new Map<SegmentId, number>();
  for (const segment of ordered) {
    out.set(segment.id, offset);
    offset += segment.length;
  }
  return out;
}

function originKey(graph: RoadGraph, segment: Segment): string {
  const a = graph.node(segment.a).pos;
  const b = graph.node(segment.b).pos;
  return [a, b]
    .map((p) => `${p.x.toFixed(2)}:${p.z.toFixed(2)}`)
    .sort()[0]!;
}
