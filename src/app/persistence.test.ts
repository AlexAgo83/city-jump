import { afterEach, describe, expect, it, vi } from "vitest";

import { createAutosave } from "./persistence";

describe("autosave lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { window?: unknown }).window;
  });

  /** The app's own wiring: fake timers, and a `window` with just the two functions it uses. */
  const withFakeClock = () => {
    vi.useFakeTimers();
    (globalThis as { window?: unknown }).window = { setTimeout, clearTimeout };
  };

  it("collapses a burst inside the debounce window into one write", () => {
    withFakeClock();
    const write = vi.fn(() => true);
    const autosave = createAutosave(() => ({}) as never, write, () => undefined);

    for (let i = 0; i < 5; i++) {
      autosave();
      vi.advanceTimersByTime(100);
    }
    vi.advanceTimersByTime(2000);

    expect(write).toHaveBeenCalledTimes(1);
  });

  it("still writes at a bounded interval under a stream of requests that never stops", () => {
    withFakeClock();
    const started = Date.now();
    const writtenAt: number[] = [];
    const autosave = createAutosave(
      () => ({}) as never,
      () => {
        writtenAt.push(Date.now() - started);
        return true;
      },
      () => undefined,
    );

    // A request every half second for a minute: always inside the two-second debounce, so a plain
    // debounce would reset its timer forever and never write at all.
    for (let elapsed = 0; elapsed < 60_000; elapsed += 500) {
      autosave();
      vi.advanceTimersByTime(500);
    }

    expect(writtenAt.length).toBeGreaterThan(0);
    const gaps = writtenAt.map((at, index) => at - (writtenAt[index - 1] ?? 0));
    expect(Math.max(...gaps)).toBeLessThanOrEqual(10_000);
  });

  it("reaches storage with the elapsed time of a city played at an accelerated rate", () => {
    withFakeClock();
    let elapsed = 0;
    const stored: { elapsed: number }[] = [];
    const autosave = createAutosave(
      () => ({ elapsed }) as never,
      (city) => {
        stored.push(city as unknown as { elapsed: number });
        return true;
      },
      () => undefined,
    );

    // Four simulated seconds per real second, saving on every simulated step, for a real minute.
    for (let tick = 0; tick < 240; tick++) {
      elapsed += 1;
      autosave();
      vi.advanceTimersByTime(250);
    }

    expect(stored.at(-1)?.elapsed).toBeGreaterThan(200);
  });

  it("reports a refusing storage once, not on every attempt", () => {
    withFakeClock();
    const onRefused = vi.fn();
    const autosave = createAutosave(() => ({}) as never, () => false, onRefused);

    for (let i = 0; i < 5; i++) {
      autosave();
      vi.advanceTimersByTime(2000);
    }

    expect(onRefused).toHaveBeenCalledTimes(1);
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
