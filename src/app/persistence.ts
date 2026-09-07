import type { CitySave, SavedCamera } from "../sim/save";

type Camera = {
  readonly target: { readonly x: number; readonly y: number; readonly z: number; set(x: number, y: number, z: number): void };
  alpha: number;
  beta: number;
  radius: number;
};

export function cameraSnapshot(camera: Camera): SavedCamera {
  return {
    targetX: camera.target.x,
    targetY: camera.target.y,
    targetZ: camera.target.z,
    alpha: camera.alpha,
    beta: camera.beta,
    radius: camera.radius,
  };
}

export function applyCamera(camera: Camera, state: SavedCamera): void {
  camera.target.set(state.targetX, state.targetY, state.targetZ);
  camera.alpha = state.alpha;
  camera.beta = state.beta;
  camera.radius = state.radius;
}

/** Long enough that a burst of edits still collapses into one write. */
const DEBOUNCE_MS = 2000;
/**
 * How long a write may be deferred, however continuously the requests arrive. A debounce alone
 * starves: continuous play at an accelerated rate asks to save more often than every two seconds
 * forever, so the timer was reset forever and nothing ever reached storage. A tab closed mid-play
 * then lost everything since the last edit that happened to leave a two-second gap.
 */
const MAX_WAIT_MS = 10_000;

export function createAutosave(save: () => CitySave, write: (city: CitySave) => boolean, onRefused: () => void): (() => void) & { dispose(): void } {
  // ponytail: a timer and a deadline, not a dirty-flag scheduler.
  let timer = 0;
  let pendingSince = 0;
  let refusedShown = false;
  const flush = (): void => {
    timer = 0;
    pendingSince = 0;
    if (write(save()) || refusedShown) return;
    refusedShown = true;
    onRefused();
  };
  const schedule = (): void => {
    const now = Date.now();
    if (!pendingSince) pendingSince = now;
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, Math.min(DEBOUNCE_MS, Math.max(0, pendingSince + MAX_WAIT_MS - now)));
  };
  schedule.dispose = (): void => {
    window.clearTimeout(timer);
    timer = 0;
    pendingSince = 0;
  };
  return schedule;
}
