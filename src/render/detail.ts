import type { Scene } from "@babylonjs/core/scene";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";

/**
 * What is worth drawing at the height the camera is at. A bin bag, a wheel or someone on foot is
 * a few pixels from a thousand metres up: the frame pays for them in full and the player cannot
 * see them. Each level names the meshes that stop being drawn once the camera is further out than
 * its distance, in metres.
 *
 * By name, because that is what a renderer's output already is here -- no registry to keep in
 * step, and a renderer that starts emitting `footdecor_` meshes tomorrow is covered by the fact
 * that it named them that.
 *
 * ponytail: three thresholds and a name prefix, not a level-of-detail system. If a fourth
 * earns its place, add it here.
 */
const LEVELS: readonly { readonly beyond: number; readonly hide: readonly string[] }[] = [
  // Street furniture and the bits bolted to a car: gone once the whole block is in shot.
  { beyond: 420, hide: ["footdecor_", "carpart_"] },
  // Roof clutter survives longer -- it is most of what a roof looks like from just above it.
  { beyond: 700, hide: ["roofprop_"] },
  // At this height someone on foot is smaller than a pixel. Cars stay: they are what makes a city
  // look alive from up here.
  { beyond: 900, hide: ["pedestrian_"] },
];

export function createDetailCuller(scene: Scene, camera: ArcRotateCamera) {
  let applied = -1;

  /**
   * Called every frame, but the scene is only walked when the level actually changes -- zooming
   * crosses a threshold now and then, and between those it costs one number comparison.
   */
  function update(): void {
    const level = LEVELS.filter((entry) => camera.radius > entry.beyond).length;
    if (level === applied) return;
    applied = level;
    const hidden = LEVELS.slice(0, level).flatMap((entry) => entry.hide);
    for (const mesh of scene.meshes) {
      const prefix = hidden.find((name) => mesh.name.startsWith(name));
      const beyondAll = LEVELS.flatMap((entry) => entry.hide).find((name) => mesh.name.startsWith(name));
      if (prefix) mesh.setEnabled(false);
      else if (beyondAll) mesh.setEnabled(true);
    }
  }

  return {
    update,
    /** A rebuild puts new meshes in the scene, which start out enabled: re-apply on the next frame. */
    invalidate(): void {
      applied = -1;
    },
    get level(): number {
      return applied;
    },
    dispose(): void {
      applied = -1;
    },
  };
}
