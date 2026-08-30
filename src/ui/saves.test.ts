import { afterEach, describe, expect, it } from "vitest";
import { readAutosave, writeAutosave } from "./saves";
import type { CitySave } from "../sim/save";

const city: CitySave = { v: 4, terrain: "rolling", hour: 14, nodes: [], segments: [], planted: [], cleared: [] };

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
