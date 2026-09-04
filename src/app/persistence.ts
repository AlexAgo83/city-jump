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

export function createAutosave(save: () => CitySave, write: (city: CitySave) => boolean, onRefused: () => void): (() => void) & { dispose(): void } {
  // ponytail: a timer, not a dirty-flag scheduler.
  let timer = 0;
  let refusedShown = false;
  const schedule = (): void => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (write(save()) || refusedShown) return;
      refusedShown = true;
      onRefused();
    }, 2000);
  };
  schedule.dispose = (): void => window.clearTimeout(timer);
  return schedule;
}
