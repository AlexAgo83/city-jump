import { describe, expect, it } from "vitest";
import { FrameProfiler, performanceCeiling } from "./frameProfiler";

describe("frame profiling", () => {
  it("counts exclusive nested work, event rebuilds and peaks without counting wait as CPU", () => {
    let now = 0;
    const profiler = new FrameProfiler(() => now);
    profiler.setEnabled(true);
    const rebuild = profiler.wrap("rebuild", () => { now += 20; });
    const traffic = profiler.wrap("traffic", () => { now += 3; });
    const render = profiler.wrap("render", () => {
      now += 2;
      traffic();
      now += 1;
      profiler.section("ui");
      now += 1;
    });
    rebuild(); // An input event outside scene.render still belongs to the next sample.
    render();
    profiler.finishFrame(5000, null); // Startup/hidden-tab interval is excluded.
    now = 110;
    render();
    profiler.finishFrame(90, 7);
    const sample = profiler.history[0]!;
    expect(sample.costs).toEqual({ simulation: 0, traffic: 3, combat: 0, rebuild: 10, visual: 0, render: 3, ui: 1, other: 0 });
    expect(sample.cpu).toBe(17);
    expect(sample.cpuPeak).toBe(27);
    expect(sample.frame).toBe(90);
    expect(sample.framePeak).toBe(90);
    expect(sample.gpu).toBe(7);
  });

  it("restores the parent scope after a throw and does no clock reads while disabled", () => {
    let now = 0;
    let reads = 0;
    const profiler = new FrameProfiler(() => { reads++; return now; });
    const failure = profiler.wrap("rebuild", () => { now += 4; throw new Error("expected"); });
    expect(() => failure()).toThrow("expected");
    profiler.section("ui");
    profiler.finishFrame(16, null);
    expect(reads).toBe(0);
    profiler.setEnabled(true);
    const render = profiler.wrap("render", () => {
      now += 2;
      try { failure(); } catch { /* The caller recovers and keeps rendering. */ }
      now += 3;
    });
    render();
    profiler.finishFrame(16, null);
    now += 100;
    render();
    profiler.finishFrame(109, null);
    expect(profiler.history[0]!.costs.render).toBe(5);
    expect(profiler.history[0]!.costs.rebuild).toBe(4);
    profiler.setEnabled(false);
    const before = reads;
    render();
    profiler.finishFrame(16, null);
    expect(reads).toBe(before);
    expect(profiler.history).toEqual([]);
  });

  it("keeps an isolated stall from flattening the trace, but expands for sustained slow frames", () => {
    const sample = { at: 0, costs: { simulation: 0, traffic: 0, combat: 0, rebuild: 0, visual: 0, render: 5, ui: 0, other: 0 }, cpu: 5, cpuPeak: 5, frame: 16.7, framePeak: 17, gpu: null };
    expect(performanceCeiling([])).toBe(36);
    expect(performanceCeiling([...Array.from({ length: 20 }, () => sample), { ...sample, cpu: 250, cpuPeak: 250, frame: 250 }])).toBe(36);
    expect(performanceCeiling(Array.from({ length: 20 }, () => ({ ...sample, frame: 84 })))).toBe(90);
  });

  it("bounds history by wall time and count, and keeps unavailable GPU data null", () => {
    let now = 0;
    const profiler = new FrameProfiler(() => now);
    profiler.setEnabled(true);
    for (let frame = 0; frame < 800; frame++) {
      now += 100;
      profiler.finishFrame(100, Number.NaN);
    }
    expect(profiler.history.length).toBeLessThanOrEqual(301);
    expect(profiler.history.at(-1)!.at - profiler.history[0]!.at).toBeLessThanOrEqual(30_100);
    expect(profiler.history.at(-1)!.gpu).toBeNull();
    profiler.setEnabled(false);
    now += 60_000;
    profiler.setEnabled(true);
    profiler.finishFrame(60_000, null);
    now += 110;
    profiler.finishFrame(110, null);
    expect(profiler.history[0]!.framePeak).toBe(110);
  });
});
