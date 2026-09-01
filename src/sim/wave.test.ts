import { describe, expect, it } from "vitest";

import { advanceWaveClock, advanceWaveClockWithThreat, callWaveNow, createWaveClock, damageWaveClock, scheduleNextWave, waveCountdownSeconds, waveThreat, WAVE_STARTING_VALUES } from "./wave";

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

  it("can schedule the next wave and call it early with a fixed threat", () => {
    const scheduled = scheduleNextWave({ ...createWaveClock(), elapsedSeconds: 90, active: null }, 30);
    expect(waveCountdownSeconds(scheduled)).toBe(30);
    const called = advanceWaveClockWithThreat(callWaveNow(scheduled), 0, 1234);
    expect(called.active?.threat).toBe(1234);
    expect(advanceWaveClockWithThreat(called, 20, 9999).active?.threat).toBe(1234);
  });

  it("derives higher threat from wave, population and parcels", () => {
    expect(waveThreat(2, 40, 20)).toBeGreaterThan(waveThreat(1, 12, 2));
  });
});
