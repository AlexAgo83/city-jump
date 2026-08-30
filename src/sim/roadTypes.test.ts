import { describe, it, expect } from "vitest";
import { ROAD_TYPES, roadType, baseRoadTypeId, composeRoadTypeId, laneCentres, walkCentres } from "./roadTypes";

const SIDEWALK_WIDTH = 2.6; // a stand-in for roadMesh.ts's own constant; walkCentres takes it as a plain number

describe("road type variants", () => {
  it("composes the four lane/one-way combinations for street, avenue, industrial, tunnel and highway", () => {
    for (const base of ["street", "avenue", "industrial", "tunnel", "highway"]) {
      expect(composeRoadTypeId(base, 1, false)).toBe(base);
      expect(composeRoadTypeId(base, 2, false)).toBe(`${base}_2lane`);
      expect(composeRoadTypeId(base, 1, true)).toBe(`${base}_oneway`);
      expect(composeRoadTypeId(base, 2, true)).toBe(`${base}_2lane_oneway`);
      for (const id of [base, `${base}_2lane`, `${base}_oneway`, `${base}_2lane_oneway`]) {
        expect(roadType(id)).toBeDefined();
        expect(baseRoadTypeId(id)).toBe(base);
      }
    }
  });

  it("widens a two-way road for a second lane on both sides, but fits a one-way's second lane in the space its opposite direction gave up", () => {
    for (const base of ["street", "avenue", "industrial", "tunnel", "highway"]) {
      const oneLane = roadType(base).width;
      expect(roadType(`${base}_2lane`).width).toBe(oneLane + 7);
      expect(roadType(`${base}_oneway`).width).toBe(oneLane);
      expect(roadType(`${base}_2lane_oneway`).width).toBe(oneLane);
    }
  });

  it("flags one-way variants and leaves two-way ones unflagged", () => {
    expect(roadType("street").oneWay).toBeUndefined();
    expect(roadType("street_2lane").oneWay).toBeUndefined();
    expect(roadType("street_oneway").oneWay).toBe(true);
    expect(roadType("street_2lane_oneway").oneWay).toBe(true);
  });

  it("gives pedestrian paths no lane or one-way choice", () => {
    expect(composeRoadTypeId("pedestrian", 2, true)).toBe("pedestrian");
    expect(ROAD_TYPES["pedestrian_2lane"]).toBeUndefined();
    expect(ROAD_TYPES["pedestrian_oneway"]).toBeUndefined();
    const pedestrian = roadType("pedestrian");
    expect(pedestrian.lanes).toBe(1);
    expect(pedestrian.oneWay).toBeUndefined();
  });

  it("flags every highway variant, but no other type, as carrying no frontage", () => {
    for (const id of ["highway", "highway_2lane", "highway_oneway", "highway_2lane_oneway"]) {
      expect(roadType(id).highway).toBe(true);
    }
    for (const id of ["street", "avenue", "industrial", "tunnel", "pedestrian"]) {
      expect(roadType(id).highway).toBeUndefined();
    }
  });

  it("makes industrial roads avenue-sized", () => {
    expect(roadType("industrial").width).toBe(roadType("avenue").width);
    expect(roadType("industrial").industrial).toBe(true);
  });

  it("gives each road category its own speed, carried by every lane/one-way variant of it", () => {
    const bySpeed: [string, number][] = [
      ["street", 12],
      ["tunnel", 14],
      ["avenue", 16],
      ["industrial", 16],
      ["highway", 24],
    ];
    for (const [base, speed] of bySpeed) {
      for (const id of [base, `${base}_2lane`, `${base}_oneway`, `${base}_2lane_oneway`]) {
        expect(roadType(id).maxSpeed).toBe(speed);
      }
    }
    // Ordered fastest to slowest, so a highway is never accidentally the slowest road in town.
    expect(roadType("highway").maxSpeed).toBeGreaterThan(roadType("avenue").maxSpeed);
    expect(roadType("avenue").maxSpeed).toBeGreaterThan(roadType("tunnel").maxSpeed);
    expect(roadType("tunnel").maxSpeed).toBeGreaterThan(roadType("street").maxSpeed);
  });

  describe("laneCentres", () => {
    it("gives a two-way single-lane road one lane each direction, symmetric about the centre", () => {
      const lanes = laneCentres(roadType("street"));
      expect(lanes).toHaveLength(2);
      const [a, b] = lanes;
      expect(a!.offset).toBeCloseTo(-b!.offset, 6);
      expect(Math.abs(a!.offset)).toBeCloseTo(roadType("street").width / 4);
      expect(a!.direction).not.toBe(b!.direction);
    });

    it("gives a one-way single-lane road exactly one lane, centred on the road", () => {
      const lanes = laneCentres(roadType("street_oneway"));
      expect(lanes).toEqual([{ offset: 0, direction: 1 }]);
    });

    it("gives a two-way 2-lane road four lanes, two each direction, with the inner lane clear of the centreline", () => {
      const lanes = laneCentres(roadType("avenue_2lane"));
      expect(lanes).toHaveLength(4);
      const byDirection = new Map<number, number[]>();
      for (const lane of lanes) byDirection.set(lane.direction, [...(byDirection.get(lane.direction) ?? []), lane.offset]);
      expect([...byDirection.keys()].sort()).toEqual([-1, 1]);
      for (const offsets of byDirection.values()) {
        expect(offsets).toHaveLength(2);
        // Both lanes on the same side of the road, same sign, and clear of the centreline.
        expect(Math.sign(offsets[0]!)).toBe(Math.sign(offsets[1]!));
        expect(Math.min(...offsets.map(Math.abs))).toBeGreaterThan(0);
      }
    });

    it("gives a one-way 2-lane road two lanes, both the same direction, spread across the road", () => {
      const lanes = laneCentres(roadType("street_2lane_oneway"));
      expect(lanes).toHaveLength(2);
      expect(lanes[0]!.direction).toBe(1);
      expect(lanes[1]!.direction).toBe(1);
      expect(lanes[0]!.offset).toBeCloseTo(-lanes[1]!.offset, 6);
      expect(lanes[0]!.offset).not.toBe(0);
    });

    it("never puts a lane's centre off the edge of the carriageway", () => {
      for (const id of Object.keys(ROAD_TYPES)) {
        const type = roadType(id);
        if (type.pedestrian) continue;
        for (const lane of laneCentres(type)) expect(Math.abs(lane.offset)).toBeLessThan(type.width / 2);
      }
    });
  });

  describe("walkCentres", () => {
    it("gives an ordinary road a sidewalk on each side, clear of the carriageway", () => {
      const type = roadType("street");
      const walks = walkCentres(type, SIDEWALK_WIDTH);
      expect(walks).toHaveLength(2);
      const [a, b] = walks;
      expect(a!.offset).toBeCloseTo(-b!.offset, 6);
      expect(a!.direction).not.toBe(b!.direction);
      for (const walk of walks) expect(Math.abs(walk.offset)).toBeGreaterThan(type.width / 2);
    });

    it("gives a pedestrian path a narrower walkway than an ordinary road's sidewalk", () => {
      const pathWalk = Math.abs(walkCentres(roadType("pedestrian"), SIDEWALK_WIDTH)[0]!.offset);
      const streetWalk = Math.abs(walkCentres(roadType("street"), SIDEWALK_WIDTH)[0]!.offset);
      expect(pathWalk).toBeLessThan(streetWalk);
    });

    it("does not otherwise depend on lanes or one-way, only on the carriageway's own width", () => {
      // One-way never widens a road (see roadTypes.ts), so these keep the base's width and, with
      // it, the exact same sidewalks -- unlike a car's laneCentres, which reads oneWay directly.
      const base = walkCentres(roadType("avenue"), SIDEWALK_WIDTH);
      for (const id of ["avenue_oneway", "avenue_2lane_oneway"]) {
        expect(walkCentres(roadType(id), SIDEWALK_WIDTH)).toEqual(base);
      }
      // A two-way 2-lane avenue IS wider, so its sidewalks sit further out by exactly that much.
      const wide = roadType("avenue_2lane");
      const widened = walkCentres(wide, SIDEWALK_WIDTH)[1]!.offset;
      expect(widened).toBeCloseTo(wide.width / 2 + SIDEWALK_WIDTH / 2, 6);
    });
  });

  it("rejects an unknown id", () => {
    expect(() => roadType("bicycle_lane")).toThrow(/unknown road type/);
  });
});
