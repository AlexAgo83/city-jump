import { describe, expect, it, vi } from "vitest";

import { createRun } from "../sim/run";
import { callWaveNow, createWaveClock } from "../sim/wave";
import { rebuildMissileTrails, settleWaveOutcome } from "./waveLoop";

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


it("keeps each missile's body target stable from flight through impact", () => {
  const renderer = { rebuild: vi.fn(), dispose: vi.fn() };
  const missiles = [0, 1].map((index) => ({ from: { x: index * 10, y: 0, z: 20 }, launchedAt: index, impactAt: 5, damage: 10 }));
  const target = vi.fn((seed: number) => ({ x: seed, y: 70, z: 0 }));
  rebuildMissileTrails(renderer, missiles, [], target, 2);
  const flying = renderer.rebuild.mock.calls[0]![0];
  rebuildMissileTrails(renderer, [], missiles, target, 5);
  const hits = renderer.rebuild.mock.calls[1]![0];
  expect(flying[0].to).not.toEqual(flying[1].to);
  expect(hits.map((hit: { to: unknown }) => hit.to)).toEqual(flying.map((trail: { to: unknown }) => trail.to));
  expect(hits.every((hit: { impact: boolean; progress: number }) => hit.impact && hit.progress === 1)).toBe(true);
});
