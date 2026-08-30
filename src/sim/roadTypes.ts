export interface RoadType {
  readonly id: string;
  readonly name: string;
  /** Full carriageway width in metres. The mesh and the building setback both read it. */
  readonly width: number;
  /** How fast traffic moves along it, in the game's own speed units (see traffic.ts). */
  readonly maxSpeed: number;
  readonly tunnelDepth?: number;
  /** No cars: this one carries people on foot. */
  readonly pedestrian?: boolean;
  /** No frontage: nothing gets to build on it, and it gets guardrails instead of a sidewalk. */
  readonly highway?: boolean;
  /** Lanes each way (or total, if one-way). Two lanes widen the carriageway and get a lane line. */
  readonly lanes: 1 | 2;
  /** All traffic moves the same way -- no oncoming lane to share the road with. */
  readonly oneWay?: boolean;
}

/** Extra carriageway width one more lane needs. */
const LANE_WIDTH = 3.5;

const BASE_ROAD_TYPES = {
  street: { id: "street", name: "Street", width: 8, maxSpeed: 12 },
  avenue: { id: "avenue", name: "Avenue", width: 14, maxSpeed: 16 },
  tunnel: { id: "tunnel", name: "Tunnel", width: 9, tunnelDepth: 16, maxSpeed: 14 },
  highway: { id: "highway", name: "Highway", width: 20, highway: true, maxSpeed: 24 },
  pedestrian: { id: "pedestrian", name: "Pedestrian", width: 4, pedestrian: true, maxSpeed: 12 },
} as const;

/**
 * Every base type but the pedestrian path also comes as 2-lane and/or one-way -- that is a rule
 * ("which roads can be one-way" = all of them except paths), not a list of names to keep in sync
 * by hand, so the variants are composed from the base rather than written out.
 */
function variantsOf(base: (typeof BASE_ROAD_TYPES)[keyof typeof BASE_ROAD_TYPES]): RoadType[] {
  if ("pedestrian" in base && base.pedestrian) return [{ ...base, lanes: 1 }];
  const combos: { lanes: 1 | 2; oneWay: boolean }[] = [
    { lanes: 1, oneWay: false },
    { lanes: 2, oneWay: false },
    { lanes: 1, oneWay: true },
    { lanes: 2, oneWay: true },
  ];
  return combos.map(({ lanes, oneWay }) => {
    const suffix = `${lanes === 2 ? "_2lane" : ""}${oneWay ? "_oneway" : ""}`;
    const label = [lanes === 2 ? "2 lanes" : null, oneWay ? "one-way" : null].filter(Boolean).join(", ");
    // Two-way base width already carries one lane each direction. Doubling to two lanes each
    // way doubles the lane count on both sides, so it needs two lanes' worth of new pavement, not
    // one. One-way frees up the opposite direction's share instead, so its second lane fits
    // inside the width the road already had -- widening it too would leave a lane's worth of
    // unused pavement instead of a second lane of traffic.
    return {
      ...base,
      id: `${base.id}${suffix}`,
      name: label ? `${base.name} (${label})` : base.name,
      width: base.width + (lanes - 1) * LANE_WIDTH * (oneWay ? 0 : 2),
      lanes,
      ...(oneWay ? { oneWay: true } : {}),
    };
  });
}

export const ROAD_TYPES: Record<string, RoadType> = Object.fromEntries(
  Object.values(BASE_ROAD_TYPES)
    .flatMap(variantsOf)
    .map((type) => [type.id, type]),
);

export const DEFAULT_ROAD_TYPE = "street";

export function roadType(id: string): RoadType {
  const t = ROAD_TYPES[id];
  if (!t) throw new Error(`unknown road type: ${id}`);
  return t;
}

/** The base id a variant was composed from, e.g. "avenue_2lane_oneway" -> "avenue". */
export function baseRoadTypeId(id: string): string {
  return id.split("_")[0]!;
}

