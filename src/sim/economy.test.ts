import { describe, expect, it } from "vitest";

import { buildingBuildCost, CITY_DAY_SECONDS, CityEconomy, MATERIALS_RECOVERY_SECONDS, STARTING_MONEY, Treasury, demolitionRefund, incomePerSecond, roadBuildCost } from "./economy";
import type { BuildingStatus } from "./buildingLifecycle";

const status = (kind: BuildingStatus["parcel"]["kind"], state: BuildingStatus["state"], frontageCells = 1, depthCells = 1): BuildingStatus => ({
  state,
  staffed: state === "working",
  startedAt: 0,
  progress: 1,
  remainingSeconds: 0,
  parcel: { kind, frontageCells, depthCells, position: { x: 0, y: 0, z: 0 }, rotationY: 0, cells: [] },
});

describe("economy", () => {
  it("prices roads by metre", () => {
    expect(roadBuildCost("street", 12.1)).toBe(97);
    expect(roadBuildCost("tunnel", 10)).toBe(450);
  });

  it("earns money from population and trade, but not from the works", () => {
    // Industry supplies the shops and the barracks; it does not sell anything itself.
    expect(incomePerSecond(100, [status("commercial", "working", 2, 2), status("commercial", "idle", 4, 4), status("industrial", "working", 2, 2)])).toBeCloseTo(3.4);
  });

  it("spends only what it can unless debt is allowed", () => {
    const treasury = new Treasury(100);
    expect(treasury.spend(120)).toBe(false);
    expect(treasury.money).toBe(100);
    expect(treasury.spend(120, true)).toBe(true);
    expect(treasury.money).toBe(-20);
    treasury.replaceWith();
    expect(treasury.money).toBe(STARTING_MONEY);
  });

  it("returns half the original cost on demolition", () => {
    expect(demolitionRefund(660)).toBe(330);
  });

  it("prices buildings by footprint and kind", () => {
    expect(buildingBuildCost(status("residential", "working", 2, 3).parcel)).toBe(360);
    expect(buildingBuildCost(status("military", "working", 2, 3).parcel)).toBe(1140);
  });

  it("only produces staffed food and reports treasury income as trade", () => {
    const city = new CityEconomy({ population: 20 });
    const terms = city.advance([status("residential", "working"), status("agricultural", "working"), status("industrial", "working"), status("commercial", "working")], CITY_DAY_SECONDS);

    expect(terms.food.produced).toBe(8);
    expect(terms.trade).toBeCloseTo(incomePerSecond(terms.population.value, [status("residential", "working"), status("agricultural", "working"), status("industrial", "working"), status("commercial", "working")]));
    expect(terms.food.consumed).toBe(20);
  });

  it("uses the lifecycle staffing answer instead of reallocating workforce", () => {
    const city = new CityEconomy({ materials: 100, population: 100 });
    const unstaffedShop = { ...status("commercial", "working", 2, 2), staffed: false };

    const terms = city.advance([unstaffedShop], CITY_DAY_SECONDS);

    expect(terms.materials.consumed).toBe(0);
  });

  it("grows within food and housing, then falls in famine", () => {
    const homes = [status("residential", "working", 2, 1), status("agricultural", "working"), status("commercial", "working")];
    const city = new CityEconomy({ population: 10, food: 20 });
    const grown = city.advance(homes, CITY_DAY_SECONDS);
    expect(grown.population.value).toBeGreaterThan(10);
    expect(grown.population.value).toBeLessThanOrEqual(24);
    city.replaceWith({ population: 10, food: 0 });
    expect(city.advance([homes[0]!], CITY_DAY_SECONDS).population.change).toBeLessThan(0);
  });

  it("keeps the opening fed with one starter farm", () => {
    const city = new CityEconomy({ population: 12 });
    const farm = status("agricultural", "working", 1, 4);
    const terms = city.advance([status("residential", "working", 1, 1), farm], CITY_DAY_SECONDS);

    expect(terms.food.produced).toBeGreaterThan(terms.food.consumed);
    expect(city.resources.population).toBeGreaterThan(0);
  });

  it("is deterministic and loses residents when homes disappear", () => {
    const parcels = [status("residential", "working", 2, 2), status("agricultural", "working")];
    const run = () => {
      const city = new CityEconomy({ population: 24, food: 50 });
      city.advance(parcels, CITY_DAY_SECONDS);
      return city.resources;
    };
    expect(run()).toEqual(run());
    const city = new CityEconomy({ population: 24, food: 50 });
    city.advance(parcels, CITY_DAY_SECONDS);
    // Losing every home empties the island over days, not in the tick that noticed.
    let terms = city.advance([parcels[1]!], CITY_DAY_SECONDS);
    expect(terms.population.change).toBeLessThan(0);
    expect(terms.population.value).toBeGreaterThan(0);
    for (let day = 0; day < 30 && terms.population.value > 0; day++) terms = city.advance([parcels[1]!], CITY_DAY_SECONDS);
    expect(terms.population.value).toBe(0);
  });

  it("makes a shortage last, so the shops do not blink back on the moment a crate arrives", () => {
    const economy = new CityEconomy({ food: 1000, materials: 0, population: 500 });
    economy.advance([status("commercial", "working", 4, 4)], 1);
    expect(economy.materialsShort).toBe(true);

    // The works refill the store the instant the shops stop buying from it. That is not the end of
    // the shortage: two hundred buildings turning on and off five times a second is what this
    // costs when the stock alone decides.
    const works = Array.from({ length: 20 }, () => status("industrial", "working"));
    economy.advance(works, 1);
    expect(economy.materialsShort).toBe(true);

    economy.advance(works, MATERIALS_RECOVERY_SECONDS);
    expect(economy.materialsShort).toBe(false);
  });

  it("does not mutate shortage state when read or carry it through a load", () => {
    const economy = new CityEconomy({ materials: 0, population: 500 });
    expect(economy.materialsShort).toBe(false);
    expect(economy.materialsShort).toBe(false);

    economy.advance([status("commercial", "working", 4, 4)], 1);
    expect(economy.materialsShort).toBe(true);
    economy.replaceWith({ materials: 100, population: 500 });

    expect(economy.materialsShort).toBe(false);
  });
});
