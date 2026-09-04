import { afterEach, describe, expect, it } from "vitest";

import { createRun } from "../sim/run";
import { bindRunPanel } from "./runPanel";

class FakeElement extends EventTarget {
  checked = false;
  dataset: Record<string, string> = {};
  disabled = false;
  hidden = false;
  textContent = "";
  title = "";
  type = "";
  children: unknown[] = [];

  replaceChildren(...children: unknown[]): void {
    this.children = children;
  }
}

describe("run panel disposal", () => {
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  it("removes persistent listeners and generated controls", () => {
    const elements = new Map<string, FakeElement>();
    for (const id of ["evacuate-run", "call-wave", "hardcore-run", "kaiju-spawns", "instant-construction", "free-building", "ignore-power", "ignore-water", "gameplay-note", "between-runs", "upgrade-web", "run-outcome", "new-run"]) {
      elements.set(id, new FakeElement());
    }
    (globalThis as { document?: unknown }).document = {
      getElementById: (id: string) => elements.get(id),
      createElement: () => new FakeElement(),
    };

    let calls = 0;
    const panel = bindRunPanel({
      getRun: createRun,
      setRun: () => undefined,
      getProfile: () => ({ prestige: 0, upgrades: [], hardcore: false }),
      setProfile: () => undefined,
      updateRunHud: () => undefined,
      onRulesChanged: () => undefined,
      onNewRun: () => undefined,
      onEvacuate: () => undefined,
      onCallWave: () => {
        calls += 1;
      },
      setToolEnabled: () => undefined,
      showRefusal: () => undefined,
    });

    elements.get("call-wave")!.dispatchEvent(new Event("click"));
    expect(calls).toBe(1);
    expect(elements.get("upgrade-web")!.children.length).toBeGreaterThan(0);

    panel.dispose();
    elements.get("call-wave")!.dispatchEvent(new Event("click"));

    expect(calls).toBe(1);
    expect(elements.get("upgrade-web")!.children).toHaveLength(0);
  });
});
