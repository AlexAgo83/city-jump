import { describe, expect, it } from "vitest";

import { createFpsMeter } from "./fps";

describe("fps meter", () => {
  it("counts frames over the window rather than averaging instants", () => {
    const meter = createFpsMeter(100);
    meter.watch();

    // Nine frames in 100 ms, but wildly uneven: eight quick ones and one 60 ms stall. Averaging
    // each frame's own rate would read about 120; nine frames in a tenth of a second is 90.
    let now = 0;
    meter.frame(now);
    for (const step of [5, 5, 5, 5, 5, 5, 5, 5, 60]) {
      now += step;
      meter.frame(now);
    }

    expect(meter.display).toBe(90);
  });

  it("measures the whole requested interval, including a stall at its start", () => {
    const meter = createFpsMeter(100);
    const stop = meter.measure(0);

    // A one-second window that begins with a 400 ms stall, then runs at 50 fps: 30 frames in a
    // second. Reading the rolling display instead would report the last window only, 50.
    let now = 400;
    meter.frame(now);
    for (let i = 0; i < 29; i++) {
      now += 20;
      meter.frame(now);
    }

    expect(stop(1000)).toBe(30);
    expect(meter.active).toBe(false);
  });

  it("keeps concurrent measurements and the rolling display independent", () => {
    const meter = createFpsMeter(100);
    const stopFirst = meter.measure(0);
    for (let now = 0; now <= 500; now += 100) meter.frame(now);
    const stopSecond = meter.measure(500);
    for (let now = 600; now <= 1000; now += 100) meter.frame(now);

    // Eleven frames over the first second; five over the second half of it. The rolling display
    // keeps describing its own 100 ms window throughout, and resets once nothing watches.
    expect(meter.display).toBe(10);
    expect(stopFirst(1000)).toBe(11);
    expect(stopSecond(1000)).toBe(10);
    expect(meter.active).toBe(false);
    expect(meter.display).toBe(0);
  });

  it("samples only while watched", () => {
    const meter = createFpsMeter(100);

    expect(meter.frame(16)).toBe(false);
    const stop = meter.watch();
    meter.frame(0);
    meter.frame(50);
    expect(meter.frame(100)).toBe(true);
    expect(meter.display).toBe(20);
    stop();
    expect(meter.active).toBe(false);
    expect(meter.display).toBe(0);
  });
});
