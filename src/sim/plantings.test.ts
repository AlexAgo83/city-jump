import { describe, expect, it } from "vitest";

import { RoadGraph } from "./graph";
import { Plantings, REMOVAL_RADIUS } from "./plantings";
import { Rubble } from "./rubble";
import { serializeCity, restoreCity } from "./save";
import { Zones } from "./zones";

describe("plantings", () => {
  it("records only real generated-tree removals and dedupes by radius", () => {
    const plantings = new Plantings();

    expect(plantings.clear(10, 10)).toBe(false);
    expect(plantings.clearedPoints).toHaveLength(0);

    expect(plantings.clear(10, 10, true)).toBe(true);
    expect(plantings.clear(10 + REMOVAL_RADIUS / 2, 10, true)).toBe(false);
    expect(plantings.clearedPoints).toHaveLength(1);
    expect(plantings.isCleared(10 + REMOVAL_RADIUS / 2, 10)).toBe(true);
  });

  it("drops hand-planted trees instead of recording a clearing", () => {
    const plantings = new Plantings();
    plantings.plant(10, 10, "oak");

    expect(plantings.clear(10, 10)).toBe(true);

    expect(plantings.plantedTrees).toHaveLength(0);
    expect(plantings.clearedPoints).toHaveLength(0);
  });

  it("keeps generated clearings through a save round-trip", () => {
    const plantings = new Plantings();
    plantings.clear(30, 40, true);
    const save = serializeCity(new RoadGraph(), plantings, new Zones(), "rolling", 14);
    const restored = new Plantings();

    restoreCity(new RoadGraph(), restored, new Zones(), save, new Rubble());

    expect(restored.isCleared(30, 40)).toBe(true);
  });
});
