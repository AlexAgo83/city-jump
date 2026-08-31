export interface FpsMeter {
  readonly active: boolean;
  readonly display: number;
  watch(): () => void;
  frame(now: number): boolean;
}

/**
 * Frames counted over a window, which is what "frames per second" means.
 *
 * It used to smooth the instantaneous 1/delta of each frame instead, which reads high whenever
 * frame times are uneven: a run of short frames pulls the average up and the long ones between
 * them never pull it back down as far. On a capped or stuttering frame rate that was a couple of
 * frames a second of flattery -- the number the player is looking at to decide whether the game
 * is coping.
 */
export function createFpsMeter(updateEveryMs = 500): FpsMeter {
  let watchers = 0;
  let frames = 0;
  let windowStart: number | null = null;
  let display = 0;
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
        frames = 0;
        windowStart = null;
        display = 0;
      };
    },
    frame(now) {
      if (watchers === 0) return false;
      if (windowStart === null) {
        windowStart = now;
        return false;
      }
      frames++;
      const elapsed = now - windowStart;
      if (elapsed < updateEveryMs) return false;
      display = Math.round((frames * 1000) / elapsed);
      frames = 0;
      windowStart = now;
      return true;
    },
  };
}
