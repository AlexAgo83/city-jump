import "@babylonjs/loaders/glTF";
import type { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Matrix, Vector3, Quaternion, Color3 } from "@babylonjs/core/Maths/math";

import type { RoadGraph } from "../sim/graph";
import { allSlots, buildableCells, type Slot } from "../sim/slots";

/** Model ids, resolved to `public/buildings/<id>.glb`. See docs/assets.md. */
export const BUILDING_MODELS = ["house", "shop", "block", "tower"] as const;

interface Model {
  readonly id: string;
  readonly mesh: Mesh;
  /** Footprint width, read from the loaded geometry rather than declared anywhere. */
  readonly width: number;
}

/**
 * One mesh per model, one matrix per building. A city is thousands of buildings and one
 * draw call each does not render; thin instances make the count irrelevant.
 */
export async function createBuildingRenderer(scene: Scene, graph: RoadGraph, shadows: ShadowGenerator) {
  const models = await Promise.all(BUILDING_MODELS.map((id) => loadModel(scene, id, shadows)));
  const available = models.filter((m): m is Model => m !== null);
  let grid: LinesMesh | null = null;

  function rebuild(): number {
    const slots = allSlots(graph);
    const cells = buildableCells(graph);
    grid?.dispose();
    grid = cells.length
      ? MeshBuilder.CreateLineSystem(
          "buildable-grid",
          {
            lines: cells.map(({ corners }) =>
              [...corners, corners[0]].map((p) => new Vector3(p.x, p.y + 0.12, p.z)),
            ),
          },
          scene,
        )
      : null;
    if (grid) {
      grid.color = new Color3(0.55, 0.8, 0.9);
      grid.alpha = 0.65;
      grid.isPickable = false;
    }
    const buckets = new Map<string, Slot[]>(available.map((m) => [m.id, []]));

    for (const [i, slot] of slots.entries()) {
      // ponytail: round-robin placeholder. Which building goes where is zoning, and
      // zoning is not in this request at all.
      const model = available[i % available.length];
      if (!model || model.width > slot.frontage) continue;
      buckets.get(model.id)!.push(slot);
    }

    let placed = 0;
    for (const model of available) {
      const chosen = buckets.get(model.id)!;
      model.mesh.thinInstanceCount = 0;
      // A mesh with no instance buffer still draws itself, at the origin. Until it has
      // somewhere to stand, it is switched off rather than left hovering over the map.
      model.mesh.setEnabled(chosen.length > 0);
      if (chosen.length === 0) continue;

      const matrices = new Float32Array(chosen.length * 16);
      for (const [i, slot] of chosen.entries()) {
        matrixFor(slot, model.width).copyToArray(matrices, i * 16);
      }
      model.mesh.thinInstanceSetBuffer("matrix", matrices, 16);
      placed += chosen.length;
    }
    return placed;
  }

  return { rebuild, modelCount: available.length };
}

/**
 * The model's origin is its front-left footprint corner, so it is shifted half its width
 * back along the frontage to sit centred on the slot.
 */
function matrixFor(slot: Slot, width: number): Matrix {
  const rotation = Quaternion.FromEulerAngles(0, slot.rotationY, 0);
  // Along-frontage direction is the model's +X once rotated.
  const alongX = Math.cos(slot.rotationY);
  const alongZ = -Math.sin(slot.rotationY);
  return Matrix.Compose(
    Vector3.OneReadOnly,
    rotation,
    new Vector3(
      slot.position.x - (alongX * width) / 2,
      slot.position.y,
      slot.position.z - (alongZ * width) / 2,
    ),
  );
}

async function loadModel(scene: Scene, id: string, shadows: ShadowGenerator): Promise<Model | null> {
  try {
    const result = await SceneLoader.ImportMeshAsync("", "/buildings/", `${id}.glb`, scene);
    const parts = result.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0);
    if (parts.length === 0) return null;

    const mesh = parts.length === 1 ? parts[0]! : Mesh.MergeMeshes(parts, true, true, undefined, false, true)!;
    mesh.name = `building_${id}`;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true; // one bounding box for the whole city is useless
    shadows.addShadowCaster(mesh);

    // The loader parents everything under a __root__ carrying glTF's handedness flip.
    // setParent(null) moves that transform into the mesh's own, and baking it into the
    // vertices leaves an identity transform for the instance matrices to replace.
    mesh.setParent(null);
    mesh.bakeCurrentTransformIntoVertices();
    mesh.refreshBoundingInfo();
    mesh.setEnabled(false);
    for (const node of result.meshes) if (node !== mesh) node.dispose();

    const bounds = mesh.getBoundingInfo().boundingBox;
    const width = bounds.maximum.x - bounds.minimum.x;
    return { id, mesh, width };
  } catch (error) {
    console.error(`could not load building model "${id}"`, error);
    return null;
  }
}
