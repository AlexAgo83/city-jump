import { describe, expect, it } from "vitest";

import { advanceWaveClock, createWaveClock, damageWaveClock, waveCountdownSeconds, WAVE_STARTING_VALUES } from "./wave";

describe("wave clock", () => {
  it("counts down and fixes the first threat when the wave starts", () => {
    const waiting = advanceWaveClock(createWaveClock(), WAVE_STARTING_VALUES.firstWaveSeconds / 2);
    expect(waveCountdownSeconds(waiting)).toBe(WAVE_STARTING_VALUES.firstWaveSeconds / 2);
    expect(waiting.active).toBeNull();

    const active = advanceWaveClock(waiting, WAVE_STARTING_VALUES.firstWaveSeconds / 2);
    expect(active.active).toEqual({
      startedAtSeconds: WAVE_STARTING_VALUES.firstWaveSeconds,
      threat: WAVE_STARTING_VALUES.kaijuHitPoints,
      hitPoints: WAVE_STARTING_VALUES.kaijuHitPoints,
    });
  });

  it("applies damage without going below zero", () => {
    const active = advanceWaveClock(createWaveClock(), WAVE_STARTING_VALUES.firstWaveSeconds);
    expect(damageWaveClock(active, 250).active?.hitPoints).toBe(WAVE_STARTING_VALUES.kaijuHitPoints - 250);
    expect(damageWaveClock(active, WAVE_STARTING_VALUES.kaijuHitPoints * 2).active?.hitPoints).toBe(0);
    expect(damageWaveClock(active, -50).active?.hitPoints).toBe(WAVE_STARTING_VALUES.kaijuHitPoints);
  });
});
