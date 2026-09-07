import { afterEach, describe, expect, it, vi } from "vitest";

import type { CityTerms } from "../sim/economy";

function element() {
  return {
    children: [] as unknown[],
    className: "",
    dataset: {} as Record<string, string>,
    hidden: false,
    max: 0,
    min: 0,
    style: {} as Record<string, string>,
    textContent: "",
    title: "",
    value: 0,
    addEventListener: vi.fn(),
    querySelector: vi.fn(() => element()),
    replaceChildren(...children: unknown[]) {
      this.children = children;
    },
    setAttribute: vi.fn(),
  };
}

function installDom() {
  const elements = new Map<string, ReturnType<typeof element>>();
  const document = {
    createElement: vi.fn(() => element()),
    getElementById: vi.fn((id: string) => {
      const existing = elements.get(id);
      if (existing) return existing;
      const created = element();
      elements.set(id, created);
      return created;
    }),
  };
  Object.assign(globalThis, {
    document,
    window: { clearTimeout: vi.fn(), setTimeout: vi.fn(() => 1) },
  });
  return elements;
}

async function importHud() {
  vi.resetModules();
  return import("./hud");
}

const terms = (): CityTerms => ({
  population: { value: 42, housing: 90, change: 3.5, foodShortage: 0 },
  food: { value: 12, produced: 8, consumed: 6 },
  materials: { value: 7, produced: 3, consumed: 2, shortage: 0 },
  trade: 4,
});

describe("hud rendering", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of ["document", "window"] as const) delete (globalThis as Record<string, unknown>)[key];
  });

  it("renders loaded values as text nodes", async () => {
    const elements = installDom();
    const { showRefusal, showCityStats, showSelection } = await importHud();

    showRefusal("<b>bad</b>");
    expect(elements.get("toast")?.textContent).toBe("<b>bad</b>");

    showCityStats(
      1234,
      [{ kind: "commercial", supply: 1, need: 5, ratio: 0.2 }],
      { population: 1234, food: 9, materials: 2 },
    );
    expect(elements.get("population")?.textContent).toBe("1k");
    expect(elements.get("shortage")?.textContent).toBe("Commerce 4");
    expect(elements.get("needs-panel")?.children).toHaveLength(1);

    showSelection({ kind: "road", name: "<img>", street: "<script>", baseId: "street", lanes: 2, oneWay: false, length: 42 });
    expect(elements.get("selection-panel")?.hidden).toBe(false);
  });

  it("writes to the needs rows only when a displayed value moves", async () => {
    const elements = installDom();
    const { showCityStats } = await importHud();
    const stats = (supply: number) =>
      showCityStats(1234, [{ kind: "commercial", supply, need: 5, ratio: supply / 5 }], { population: 1234, food: 9, materials: 2 });

    stats(1);
    const built = (document.createElement as ReturnType<typeof vi.fn>).mock.calls.length;

    // The same figures, ten gameplay frames running: not one new element.
    for (let frame = 0; frame < 10; frame++) stats(1);
    expect((document.createElement as ReturnType<typeof vi.fn>).mock.calls.length).toBe(built);

    // A figure that moves is written, in the row that already exists.
    stats(3);
    expect((document.createElement as ReturnType<typeof vi.fn>).mock.calls.length).toBe(built);
    expect(elements.get("needs-panel")?.children).toHaveLength(1);
  });

  it("does not build the ledger while it is collapsed", async () => {
    const elements = installDom();
    const { showCityStats } = await importHud();
    const ledger = elements.get("ledger") as ReturnType<typeof element>;

    ledger.hidden = true;
    showCityStats(1234, [], { population: 1234, food: 9, materials: 2 }, terms());
    expect(elements.get("ledger-lines")?.children).toHaveLength(0);

    // Expanded, the very next frame fills it in.
    ledger.hidden = false;
    showCityStats(1234, [], { population: 1234, food: 9, materials: 2 }, terms());
    expect(elements.get("ledger-lines")?.children.length).toBeGreaterThan(0);

    // And opening it fills it on the way open, not a frame later: the click handler renders from
    // the figures of the last frame rather than leaving a stale panel on screen.
    ledger.hidden = true;
    const built = (document.createElement as ReturnType<typeof vi.fn>).mock.calls.length;
    showCityStats(1234, [], { population: 1234, food: 9, materials: 2 }, { ...terms(), trade: 99 });
    expect((document.createElement as ReturnType<typeof vi.fn>).mock.calls.length).toBe(built);

    // The handler is the toggle itself: it opens the collapsed ledger and fills it in one go.
    const [, toggle] = (elements.get("city-strip")!.addEventListener as ReturnType<typeof vi.fn>).mock.calls[0]!;
    (toggle as () => void)();
    expect(ledger.hidden).toBe(false);
    expect((document.createElement as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(built);
  });
});
