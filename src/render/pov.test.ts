import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { expect, it, vi } from "vitest";
import { Heightmap } from "../sim/heightmap";
import { createPov } from "./pov";

it("walks at eye level, normalizes diagonals, clears input and restores the aerial camera", () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const camera = new ArcRotateCamera("camera", -Math.PI / 2, 0.8, 200, new Vector3(0, 2, 0), scene);
  camera.lowerRadiusLimit = 20;
  camera.upperBetaLimit = 1.4;
  camera.minZ = 2;
  vi.spyOn(camera, "attachControl").mockImplementation(() => {});
  vi.spyOn(camera, "detachControl").mockImplementation(() => {});
  class Element extends EventTarget {
    focus() {}
    closest() { return null; }
    setPointerCapture() {}
  }
  const browser = new EventTarget();
  const canvas = new Element();
  vi.stubGlobal("window", browser);
  vi.stubGlobal("HTMLElement", Element);
  const terrain = new Heightmap({ size: 80, cell: 4, generator: (x, z) => 2 + z * 0.1 + x * 0.05 });
  let pov: ReturnType<typeof createPov>;
  pov = createPov(camera, canvas as unknown as HTMLCanvasElement, terrain, () => pov.setEnabled(false));
  const cancelSelection = vi.fn();
  browser.addEventListener("keydown", (event) => { if ((event as KeyboardEvent).key === "Escape") cancelSelection(); });
  const key = (type: string, code: string) => browser.dispatchEvent(Object.assign(new Event(type), { code, key: code }));
  const position = () => { camera.getViewMatrix(true); return camera.position.clone(); };
  try {
    pov.setEnabled(true);
    expect(pov.savedView?.radius).toBe(200);
    expect(position().y).toBeCloseTo(3.7);
    key("keydown", "KeyW");
    pov.update(0.1);
    key("keyup", "KeyW");
    expect(position().z).toBeCloseTo(0.6);
    expect(position().y).toBeCloseTo(terrain.heightAt(position().x, position().z) + 1.7);
    const beforeDiagonal = position();
    key("keydown", "KeyZ");
    key("keydown", "KeyD");
    pov.update(0.1);
    expect(Math.hypot(position().x - beforeDiagonal.x, position().z - beforeDiagonal.z)).toBeCloseTo(0.6);
    browser.dispatchEvent(new Event("blur"));
    const stopped = position();
    pov.update(0.1);
    expect(position()).toEqual(stopped);
    key("keydown", "ArrowUp");
    key("keydown", "ShiftLeft");
    pov.update(0.1);
    expect(position().z - stopped.z).toBeCloseTo(1.8);
    for (let i = 0; i < 100; i++) pov.update(1);
    expect(position().z).toBeCloseTo(40);
    key("keydown", "Escape");
    expect(camera.target).toEqual(new Vector3(0, 2, 0));
    expect([camera.radius, camera.beta, camera.minZ, camera.lowerRadiusLimit, camera.upperBetaLimit]).toEqual([200, 0.8, 2, 20, 1.4]);
    expect(pov.savedView).toBeNull();
    expect(cancelSelection).not.toHaveBeenCalled();
    pov.setEnabled(true);
    const reentered = position();
    pov.update(0.1);
    expect(position()).toEqual(reentered);
  } finally {
    pov.dispose();
    scene.dispose();
    engine.dispose();
    vi.unstubAllGlobals();
  }
});
