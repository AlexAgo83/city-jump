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

    expect((scene.getMeshByName("roofprop_rubble_fire") as Mesh | null)?.thinInstanceCount).toBe(2);
    expect((scene.getMeshByName("roofprop_rubble_explosion") as Mesh | null)?.thinInstanceCount).toBe(1);

    effects.step(2);

    expect((scene.getMeshByName("roofprop_rubble_fire") as Mesh | null)?.thinInstanceCount).toBe(2);
    expect((scene.getMeshByName("roofprop_rubble_explosion") as Mesh | null)?.thinInstanceCount).toBe(0);

    effects.dispose();
    scene.dispose();
    engine.dispose();
  });

  it("clears the last explosion once, then leaves the empty buffer alone", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const effects = createDestructionEffects(scene, () => 0);
    const mesh = scene.getMeshByName("roofprop_rubble_explosion") as Mesh;
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
    effects.step(2);
    expect(mesh.thinInstanceCount).toBe(0);
    expect(mesh.isEnabled()).toBe(false);
    const cleared = writes;
    expect(cleared).toBe(duringExplosion + 1);
    for (let frame = 0; frame < 10; frame++) effects.step(2 + frame * 0.1);
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
    expect((scene.getMeshByName("roofprop_rubble_explosion") as Mesh | null)?.thinInstanceCount).toBe(0);

    effects.dispose();
    scene.dispose();
    engine.dispose();
  });
});
