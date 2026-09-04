import { describe, expect, it } from "vitest";

import { advanceWaveClock, callWaveNow, createWaveClock, damageWaveClock, missileTravelSeconds, residentsUntilWave, scheduleNextWave, summonIfDue, waveAtPopulation, waveThreat, WAVE_STARTING_VALUES } from "./wave";

describe("waves", () => {
  it("summons nothing until the city is worth attacking", () => {
    let clock = createWaveClock();
    // A hundred simulated minutes on a starter city: still nobody comes.
    for (let i = 0; i < 100; i++) clock = summonIfDue(advanceWaveClock(clock, 60), 1, 12, 1000);

    expect(clock.active).toBeNull();
    expect(residentsUntilWave(1, 12)).toBe(waveAtPopulation(1) - 12);
    expect(waveAtPopulation(1)).toBe(1000);
  });

  it("summons the moment the city crosses the bar, whatever the clock says", () => {
    const bar = waveAtPopulation(1);
    expect(summonIfDue(createWaveClock(), 1, bar - 1, 1000).active).toBeNull();

    const landed = summonIfDue(createWaveClock(), 1, bar, 1234);
    expect(landed.active).toEqual({ startedAtSeconds: 0, threat: 1234, hitPoints: 1234 });
    expect(residentsUntilWave(1, bar)).toBe(0);
  });

  it("raises the bar every wave, so holding one buys room rather than a delay", () => {
    expect(waveAtPopulation(2)).toBeGreaterThan(waveAtPopulation(1));
    expect(waveAtPopulation(5)).toBeGreaterThan(waveAtPopulation(4));
    expect(waveAtPopulation(6, 180)).toBe(1080);

    // A city that just held wave 1 at the bar is not immediately attacked again.
    const after = scheduleNextWave(summonIfDue(createWaveClock(), 1, waveAtPopulation(1), 1000));
    expect(summonIfDue(after, 2, waveAtPopulation(1), 1000).active).toBeNull();
  });

  it("lets the player call one early, at the size it would have been", () => {
    const called = callWaveNow(createWaveClock(), 1234);
    expect(called.active?.threat).toBe(1234);
    expect(callWaveNow(called, 9999).active?.threat).toBe(1234);
  });

  it("applies damage without going below zero", () => {
    const active = summonIfDue(createWaveClock(), 1, waveAtPopulation(1), WAVE_STARTING_VALUES.kaijuHitPoints);
    expect(damageWaveClock(active, 250).active?.hitPoints).toBe(WAVE_STARTING_VALUES.kaijuHitPoints - 250);
    expect(damageWaveClock(active, WAVE_STARTING_VALUES.kaijuHitPoints * 2).active?.hitPoints).toBe(0);
    expect(damageWaveClock(active, -50).active?.hitPoints).toBe(WAVE_STARTING_VALUES.kaijuHitPoints);
  });

  it("derives higher threat from wave, population and parcels", () => {
    expect(waveThreat(2, 40, 20)).toBeGreaterThan(waveThreat(1, 12, 2));
  });

  it("keeps missile speed constant when battery range grows", () => {
    expect(missileTravelSeconds(220)).toBeCloseTo(1.5);
    expect(missileTravelSeconds(WAVE_STARTING_VALUES.batteryRangeM)).toBeCloseTo(3);
  });
});
