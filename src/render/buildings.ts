import "@babylonjs/loaders/glTF";
import type { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Matrix, Vector3, Quaternion, Color3 } from "@babylonjs/core/Maths/math";

import type { RoadGraph } from "../sim/graph";
import { GRID, PARCEL_SIZES, type BuildableCell, type BuildingParcel } from "../sim/slots";
import { createGroundShadow } from "./groundShadow";

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
  // Named without the "building_" prefix: that prefix is how tests and the shadow pipeline
  // pick out actual building meshes, and this plane is neither a building nor shadow-mapped.
  const groundShadow = createGroundShadow(scene, "ground_shadow_buildings", 0.32);
  let grid: LinesMesh | null = null;
  let visible = true;
  let gridVisible = false;

  /**
   * `cells` and `parcels` are the caller's, so the layout is solved once per rebuild rather than
   * once here and once again for the terrain that has to be flattened under it.
   */
  function rebuild(cells: readonly BuildableCell[], parcels: readonly BuildingParcel[]): number {
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
      groundShadow.setInstances([]);
      return 0;
    }

    const buckets = new Map<string, BuildingParcel[]>(available.map((m) => [m.id, []]));

    for (const parcel of parcels) {
      buckets.get(`lot_${parcel.frontageCells}x${parcel.depthCells}`)?.push(parcel);
    }
    groundShadow.setInstances(
      parcels.map((parcel) => ({
        x: parcel.position.x,
        y: parcel.position.y,
        z: parcel.position.z,
        radius: ((parcel.frontageCells + parcel.depthCells) / 2) * GRID.cellSize * 0.3,
      })),
    );

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
    /** Faded rather than hidden while drawing roads, so the layout underneath stays visible. */
    setFaded(faded: boolean) {
      for (const model of available) setMaterialAlpha(model.mesh.material, faded ? 0.35 : 1);
    },
    modelCount: available.length,
  };
}

/**
 * A building's material can be a plain StandardMaterial, a converted-in-place PBRMaterial, or
 * a MultiMaterial with either as a sub-material -- recurse the same way normalizeBuildingMaterial
 * already does, rather than assume one shape.
 */
function setMaterialAlpha(material: Material | null, alpha: number): void {
  if (!material) return;
  const withSubs = material as Material & { subMaterials?: (Material | null)[] };
  if (withSubs.subMaterials) {
    for (const sub of withSubs.subMaterials) setMaterialAlpha(sub, alpha);
    return;
  }
  material.alpha = alpha;
  material.transparencyMode = alpha < 1 ? Material.MATERIAL_ALPHABLEND : Material.MATERIAL_OPAQUE;
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
    mesh.material = normalizeBuildingMaterial(scene, mesh.material);
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    mesh.alwaysSelectAsActiveMesh = true; // one bounding box for the whole city is useless
    shadows.addShadowCaster(mesh);

    // The loader parents everything under a __root__ carrying glTF's handedness flip.
    // setParent(null) moves that transform into the mesh's own, and baking it into the
    // vertices leaves an identity transform for the instance matrices to replace.
    mesh.setParent(null);
    mesh.bakeCurrentTransformIntoVertices();
    mesh.convertToFlatShadedMesh();
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

function normalizeBuildingMaterial(scene: Scene, material: Material | null): Material | null {
  const lit = material as
    | (Material & {
        ambientColor?: Color3;
        albedoColor?: Color3;
        diffuseColor?: Color3;
        emissiveColor?: Color3;
        environmentIntensity?: number;
        maxSimultaneousLights?: number;
        subMaterials?: (Material | null)[];
      })
    | null;
  if (!lit) return null;
  if (lit.subMaterials) {
    lit.subMaterials = lit.subMaterials.map((sub) => normalizeBuildingMaterial(scene, sub));
  } else if (lit.albedoColor && !lit.diffuseColor) {
    const standard = new StandardMaterial(`${lit.name}_standard`, scene);
    standard.diffuseColor = lit.albedoColor.clone();
    standard.specularColor = Color3.Black();
    standard.maxSimultaneousLights = 32;
    return standard;
  }
  if (lit.ambientColor) lit.ambientColor = Color3.Black();
  if (lit.emissiveColor) lit.emissiveColor = Color3.Black();
  if (typeof lit.environmentIntensity === "number") lit.environmentIntensity = 0;
  if (typeof lit.maxSimultaneousLights === "number") lit.maxSimultaneousLights = 32;
  return lit;
}
