import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math";
import type { Heightmap } from "../sim/heightmap";

const movement: Record<string, string> = {
  KeyW: "forward", KeyZ: "forward", ArrowUp: "forward",
  KeyS: "back", ArrowDown: "back", KeyA: "left", KeyQ: "left", ArrowLeft: "left",
  KeyD: "right", ArrowRight: "right", ShiftLeft: "fast", ShiftRight: "fast",
};

/** Keep the same camera so picking, shadows, detail and post-processing share the POV. */
export function createPov(camera: ArcRotateCamera, canvas: HTMLCanvasElement, terrain: Heightmap, exit: () => void) {
  let saved: { target: Vector3; alpha: number; beta: number; radius: number; minZ: number;
    lowerRadiusLimit: number | null; upperBetaLimit: number | null } | null = null;
  const eye = new Vector3();
  const held = new Set<string>();
  let drag: { id: number; x: number; y: number } | null = null;
  const clear = () => { held.clear(); drag = null; };
  const editable = (target: EventTarget | null) => target instanceof HTMLElement &&
    !!target.closest("input, textarea, select, button, [contenteditable='true']");
  const keydown = (event: KeyboardEvent) => {
    if (!saved || editable(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); exit(); return; }
    if (movement[event.code]) { event.preventDefault(); held.add(event.code); }
  };
  const keyup = (event: KeyboardEvent) => { held.delete(event.code); };
  const pointer = (event: PointerEvent) => {
    if (!saved) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type === "pointerdown") {
      canvas.focus();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    } else if (event.type === "pointermove" && drag?.id === event.pointerId) {
      camera.alpha -= (event.clientX - drag.x) * 0.004;
      camera.beta = Math.max(0.1, Math.min(Math.PI - 0.1, camera.beta - (event.clientY - drag.y) * 0.004));
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    } else if (event.type === "pointerup" || event.type === "pointercancel") {
      drag = null;
    }
  };
  const wheel = (event: WheelEvent) => { if (saved) { event.preventDefault(); event.stopImmediatePropagation(); } };
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  window.addEventListener("blur", clear);
  canvas.addEventListener("blur", clear);
  const pointerEvents = ["pointerdown", "pointermove", "pointerup", "pointercancel"] as const;
  for (const type of pointerEvents) canvas.addEventListener(type, pointer, true);
  canvas.addEventListener("wheel", wheel, { capture: true, passive: false });

  function update(seconds: number): void {
    if (!saved) return;
    const directions = new Set([...held].map((code) => movement[code]));
    const forward = Number(directions.has("forward")) - Number(directions.has("back"));
    const right = Number(directions.has("right")) - Number(directions.has("left"));
    const step = Math.min(seconds, 0.1) * (directions.has("fast") ? 18 : 6) / (Math.hypot(forward, right) || 1);
    const limit = terrain.size / 2;
    eye.x = Math.max(-limit, Math.min(limit, eye.x + (-Math.cos(camera.alpha) * forward - Math.sin(camera.alpha) * right) * step));
    eye.z = Math.max(-limit, Math.min(limit, eye.z + (-Math.sin(camera.alpha) * forward + Math.cos(camera.alpha) * right) * step));
    // ponytail: terrain-following spectator, no building collisions; add collision tests for a walking simulation.
    eye.y = Math.max(0, terrain.heightAt(eye.x, eye.z)) + 1.7;
    camera.target.set(eye.x - Math.cos(camera.alpha) * Math.sin(camera.beta),
      eye.y - Math.cos(camera.beta), eye.z - Math.sin(camera.alpha) * Math.sin(camera.beta));
  }
  function setEnabled(enabled: boolean): void {
    if (enabled === !!saved) return;
    clear();
    if (enabled) {
      saved = { target: camera.target.clone(), alpha: camera.alpha, beta: camera.beta, radius: camera.radius,
        minZ: camera.minZ, lowerRadiusLimit: camera.lowerRadiusLimit, upperBetaLimit: camera.upperBetaLimit };
      eye.copyFrom(camera.target);
      camera.detachControl();
      camera.inertialAlphaOffset = camera.inertialBetaOffset = camera.inertialRadiusOffset = 0;
      camera.inertialPanningX = camera.inertialPanningY = 0;
      camera.lowerRadiusLimit = 1;
      camera.upperBetaLimit = Math.PI - 0.1;
      camera.minZ = 0.1;
      camera.radius = 1;
      camera.beta = Math.PI / 2;
      update(0);
      canvas.focus();
    } else if (saved) {
      camera.target.copyFrom(saved.target);
      camera.alpha = saved.alpha;
      camera.beta = saved.beta;
      camera.radius = saved.radius;
      camera.minZ = saved.minZ;
      camera.lowerRadiusLimit = saved.lowerRadiusLimit;
      camera.upperBetaLimit = saved.upperBetaLimit;
      saved = null;
      camera.attachControl(canvas, true);
    }
  }
  return {
    setEnabled, update,
    get savedView() { return saved; },
    dispose() {
      setEnabled(false);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", clear);
      canvas.removeEventListener("blur", clear);
      for (const type of pointerEvents) canvas.removeEventListener(type, pointer, true);
      canvas.removeEventListener("wheel", wheel, true);
    },
  };
}
