import { afterEach, describe, expect, it } from "vitest";
import { readAutosave, writeAutosave } from "./saves";
import { CityEconomy, STARTING_MONEY } from "../sim/economy";
import { SAVE_VERSION, type CitySave } from "../sim/save";

const city: CitySave = { v: SAVE_VERSION, terrain: "rolling", hour: 14, money: STARTING_MONEY, resources: new CityEconomy().resources, nodes: [], segments: [], planted: [], cleared: [], zones: [], rubble: [], buildingStates: [] };

describe("autosave storage", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("reports whether the browser accepted the autosave write", () => {
    const values = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    };

    expect(writeAutosave(city)).toBe(true);
    expect(readAutosave()).toEqual(city);
  });

  it("reports a refused autosave write", () => {
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("full");
        },
        removeItem: () => undefined,
      },
    };

    expect(writeAutosave(city)).toBe(false);
  });
});
