import { describe, expect, it } from "vitest";

import { createFpsMeter, smoothFps } from "./fps";

describe("fps meter", () => {
  it("smooths frame deltas", () => {
    const first = smoothFps(null, 16);
    const second = smoothFps(first, 32, 0.5);

    expect(first).toBeCloseTo(62.5);
    expect(second).toBeCloseTo(46.875);
  });

  it("samples only while watched", () => {
    const meter = createFpsMeter(100);

    expect(meter.frame(16)).toBe(false);
    const stop = meter.watch();
    meter.frame(16);
    expect(meter.frame(32)).toBe(true);
    expect(meter.display).toBe(63);
    stop();
    expect(meter.active).toBe(false);
    expect(meter.display).toBe(0);
  });
});
