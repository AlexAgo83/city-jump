import { afterEach, describe, expect, it, vi } from "vitest";

import { createAutosave } from "./persistence";

describe("autosave lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { window?: unknown }).window;
  });

  it("cancels a pending write on dispose", () => {
    vi.useFakeTimers();
    (globalThis as { window?: unknown }).window = { setTimeout, clearTimeout };
    const write = vi.fn(() => true);
    const autosave = createAutosave(() => ({}) as never, write, () => undefined);

    autosave();
    autosave.dispose();
    vi.advanceTimersByTime(2000);

    expect(write).not.toHaveBeenCalled();
  });
});
