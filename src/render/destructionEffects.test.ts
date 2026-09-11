import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { createDetailCuller } from "./detail";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";

import { v3 } from "../sim/vec";
import { createDestructionEffects } from "./destructionEffects";

describe("destruction effects", () => {
  it("draws rubble fires from saved rubble and expires one-shot explosions", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const effects = createDestructionEffects(scene, () => 0);

    effects.rebuildFires([[0, 0], [8, 0]], 0);
    effects.explode(v3(0, 0, 0), 0);

    expect((scene.getMeshByName("roofprop_rubble_fire") as Mesh | null)?.thinInstanceCount).toBe(10);
    const smoke = scene.getMeshByName("rubble_smoke") as Mesh;
    expect(smoke.thinInstanceCount).toBe(6);
    const initialSmoke = smoke.thinInstanceGetWorldMatrices().map((matrix) => [...matrix.m]);
    expect((scene.getMeshByName("rubble_explosion") as Mesh | null)?.thinInstanceCount).toBe(1);

    effects.step(4);
    expect(smoke.thinInstanceGetWorldMatrices().map((matrix) => [...matrix.m])).not.toEqual(initialSmoke);

    expect((scene.getMeshByName("roofprop_rubble_fire") as Mesh | null)?.thinInstanceCount).toBe(10);
    expect((scene.getMeshByName("rubble_explosion") as Mesh | null)?.thinInstanceCount).toBe(0);
    scene.getMeshByName("roofprop_rubble_fire")!.setEnabled(false); // Distance culling hides the small flames.
    const beforeDistantStep = smoke.thinInstanceGetWorldMatrices().map((matrix) => [...matrix.m]);
    effects.step(4.5);
    expect(smoke.thinInstanceGetWorldMatrices().map((matrix) => [...matrix.m])).not.toEqual(beforeDistantStep);
    effects.rebuildFires(Array.from({ length: 80 }, (_, i) => [i * 8, 0] as const), 5);
    expect(smoke.thinInstanceCount).toBe(192);
    effects.rebuildFires([], 6);
    expect(smoke.thinInstanceCount).toBe(0);
    expect(smoke.isEnabled()).toBe(false);

    effects.dispose();
    scene.dispose();
    engine.dispose();
  });

  it("keeps impact dust visible at distance, fades the flash, and clears lighting with its sources", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new ArcRotateCamera("camera", 0, 1, 1000, Vector3.Zero(), scene);
    const detail = createDetailCuller(scene, camera);
    const effects = createDestructionEffects(scene, () => 5);
    const blast = scene.getMeshByName("rubble_blast") as Mesh;
    const explosion = scene.getMeshByName("rubble_explosion") as Mesh;
    let explosionColors: Float32Array | null = null;
    const setBuffer = explosion.thinInstanceSetBuffer.bind(explosion);
    explosion.thinInstanceSetBuffer = (...args: Parameters<typeof setBuffer>) => {
      if (args[0] === "color") explosionColors = args[1];
      return setBuffer(...args);
    };
    const fire = scene.getMeshByName("roofprop_rubble_fire") as Mesh;
    const glow = scene.getLightByName("destruction_glow")!;
    effects.rebuildFires([[0, 0]], 0);
    const initialFlames = fire.thinInstanceGetWorldMatrices().map((matrix) => [...matrix.m]);
    effects.step(0.2);
    expect(fire.thinInstanceGetWorldMatrices().map((matrix) => [...matrix.m])).not.toEqual(initialFlames);
    effects.explode(v3(0, 5, 0), 1);
    const flashIntensity = glow.intensity;
    expect(flashIntensity).toBeGreaterThan(5);
    detail.update();
    expect(fire.isEnabled()).toBe(false);
    expect(explosion.isEnabled()).toBe(true);
    expect(blast.isEnabled()).toBe(true);
    expect(blast.thinInstanceCount).toBe(15);
    effects.step(1.5);
    expect(glow.intensity).toBeLessThan(flashIntensity);
    expect(blast.thinInstanceGetWorldMatrices()[0]!.getTranslation().x).toBeGreaterThan(5);
    effects.step(2);
    expect(explosionColors![3]).toBe(0);
    expect(blast.isEnabled()).toBe(true);
    effects.setEnabled({ fire: false, explosion: false }, 2);
    expect(blast.thinInstanceCount).toBe(0);
    expect(glow.isEnabled()).toBe(false);
    effects.setEnabled({ fire: true, explosion: true }, 3);
    expect(glow.isEnabled()).toBe(true);
    effects.rebuildFires([], 3);
    expect(glow.isEnabled()).toBe(false);
    effects.explode(v3(0, 5, 0), 4);
    effects.step(8);
    expect(blast.isEnabled()).toBe(false);
    expect(glow.isEnabled()).toBe(false);
    effects.dispose();
    expect(scene.lights).toHaveLength(0);
    detail.dispose();
    scene.dispose();
    engine.dispose();
  });

  it("clears the last explosion once, then leaves the empty buffer alone", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const effects = createDestructionEffects(scene, () => 0);
    const mesh = scene.getMeshByName("rubble_explosion") as Mesh;
    let writes = 0;
    const set = mesh.thinInstanceSetBuffer.bind(mesh);
    mesh.thinInstanceSetBuffer = (...args: Parameters<typeof set>) => {
      writes++;
      return set(...args);
    };

    // An idle city: no explosion has ever happened, so there is nothing to write.
    for (let frame = 0; frame < 10; frame++) effects.step(frame * 0.1);
    expect(writes).toBe(0);
    expect(mesh.isEnabled()).toBe(false);

    effects.explode(v3(0, 0, 0), 0);
    expect(mesh.thinInstanceCount).toBe(1);
    const duringExplosion = writes;

    // The frame that expires it clears it, exactly once; the frames after it write nothing.
    effects.step(4);
    expect(mesh.thinInstanceCount).toBe(0);
    expect(mesh.isEnabled()).toBe(false);
    const cleared = writes;
    expect(cleared).toBe(duringExplosion + 1);
    for (let frame = 0; frame < 10; frame++) effects.step(4 + frame * 0.1);
    expect(writes).toBe(cleared);

    effects.dispose();
    scene.dispose();
    engine.dispose();
  });

  it("draws and steps nothing for disabled effects", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const effects = createDestructionEffects(scene, () => 0);

    effects.setEnabled({ fire: false, explosion: false });
    effects.rebuildFires([[0, 0]], 0);
    effects.explode(v3(0, 0, 0), 0);
    effects.step(0.5);

    expect((scene.getMeshByName("roofprop_rubble_fire") as Mesh | null)?.thinInstanceCount).toBe(0);
    expect((scene.getMeshByName("rubble_explosion") as Mesh | null)?.thinInstanceCount).toBe(0);

    effects.setEnabled({ fire: true, explosion: false });
    const smoke = scene.getMeshByName("rubble_smoke") as Mesh;
    expect(smoke.thinInstanceCount).toBe(3);
    effects.setEnabled({ fire: false, explosion: false });
    expect(smoke.thinInstanceCount).toBe(0);
    expect(smoke.isEnabled()).toBe(false);

    effects.dispose();
    scene.dispose();
    engine.dispose();
  });
});
