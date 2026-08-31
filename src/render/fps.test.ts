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
