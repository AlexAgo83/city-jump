export function smoothFps(previous: number | null, deltaMs: number, weight = 0.18): number {
  const current = 1000 / Math.max(deltaMs, 1);
  return previous === null ? current : previous * (1 - weight) + current * weight;
}

export interface FpsMeter {
  readonly active: boolean;
  readonly display: number;
  watch(): () => void;
  frame(now: number): boolean;
}

export function createFpsMeter(updateEveryMs = 500): FpsMeter {
  let watchers = 0;
  let lastFrame: number | null = null;
  let smoothed: number | null = null;
  let display = 0;
  let nextUpdate = 0;
  return {
    get active() {
      return watchers > 0;
    },
    get display() {
      return display;
    },
    watch() {
      watchers++;
      return () => {
        watchers = Math.max(0, watchers - 1);
        if (watchers > 0) return;
        lastFrame = null;
        smoothed = null;
        display = 0;
        nextUpdate = 0;
      };
    },
    frame(now) {
      if (watchers === 0) return false;
      if (lastFrame !== null) smoothed = smoothFps(smoothed, now - lastFrame);
      lastFrame = now;
      if (smoothed === null || now < nextUpdate) return false;
      display = Math.round(smoothed);
      nextUpdate = now + updateEveryMs;
      return true;
    },
  };
}
