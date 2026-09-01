import { afterEach, describe, expect, it } from "vitest";
import { deleteRunSaveOnDefeat, readAutosave, readProfile, writeAutosave, writeProfile } from "./saves";
import { CityEconomy, STARTING_MONEY } from "../sim/economy";
import { createRun } from "../sim/run";
import { SAVE_VERSION, type CitySave } from "../sim/save";
import { createWaveClock } from "../sim/wave";

const city: CitySave = { v: SAVE_VERSION, terrain: "rolling", hour: 14, money: STARTING_MONEY, resources: new CityEconomy().resources, run: createRun(), waveClock: createWaveClock(), nodes: [], segments: [], planted: [], cleared: [], zones: [], rubble: [], buildingStates: [], utilities: [] };

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

  it("keeps profile state separate from the run save", () => {
    const values = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    };

    expect(writeAutosave(city)).toBe(true);
    expect(writeProfile({ prestige: 12, upgrades: ["coverage-map"], hardcore: true })).toBe(true);

    expect(readAutosave()).toEqual(city);
    expect(readProfile()).toEqual({ prestige: 12, upgrades: ["coverage-map"], hardcore: true });
  });

  it("deletes the run save on hardcore defeat only", () => {
    const values = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    };

    writeAutosave(city);
    deleteRunSaveOnDefeat({ hardcore: false }, "defeated");
    expect(readAutosave()).toEqual(city);

    deleteRunSaveOnDefeat({ hardcore: true }, "evacuated");
    expect(readAutosave()).toEqual(city);

    deleteRunSaveOnDefeat({ hardcore: true }, "defeated");
    expect(readAutosave()).toBeNull();
  });
});
