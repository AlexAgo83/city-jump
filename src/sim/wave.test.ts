import { describe, expect, it } from "vitest";

import { advanceWaveClock, createWaveClock, waveCountdownSeconds, WAVE_STARTING_VALUES } from "./wave";

describe("wave clock", () => {
  it("counts down and fixes the first threat when the wave starts", () => {
    const waiting = advanceWaveClock(createWaveClock(), 60);
    expect(waveCountdownSeconds(waiting)).toBe(120);
    expect(waiting.active).toBeNull();

    const active = advanceWaveClock(waiting, 120);
    expect(active.active).toEqual({
      startedAtSeconds: WAVE_STARTING_VALUES.firstWaveSeconds,
      threat: WAVE_STARTING_VALUES.kaijuHitPoints,
      hitPoints: WAVE_STARTING_VALUES.kaijuHitPoints,
    });
  });
});

