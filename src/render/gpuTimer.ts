import type { Engine } from "@babylonjs/core/Engines/engine";
import "@babylonjs/core/Engines/Extensions/engine.query";

/** Time only drawn frames, not the empty engine ticks skipped by the FPS cap. Results arrive later. */
export function createGpuTimer(engine: Engine) {
  let token: ReturnType<Engine["startTimeQuery"]> = null;
  let started = 0;
  let waiting = false;
  let failed = false;
  const clear = (): void => {
    if (token) {
      // Babylon has no public cancellation API. Queries have already ended before any UI toggle.
      for (const query of [token._startTimeQuery, token._endTimeQuery, token._timeElapsedQuery]) {
        if (query) engine._deleteTimeQuery(query);
      }
      if (engine._currentNonTimestampToken === token) engine._currentNonTimestampToken = null;
    }
    token = null;
    waiting = false;
  };
  return {
    begin(): void {
      if (failed || token || !engine.getCaps().timerQuery) return;
      token = engine.startTimeQuery();
      started = performance.now();
      waiting = false;
    },
    end(): number | null {
      if (!token) return null;
      const ns = engine.endTimeQuery(token);
      if (ns >= 0) {
        token = null; // endTimeQuery released its GL queries.
        waiting = false;
        return ns / 1_000_000;
      }
      // A disjoint/lost query must not leave us polling forever or displaying an old result.
      if (waiting && performance.now() - started > 1000) {
        clear();
        failed = true;
      }
      waiting = true;
      return null;
    },
    reset(): void {
      clear();
      failed = false;
    },
  };
}
