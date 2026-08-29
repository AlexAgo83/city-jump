import { describe, it, expect } from "vitest";
import { ROAD_TYPES, roadType, baseRoadTypeId, composeRoadTypeId } from "./roadTypes";

describe("road type variants", () => {
  it("composes the four lane/one-way combinations for street, avenue, tunnel and highway", () => {
    for (const base of ["street", "avenue", "tunnel", "highway"]) {
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
    for (const base of ["street", "avenue", "tunnel", "highway"]) {
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
    for (const id of ["street", "avenue", "tunnel", "pedestrian"]) {
      expect(roadType(id).highway).toBeUndefined();
    }
  });

  it("gives each road category its own speed, carried by every lane/one-way variant of it", () => {
    const bySpeed: [string, number][] = [
      ["street", 12],
      ["tunnel", 14],
      ["avenue", 16],
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

  it("rejects an unknown id", () => {
    expect(() => roadType("bicycle_lane")).toThrow(/unknown road type/);
  });
});
