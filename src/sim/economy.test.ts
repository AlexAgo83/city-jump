import { describe, expect, it } from "vitest";

import { CITY_DAY_SECONDS, CityEconomy, STARTING_MONEY, Treasury, buildingBuildCost, demolitionRefund, incomePerSecond, roadBuildCost } from "./economy";
import type { BuildingStatus } from "./buildingLifecycle";

const status = (kind: BuildingStatus["parcel"]["kind"], state: BuildingStatus["state"], frontageCells = 1, depthCells = 1): BuildingStatus => ({
  state,
  parcel: { kind, frontageCells, depthCells, position: { x: 0, y: 0, z: 0 }, rotationY: 0, cells: [] },
});

describe("economy", () => {
  it("prices roads by metre and buildings by parcel", () => {
    expect(roadBuildCost("street", 12.1)).toBe(97);
    expect(roadBuildCost("tunnel", 10)).toBe(450);
    expect(buildingBuildCost(status("commercial", "working", 2, 3).parcel)).toBe(660);
  });

  it("earns from population tax and staffed commerce", () => {
    expect(incomePerSecond(100, [status("commercial", "working", 2, 2), status("commercial", "idle", 4, 4)])).toBeCloseTo(5.2);
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

  it("only produces staffed district output and keeps its terms", () => {
    const city = new CityEconomy({ population: 20 });
    const terms = city.advance([status("residential", "working").parcel, status("agricultural", "working").parcel, status("industrial", "working").parcel, status("commercial", "working").parcel], CITY_DAY_SECONDS);

    expect(terms.food.produced).toBe(8);
    expect(terms.materials.produced).toBe(5);
    expect(terms.services.produced).toBe(0); // farms and industry take the six available workers first
    expect(terms.food.consumed).toBe(20);
  });

  it("grows within food and housing, then falls in famine", () => {
    const homes = [status("residential", "working", 2, 1).parcel, status("agricultural", "working").parcel, status("commercial", "working").parcel];
    const city = new CityEconomy({ population: 10, food: 20 });
    const grown = city.advance(homes, CITY_DAY_SECONDS);
    expect(grown.population.value).toBeGreaterThan(10);
    expect(grown.population.value).toBeLessThanOrEqual(24);
    city.replaceWith({ population: 10 });
    expect(city.advance([homes[0]!], CITY_DAY_SECONDS).population.change).toBeLessThan(0);
  });

  it("is deterministic and loses residents when homes disappear", () => {
    const parcels = [status("residential", "working", 2, 2).parcel, status("agricultural", "working").parcel];
    const run = () => {
      const city = new CityEconomy({ population: 24, food: 50 });
      city.advance(parcels, CITY_DAY_SECONDS);
      return city.resources;
    };
    expect(run()).toEqual(run());
    const city = new CityEconomy({ population: 24, food: 50 });
    city.advance(parcels, CITY_DAY_SECONDS);
    expect(city.advance([parcels[1]!], CITY_DAY_SECONDS).population.value).toBe(0);
  });
});
