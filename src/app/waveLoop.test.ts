import { describe, expect, it } from "vitest";

import { createRun } from "../sim/run";
import { callWaveNow, createWaveClock } from "../sim/wave";
import { settleWaveOutcome } from "./waveLoop";

describe("wave loop helpers", () => {
  it("settles held waves and clears the active clock", () => {
    const active = callWaveNow(createWaveClock(), 900);
    const next = settleWaveOutcome(createRun(), active, "held", false, 12);

    expect(next.run).toMatchObject({ wave: 2, science: 10, ended: null });
    expect(next.clock.active).toBeNull();
  });

  it("keeps a breached empty city ended without scheduling another wave", () => {
    const active = callWaveNow(createWaveClock(), 900);
    const next = settleWaveOutcome(createRun(), active, "breached", false, 0);

    expect(next.run.ended).toBe("population_zero");
    expect(next.clock.active).toEqual(active.active);
  });

  it("ends a levelled city even while residents remain", () => {
    const active = callWaveNow(createWaveClock(), 900);
    const next = settleWaveOutcome(createRun(), active, "breached", false, 120, true);

    expect(next.run.ended).toBe("defeated");
    expect(next.clock.active).toEqual(active.active);
  });
});
