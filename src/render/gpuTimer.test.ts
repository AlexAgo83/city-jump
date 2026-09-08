import type { Engine } from "@babylonjs/core/Engines/engine";
import { describe, expect, it, vi } from "vitest";
import { createGpuTimer } from "./gpuTimer";

describe("GPU timings", () => {
  it("polls a drawn frame without opening overlapping queries, converts ns, and cancels pending queries", () => {
    const token = { _timeElapsedQuery: {}, _startTimeQuery: null, _endTimeQuery: null };
    const engine = {
      getCaps: () => ({ timerQuery: {} }),
      startTimeQuery: vi.fn(() => token),
      endTimeQuery: vi.fn().mockReturnValueOnce(-1).mockReturnValueOnce(7_000_000).mockReturnValue(-1),
      _deleteTimeQuery: vi.fn(),
      _currentNonTimestampToken: token,
    };
    const timer = createGpuTimer(engine as unknown as Engine);
    timer.begin();
    expect(timer.end()).toBeNull();
    timer.begin();
    expect(engine.startTimeQuery).toHaveBeenCalledTimes(1);
    expect(timer.end()).toBe(7);
    timer.begin();
    expect(engine.startTimeQuery).toHaveBeenCalledTimes(2);
    timer.end();
    timer.reset();
    expect(engine._deleteTimeQuery).toHaveBeenCalledExactlyOnceWith(token._timeElapsedQuery);
    expect(engine._currentNonTimestampToken).toBeNull();
  });

  it("leaves unsupported GPUs unavailable and abandons a timed-out query until reset", () => {
    let now = 0;
    const clock = vi.spyOn(performance, "now").mockImplementation(() => now);
    try {
      let supported = false;
      const engine = {
        getCaps: () => ({ timerQuery: supported ? {} : null }),
        startTimeQuery: vi.fn(() => ({ _timeElapsedQuery: {} })),
        endTimeQuery: vi.fn(() => -1),
        _deleteTimeQuery: vi.fn(),
      };
      const timer = createGpuTimer(engine as unknown as Engine);
      timer.begin();
      expect(timer.end()).toBeNull();
      expect(engine.startTimeQuery).not.toHaveBeenCalled();
      supported = true;
      timer.begin(); timer.end();
      now = 1100;
      expect(timer.end()).toBeNull();
      expect(engine._deleteTimeQuery).toHaveBeenCalledTimes(1);
      timer.begin();
      expect(engine.startTimeQuery).toHaveBeenCalledTimes(1);
      timer.reset(); timer.begin();
      expect(engine.startTimeQuery).toHaveBeenCalledTimes(2);
    } finally {
      clock.mockRestore();
    }
  });
});
