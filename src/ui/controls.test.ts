import { afterEach, describe, expect, it, vi } from "vitest";

import { CityEconomy, STARTING_MONEY } from "../sim/economy";
import { createRun } from "../sim/run";
import { SAVE_VERSION, type CitySave } from "../sim/save";
import { encodeShare, MAX_SHARE_FRAGMENT } from "../sim/share";
import { createWaveClock } from "../sim/wave";

const city: CitySave = { v: SAVE_VERSION, terrain: "rolling", hour: 14, money: STARTING_MONEY, resources: new CityEconomy().resources, run: createRun(), waveClock: createWaveClock(), elapsed: 0, nodes: [], segments: [], planted: [], cleared: [], zones: [], rubble: [], buildingStates: [], utilities: [] };

function element() {
  return {
    dataset: {} as Record<string, string>,
    hidden: false,
    style: {} as Record<string, string>,
    textContent: "",
    addEventListener: vi.fn(),
    querySelector: vi.fn(() => element()),
    replaceChildren: vi.fn(),
    setAttribute: vi.fn(),
  };
}

function installBrowser(hash: string, confirms: boolean[] = []) {
  const values = new Map<string, string>();
  const href = `https://example.test/${hash}`;
  const replaceState = vi.fn();
  const document = { getElementById: vi.fn(() => element()), createElement: vi.fn(() => element()) };
  const window = {
    confirm: vi.fn(() => confirms.shift() ?? true),
    prompt: vi.fn(),
    clearTimeout: vi.fn(),
    setTimeout: vi.fn(() => 1),
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  };
  Object.assign(globalThis, {
    document,
    window,
    location: { hash, href, origin: "https://example.test", pathname: "/" },
    history: { replaceState },
  });
  return { values, window, replaceState };
}

async function importControls() {
  vi.resetModules();
  return import("./controls");
}

describe("shared city import", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of ["document", "window", "location", "history"] as const) delete (globalThis as Record<string, unknown>)[key];
  });

  it("imports and loads a good shared link", async () => {
    const payload = await encodeShare({ name: "Shared", city });
    const browser = installBrowser(`#${payload}`, [true, true]);
    const { importSharedCity } = await importControls();
    const applyCity = vi.fn();
    const refresh = vi.fn();

    await importSharedCity({ onLoad: () => true }, applyCity, refresh);

    expect(browser.values.get("cityjump.activeSave")).toBe("Shared");
    expect(browser.values.has("cityjump.save.Shared")).toBe(true);
    expect(refresh).toHaveBeenCalledWith("Shared");
    expect(applyCity).toHaveBeenCalledWith(expect.objectContaining({ v: SAVE_VERSION }));
  });

  it("refuses malformed and oversized links without writing a save", async () => {
    for (const hash of ["#city=nope", `#city=${"x".repeat(MAX_SHARE_FRAGMENT)}`]) {
      const browser = installBrowser(hash);
      const { importSharedCity } = await importControls();

      await importSharedCity({ onLoad: () => true }, vi.fn(), vi.fn());

      expect([...browser.values.keys()].filter((key) => key.startsWith("cityjump.save."))).toEqual([]);
    }
  });

  it("keeps the loaded city when replay refuses the imported one", async () => {
    const payload = await encodeShare({ name: "Shared", city });
    const browser = installBrowser(`#${payload}`, [true, true]);
    const { importSharedCity } = await importControls();
    const applyCity = vi.fn();

    await importSharedCity({ onLoad: () => false }, applyCity, vi.fn());

    expect(browser.values.get("cityjump.activeSave")).toBe("Shared");
    expect(applyCity).not.toHaveBeenCalled();
  });
});
