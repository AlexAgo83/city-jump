export interface RoadType {
  readonly id: string;
  readonly name: string;
  /** Full carriageway width in metres. The mesh and the building setback both read it. */
  readonly width: number;
  readonly tunnelDepth?: number;
  /** No cars: this one carries people on foot. */
  readonly pedestrian?: boolean;
}

export const ROAD_TYPES: Record<string, RoadType> = {
  street: { id: "street", name: "Street", width: 8 },
  avenue: { id: "avenue", name: "Avenue", width: 14 },
  tunnel: { id: "tunnel", name: "Tunnel", width: 9, tunnelDepth: 16 },
  pedestrian: { id: "pedestrian", name: "Pedestrian", width: 4, pedestrian: true },
};

export const DEFAULT_ROAD_TYPE = "street";

export function roadType(id: string): RoadType {
  const t = ROAD_TYPES[id];
  if (!t) throw new Error(`unknown road type: ${id}`);
  return t;
}
