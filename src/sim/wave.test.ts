import { describe, expect, it } from "vitest";

import { advanceWaveClock, callWaveNow, createWaveClock, damageWaveClock, quietSecondsLeft, residentsUntilWave, scheduleNextWave, summonIfDue, waveAtPopulation, waveThreat, WAVE_STARTING_VALUES } from "./wave";

describe("waves", () => {
  it("summons nothing until the city is worth attacking", () => {
    let clock = createWaveClock();
    // A hundred simulated minutes on a starter city: still nobody comes.
    for (let i = 0; i < 100; i++) clock = summonIfDue(advanceWaveClock(clock, 60), 1, 12, 1000);

    expect(clock.active).toBeNull();
    expect(residentsUntilWave(1, 12)).toBe(waveAtPopulation(1) - 12);
  });

  it("summons the moment the city crosses the bar, whatever the clock says", () => {
    const bar = waveAtPopulation(1);
    expect(summonIfDue(createWaveClock(), 1, bar - 1, 1000).active).toBeNull();

    const landed = summonIfDue(createWaveClock(), 1, bar, 1234);
    expect(landed.active).toEqual({ startedAtSeconds: 0, threat: 1234, hitPoints: 1234 });
    expect(residentsUntilWave(1, bar)).toBe(0);
  });

  it("leaves the island alone for a while after a wave, however big the city is", () => {
    const huge = waveAtPopulation(9) * 10;
    let clock = scheduleNextWave({ elapsedSeconds: 500, quietUntilSeconds: 0, active: { startedAtSeconds: 400, threat: 900, hitPoints: 0 } });
    expect(quietSecondsLeft(clock)).toBe(WAVE_STARTING_VALUES.peaceSeconds);

    clock = summonIfDue(advanceWaveClock(clock, WAVE_STARTING_VALUES.peaceSeconds - 1), 2, huge, 1000);
    expect(clock.active).toBeNull();

    clock = summonIfDue(advanceWaveClock(clock, 1), 2, huge, 1000);
    expect(clock.active).not.toBeNull();
  });

  it("still comes when the player calls it, quiet or not", () => {
    const clock = scheduleNextWave({ elapsedSeconds: 500, quietUntilSeconds: 0, active: { startedAtSeconds: 400, threat: 900, hitPoints: 0 } });
    expect(callWaveNow(clock, 1000).active).not.toBeNull();
  });

  it("raises the bar every wave, so holding one buys room rather than a delay", () => {
    expect(waveAtPopulation(2)).toBeGreaterThan(waveAtPopulation(1));
    expect(waveAtPopulation(5)).toBeGreaterThan(waveAtPopulation(4));

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
});
