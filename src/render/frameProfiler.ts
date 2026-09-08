export const PERFORMANCE_CATEGORIES = [
  { id: "simulation", label: "Simulation", color: "#418ee8" },
  { id: "traffic", label: "Traffic", color: "#58bd68" },
  { id: "combat", label: "Combat", color: "#ed6673" },
  { id: "rebuild", label: "City rebuild", color: "#f49445" },
  { id: "visual", label: "Visual updates", color: "#ab7cde" },
  { id: "render", label: "CPU rendering", color: "#e6c94c" },
  { id: "ui", label: "UI", color: "#45bfc9" },
  { id: "other", label: "Other CPU", color: "#84909c" },
] as const;
export type PerformanceCategory = (typeof PERFORMANCE_CATEGORIES)[number]["id"];
export type Costs = Record<PerformanceCategory, number>;
const emptyCosts = (): Costs => ({ simulation: 0, traffic: 0, combat: 0, rebuild: 0, visual: 0, render: 0, ui: 0, other: 0 });
export interface PerformanceSample {
  at: number;
  costs: Costs;
  cpu: number;
  cpuPeak: number;
  frame: number;
  framePeak: number;
  gpu: number | null;
}

/** Scale for the usual workload; rare taller stalls keep an explicit overflow label. */
export function performanceCeiling(history: readonly PerformanceSample[]): number {
  const totals = history.map((s) => Math.max(s.cpu, s.frame, s.gpu ?? 0)).sort((a, b) => a - b);
  const usual = totals[Math.max(0, Math.ceil(totals.length * 0.9) - 1)] ?? 0;
  return Math.max(36, Math.ceil(usual / 10) * 10);
}

/** Exclusive synchronous CPU scopes. Awaited work must time its synchronous pieces separately. */
export class FrameProfiler {
  enabled = false;
  readonly history: PerformanceSample[] = [];
  onSample: (() => void) | null = null;
  private stack: { category: PerformanceCategory; since: number }[] = [];
  private pending = emptyCosts();
  private sum = emptyCosts();
  private frames = 0;
  private intervals = 0;
  private frameSum = 0;
  private framePeak = 0;
  private cpuPeak = 0;
  private gpuSum = 0;
  private gpuCount = 0;
  private windowStart = 0;
  private firstFrame = true;

  constructor(private readonly clock: () => number = () => performance.now()) {}

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.history.length = 0;
    this.pending = emptyCosts();
    this.stack.length = 0;
    this.resetWindow();
    this.firstFrame = true;
    this.windowStart = enabled ? this.clock() : 0;
  }

  wrap<A extends unknown[], R>(category: PerformanceCategory, work: (...args: A) => R): (...args: A) => R {
    return (...args) => {
      if (!this.enabled) return work(...args);
      const started = this.clock();
      this.charge(started);
      this.stack.push({ category, since: started });
      try {
        return work(...args);
      } finally {
        const ended = this.clock();
        this.charge(ended);
        this.stack.pop();
        const parent = this.stack.at(-1);
        if (parent) parent.since = ended;
      }
    };
  }

  /** Switch the current scope for consecutive phases inside one frame callback. */
  section(category: PerformanceCategory): void {
    if (!this.enabled || !this.stack.length) return;
    const now = this.clock();
    this.charge(now);
    const current = this.stack.at(-1)!;
    current.category = category;
    current.since = now;
  }

  finishFrame(frameMs: number, gpuMs: number | null): void {
    if (!this.enabled) return;
    const now = this.clock();
    let cpu = 0;
    for (const { id } of PERFORMANCE_CATEGORIES) {
      cpu += this.pending[id];
      this.sum[id] += this.pending[id];
      this.pending[id] = 0;
    }
    this.frames++;
    this.cpuPeak = Math.max(this.cpuPeak, cpu);
    // The first interval began before profiling was enabled (or the tab was restored).
    if (!this.firstFrame && Number.isFinite(frameMs) && frameMs > 0) {
      this.intervals++;
      this.frameSum += frameMs;
      this.framePeak = Math.max(this.framePeak, frameMs);
    }
    this.firstFrame = false;
    if (gpuMs !== null && Number.isFinite(gpuMs) && gpuMs >= 0) {
      this.gpuSum += gpuMs;
      this.gpuCount++;
    }
    if (now - this.windowStart < 100 || !this.intervals) return;
    const costs = emptyCosts();
    for (const { id } of PERFORMANCE_CATEGORIES) costs[id] = this.sum[id] / this.frames;
    this.history.push({ at: now, costs, cpu: Object.values(costs).reduce((a, b) => a + b, 0), cpuPeak: this.cpuPeak,
      frame: this.frameSum / this.intervals, framePeak: this.framePeak, gpu: this.gpuCount ? this.gpuSum / this.gpuCount : null });
    // One point per >=100 ms; the extra left-edge point lets the graph clip neatly at 30 s.
    while (this.history.length > 301 || (this.history.length > 1 && this.history[1]!.at < now - 30_000)) this.history.shift();
    this.windowStart = now;
    this.resetWindow();
    this.onSample?.();
  }

  private charge(now: number): void {
    const current = this.stack.at(-1);
    if (current) this.pending[current.category] += Math.max(0, now - current.since);
  }

  private resetWindow(): void {
    this.sum = emptyCosts();
    this.frames = this.intervals = this.frameSum = this.framePeak = this.cpuPeak = this.gpuSum = this.gpuCount = 0;
  }
}

// Each scene owns its measurements; wrappers capture this once, never look it up per frame.
const profilers = new WeakMap<object, FrameProfiler>();
export function profilerFor(scene: object): FrameProfiler {
  let profiler = profilers.get(scene);
  if (!profiler) {
    profiler = new FrameProfiler();
    profilers.set(scene, profiler);
  }
  return profiler;
}