/** Builds the variant id for a base type plus the lane/one-way choices the player picked. */
export function composeRoadTypeId(baseId: string, lanes: 1 | 2, oneWay: boolean): string {
  if (baseId === "pedestrian") return "pedestrian";
  return `${baseId}${lanes === 2 ? "_2lane" : ""}${oneWay ? "_oneway" : ""}`;
}

/**
 * The two walkways a road carries: a path's own narrow lane down each side of its centre, or an
 * ordinary road's actual sidewalks either side of the carriageway. On foot there is no one-way
 * restriction -- both directions always get their own side, whatever the road's own vehicles do
 * -- so unlike `laneCentres` this never depends on `oneWay` or `lanes`. `sidewalkWidth` is passed
 * in rather than imported: this stays a plain function of `RoadType`, no render-layer constant.
 * Not meaningful for a highway (guardrails, no footway) or a tunnel -- callers skip those.
 */
export function walkCentres(type: RoadType, sidewalkWidth: number): LaneCentre[] {
  const half = type.width / 2;
  const walkOffset = type.pedestrian ? Math.max(0.7, half * 0.45) : half + sidewalkWidth / 2;
  return [
    { offset: -walkOffset, direction: 1 },
    { offset: walkOffset, direction: -1 },
  ];
}

/** One physical lane: how far it sits from the centreline (signed), and which way it flows. */
export interface LaneCentre {
  readonly offset: number;
  readonly direction: 1 | -1;
}

/**
 * Every physical lane a road type has, as the sideways offset traffic in it actually uses and
 * the direction it carries. Shared by traffic (to place cars) and the road renderer (to draw a
 * lane-view overlay), so the two can never show a car sitting somewhere the drawn lane isn't.
 *
 * A two-way road only owns half the carriageway per direction, so its lane(s) sit centred on
 * that half. A one-way road owns the whole carriageway (that is exactly why it no longer widens
 * for a second lane), so its lanes centre on the road itself. Two real lanes need real spacing:
 * a car is CAR_WIDTH wide, so two lane centres closer than LANE_PITCH apart put their bodies
 * through each other, and one closer than CENTRE_CLEARANCE to the road's own centre swings into
 * the oncoming lane. Those are floors, not fixed values -- on a wide avenue holding lanes there
 * leaves them huddled by the centreline with the rest of the carriageway empty, so lanes also
 * spread proportionally to how much half-width is actually there, capped so the outer lane still
 * clears the curb.
 */
export function laneCentres(type: RoadType): LaneCentre[] {
  const CAR_WIDTH = 3; // matches the car mesh in traffic.ts
  const LANE_PITCH = CAR_WIDTH + 0.4;
  const CENTRE_CLEARANCE = CAR_WIDTH / 2 + 0.3;
  const halfWidth = type.width / 2;
  const maxLaneOffset = halfWidth - CAR_WIDTH / 2 - 0.3; // stays clear of the sidewalk
  const singleLaneOffset = type.oneWay ? 0 : Math.min(Math.max(CENTRE_CLEARANCE, halfWidth * 0.5), maxLaneOffset);
  const innerLane = Math.max(CENTRE_CLEARANCE, halfWidth * 0.3);
  const outerLane = Math.min(Math.max(innerLane + LANE_PITCH, halfWidth * 0.65), maxLaneOffset);
  const oneWaySpread = Math.min(Math.max(LANE_PITCH / 2, halfWidth * 0.3), maxLaneOffset);

  if (type.lanes === 1) {
    return type.oneWay
      ? [{ offset: 0, direction: 1 }]
      : [
          { offset: -singleLaneOffset, direction: 1 },
          { offset: singleLaneOffset, direction: -1 },
        ];
  }
  return type.oneWay
    ? [
        { offset: oneWaySpread, direction: 1 },
        { offset: -oneWaySpread, direction: 1 },
      ]
    : [
        { offset: -innerLane, direction: 1 },
        { offset: -outerLane, direction: 1 },
        { offset: innerLane, direction: -1 },
        { offset: outerLane, direction: -1 },
      ];
}
