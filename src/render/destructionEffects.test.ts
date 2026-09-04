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
