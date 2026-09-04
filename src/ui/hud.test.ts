import { afterEach, describe, expect, it, vi } from "vitest";

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
});
