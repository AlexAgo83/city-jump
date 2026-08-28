import "@babylonjs/loaders/glTF";
import type { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Matrix, Vector3, Quaternion, Color3 } from "@babylonjs/core/Maths/math";

import type { RoadGraph } from "../sim/graph";
import { buildingParcels, buildableCells, PARCEL_SIZES, type BuildingParcel } from "../sim/slots";

/** Model ids, resolved to `public/buildings/<id>.glb`. See docs/assets.md. */
export const BUILDING_MODELS = PARCEL_SIZES.map(({ frontageCells, depthCells }) => `lot_${frontageCells}x${depthCells}`);

interface Model {
  readonly id: string;
  readonly mesh: Mesh;
  /** Local frontage centre after the loader's handedness transform has been baked. */
  readonly centerX: number;
}

/**
 * One mesh per model, one matrix per building. A city is thousands of buildings and one
 * draw call each does not render; thin instances make the count irrelevant.
 */
export async function createBuildingRenderer(scene: Scene, graph: RoadGraph, shadows: ShadowGenerator) {
  const models = await Promise.all(BUILDING_MODELS.map((id) => loadModel(scene, id, shadows)));
  const available = models.filter((m): m is Model => m !== null);
  let grid: LinesMesh | null = null;
  let visible = true;
  let gridVisible = false;

  function rebuild(): number {
    const cells = buildableCells(graph);
    const parcels = buildingParcels(cells);
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
      grid.setEnabled(gridVisible);
    }
    if (!visible) {
      for (const model of available) {
        model.mesh.thinInstanceCount = 0;
        model.mesh.setEnabled(false);
      }
      return 0;
    }

    const buckets = new Map<string, BuildingParcel[]>(available.map((m) => [m.id, []]));

    for (const parcel of parcels) {
      buckets.get(`lot_${parcel.frontageCells}x${parcel.depthCells}`)?.push(parcel);
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
      for (const [i, parcel] of chosen.entries()) {
        matrixFor(parcel, model.centerX).copyToArray(matrices, i * 16);
      }
      model.mesh.thinInstanceSetBuffer("matrix", matrices, 16);
      placed += chosen.length;
    }
    return placed;
  }

  return {
    rebuild,
    setVisible: (next: boolean) => (visible = next),
    setGridVisible(next: boolean) {
      gridVisible = next;
      grid?.setEnabled(next);
    },
    modelCount: available.length,
  };
}

/** Centres the baked mesh on the parcel frontage regardless of glTF handedness. */
function matrixFor(parcel: BuildingParcel, centerX: number): Matrix {
  const rotation = Quaternion.FromEulerAngles(0, parcel.rotationY, 0);
  // Along-frontage direction is the model's +X once rotated.
  const alongX = Math.cos(parcel.rotationY);
  const alongZ = -Math.sin(parcel.rotationY);
  return Matrix.Compose(
    Vector3.OneReadOnly,
    rotation,
    new Vector3(
      parcel.position.x - alongX * centerX,
      parcel.position.y,
      parcel.position.z - alongZ * centerX,
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
    mesh.receiveShadows = true;
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
    const centerX = (bounds.minimum.x + bounds.maximum.x) / 2;
    return { id, mesh, centerX };
  } catch (error) {
    console.error(`could not load building model "${id}"`, error);
    return null;
  }
}
