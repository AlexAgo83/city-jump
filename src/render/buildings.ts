import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Rendering/edgesRenderer";
import type { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Matrix, Vector3, Quaternion, Color3, Color4 } from "@babylonjs/core/Maths/math";

import type { RoadGraph } from "../sim/graph";
import { GRID, PARCEL_SIZES, type BuildableCell, type BuildingParcel } from "../sim/slots";
import { createGroundShadow } from "./groundShadow";

/** Model ids, resolved to `public/buildings/<id>.glb`. See docs/assets.md. */
export const BUILDING_MODELS = PARCEL_SIZES.map(({ frontageCells, depthCells }) => `lot_${frontageCells}x${depthCells}`);
const BUILDING_ASSET_VERSION = "2026-08-29-19";

type PropKind = "ac" | "tank" | "antenna" | "chimney" | "hut" | "solar";

/**
 * One thing standing on a roof, `x`/`z` a small, fixed offset in metres off the parcel's own
 * reference point -- not a fraction of the footprint, and not rotated with the building. Both of
 * those have to agree with a building's own placement to land on the roof rather than off it, and
 * both have each done that wrong once already; a couple of metres in a fixed direction is
 * comfortably on the smallest roof any layout naming it is offered to, full stop.
 */
interface RoofProp {
  readonly kind: PropKind;
  readonly x: number;
  readonly z: number;
  readonly rotationY: number;
}

/** A roofscape: which props, and only offered to a parcel with at least this many cells to it. */
interface RoofLayout {
  readonly minCells: number;
  readonly props: readonly RoofProp[];
  readonly pitched?: boolean;
}

/**
 * A handful of authored roofscapes rather than a scattering algorithm -- plausible clutter is a
 * handful of props that don't collide, and that is easier to draw by eye a few times over than to
 * get right in general. Every parcel is offered the ones its footprint can fit and picks between
 * them by its own position, so the same building always rolls the same roof. The smallest lot
 * (1x1) is 8m a side, so every offset below stays well under 4m from centre.
 */
const ROOF_LAYOUTS: readonly RoofLayout[] = [
  // Most roofs are just a roof -- clutter on every single one reads as noise, not detail.
  { minCells: 0, props: [] },
  { minCells: 0, pitched: true, props: [] },
  { minCells: 1, pitched: true, props: [{ kind: "chimney", x: 0.9, z: 0, rotationY: 0 }] },
  { minCells: 3, props: [{ kind: "ac", x: -0.8, z: 0.6, rotationY: 0 }] },
  { minCells: 3, props: [{ kind: "chimney", x: 0.9, z: -0.7, rotationY: 0 }] },
  {
    minCells: 2,
    props: [
      { kind: "ac", x: -1, z: 0.8, rotationY: 0.3 },
      { kind: "ac", x: 0.8, z: -0.6, rotationY: -0.4 },
    ],
  },
  {
    minCells: 2,
    props: [
      { kind: "tank", x: 0.7, z: 0.4, rotationY: 0 },
      { kind: "antenna", x: -1, z: -0.8, rotationY: 0 },
    ],
  },
  {
    minCells: 2,
    props: [
      { kind: "chimney", x: 1, z: -0.8, rotationY: 0 },
      { kind: "antenna", x: -0.9, z: 0.7, rotationY: 0 },
    ],
  },
  { minCells: 4, props: [{ kind: "hut", x: -1, z: 0, rotationY: 0 }] },
  {
    minCells: 3,
    props: [
      { kind: "solar", x: 0, z: -1.7, rotationY: 0 },
      { kind: "solar", x: 0, z: 0, rotationY: 0 },
      { kind: "solar", x: 0, z: 1.7, rotationY: 0 },
    ],
  },
  {
    minCells: 6,
    props: [
      { kind: "hut", x: 1.2, z: 0.9, rotationY: 0 },
      { kind: "ac", x: -1.2, z: -0.9, rotationY: 0.5 },
      { kind: "antenna", x: -1.2, z: 1.4, rotationY: 0 },
    ],
  },
  {
    minCells: 6,
    props: [
      { kind: "chimney", x: 1.4, z: -1.1, rotationY: 0 },
      { kind: "antenna", x: -1.3, z: 1.2, rotationY: 0 },
      { kind: "ac", x: 0.1, z: 0.2, rotationY: -0.2 },
    ],
  },
];

export function roofObjectLimit(cells: number): number {
  return Math.min(3, Math.max(0, cells));
}

function buildingSpec(modelId: string): { area: number; width: number; depth: number; height: number; roof: number } | null {
  const size = /^lot_(\d)x(\d)$/.exec(modelId);
  if (!size) return null;
  const frontage = Number(size[1]);
  const depth = Number(size[2]);
  const area = frontage * depth;
  const height = 6 + ((frontage * 7 + depth * 3) % 5) * 3.5 + Math.min(area, 8);
  return { area, width: frontage * GRID.cellSize - 1.5, depth: depth * GRID.cellSize - 1.5, height, roof: area <= 2 ? 2.5 : 0 };
}

export function roofPropY(modelId: string, localX: number, localZ: number, boundsMaxY: number): number {
  const spec = buildingSpec(modelId);
  if (!spec) return boundsMaxY;
  if (spec.roof === 0) {
    const x = localX < 0 ? localX + spec.width : localX;
    const onSetback =
      spec.area >= 6 &&
      x >= spec.width * 0.12 &&
      x <= spec.width * 0.88 &&
      -localZ >= spec.depth * 0.12 &&
      -localZ <= spec.depth * 0.88;
    return onSetback || spec.area < 6 ? spec.height : spec.height * 0.72;
  }
  const y = Math.min(spec.depth, Math.max(0, -localZ));
  return spec.height + spec.roof * (1 - Math.abs(y - spec.depth / 2) / (spec.depth / 2));
}

function hasPitchedRoof(cells: number): boolean {
  return cells <= 2;
}

/** Stable per parcel, so a roof's clutter does not reshuffle every time the city rebuilds. */
function roofSeed(parcel: BuildingParcel): number {
  const ix = Math.round(parcel.position.x * 4);
  const iz = Math.round(parcel.position.z * 4);
  return (
    (Math.imul(ix, 2654435761) ^ Math.imul(iz, 40503) ^ Math.imul(parcel.frontageCells * 4 + parcel.depthCells, 12345)) >>>
    0
  );
}

interface Model {
  readonly id: string;
  readonly mesh: Mesh;
  /** Local frontage centre after the loader's handedness transform has been baked. */
  readonly centerX: number;
  /** Roof height above the parcel's own ground, for whatever stands on top of it. */
  readonly roofY: number;
}

/**
 * One mesh per model, one matrix per building. A city is thousands of buildings and one
 * draw call each does not render; thin instances make the count irrelevant.
 */
export async function createBuildingRenderer(scene: Scene, graph: RoadGraph, shadows: ShadowGenerator) {
  const models = await Promise.all(BUILDING_MODELS.map((id) => loadModel(scene, id, shadows)));
  const available = models.filter((m): m is Model => m !== null);
  const roofProps = buildRoofProps(scene, shadows);
  // Named without the "building_" prefix: that prefix is how tests and the shadow pipeline
  // pick out actual building meshes, and this plane is neither a building nor shadow-mapped.
  const groundShadow = createGroundShadow(scene, "ground_shadow_buildings", 0.32);
  const takenMaterial = new StandardMaterial("buildable-grid-taken", scene);
  // disableLighting means diffuseColor is lit by (black) ambient and never shows -- every other
  // unlit material in this codebase (streetlight glow, tunnel tube) drives its visible color
  // through emissiveColor instead, and this one follows the same convention.
  takenMaterial.diffuseColor = Color3.Black();
  takenMaterial.emissiveColor = new Color3(0.95, 0.55, 0.2);
  takenMaterial.specularColor = Color3.Black();
  takenMaterial.disableLighting = true;
  takenMaterial.alpha = 0.3;
  takenMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
  takenMaterial.backFaceCulling = false;
  let grid: LinesMesh | null = null;
  let taken: Mesh | null = null;
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

    // Not every buildable cell ends up under a building -- a shallow parcel can leave the cells
    // behind it (further from the road) free. Filling only the cells a parcel actually consumed
    // shows which grid squares are taken and which are still open, instead of leaving the grid a
    // uniform outline that gives no hint why a building isn't sitting in some of its cells.
    taken?.dispose();
    const takenCells = parcels.flatMap((parcel) => parcel.cells);
    taken = takenCells.length ? takenCellsMesh(scene, takenCells) : null;
    if (taken) {
      taken.material = takenMaterial;
      taken.isPickable = false;
      taken.setEnabled(gridVisible);
    }
    if (!visible) {
      for (const model of available) {
        model.mesh.thinInstanceCount = 0;
        model.mesh.setEnabled(false);
      }
      for (const mesh of Object.values(roofProps)) {
        mesh.thinInstanceCount = 0;
        mesh.setEnabled(false);
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

    // Whatever stands on each roof: picked once per parcel from `ROOF_LAYOUTS`, by its own
    // model's roof height and its own footprint, then bucketed by kind the same way a building
    // itself is bucketed by model.
    const propMatrices = new Map<PropKind, Matrix[]>();
    for (const parcel of parcels) {
      const model = available.find((m) => m.id === `lot_${parcel.frontageCells}x${parcel.depthCells}`);
      if (!model) continue;
      const cells = parcel.frontageCells * parcel.depthCells;
      const pitched = hasPitchedRoof(cells);
      const offered = ROOF_LAYOUTS.filter(
        (layout) => layout.minCells <= cells && layout.props.length <= roofObjectLimit(cells) && (layout.pitched ?? false) === pitched,
      );
      const layout = offered[roofSeed(parcel) % offered.length]!;
      // `parcel.position` is the frontage edge, not the roof's centre -- the footprint runs
      // back from it by its own full depth, on the building's own local -Z. A prop's small
      // offset lands relative to the actual middle of the roof only once that run-back is
      // added in, through the same matrix that already seats the building itself correctly.
      const buildingMatrix = matrixFor(parcel, model.centerX);
      const halfDepth = (parcel.depthCells * GRID.cellSize - 1.5) / 2;
      for (const prop of layout.props) {
        const localX = prop.x + model.centerX;
        const localZ = -halfDepth + prop.z;
        const local = new Vector3(localX, roofPropY(model.id, localX, localZ, model.roofY), localZ);
        const matrix = Matrix.Compose(
          Vector3.OneReadOnly,
          Quaternion.FromEulerAngles(0, parcel.rotationY + prop.rotationY, 0),
          Vector3.TransformCoordinates(local, buildingMatrix),
        );
        const bucket = propMatrices.get(prop.kind);
        if (bucket) bucket.push(matrix);
        else propMatrices.set(prop.kind, [matrix]);
      }
    }
    for (const [kind, mesh] of Object.entries(roofProps) as [PropKind, Mesh][]) {
      const list = propMatrices.get(kind) ?? [];
      mesh.thinInstanceCount = 0;
      mesh.setEnabled(list.length > 0);
      if (list.length === 0) continue;
      const buffer = new Float32Array(list.length * 16);
      list.forEach((m, i) => m.copyToArray(buffer, i * 16));
      mesh.thinInstanceSetBuffer("matrix", buffer, 16);
    }

    return placed;
  }

  return {
    rebuild,
    setVisible: (next: boolean) => (visible = next),
    setGridVisible(next: boolean) {
      gridVisible = next;
      grid?.setEnabled(next);
      taken?.setEnabled(next);
    },
    /** Faded rather than hidden while drawing roads, so the layout underneath stays visible. */
    setFaded(faded: boolean) {
      for (const model of available) setMaterialAlpha(model.mesh.material, faded ? 0.35 : 1);
      for (const mesh of Object.values(roofProps)) setMaterialAlpha(mesh.material, faded ? 0.35 : 1);
    },
    modelCount: available.length,
  };
}

/** A box, positioned -- the one primitive every roof prop below is built out of. */
function box(scene: Scene, name: string, width: number, height: number, depth: number, x: number, y: number, z: number): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * One prototype per prop kind, built from primitives the same way a car is -- and, like a car,
 * thin-instanced rather than loaded, since there is nothing here a box and a cylinder cannot
 * stand in for at the distance a roof is ever seen from.
 */
function buildRoofProps(scene: Scene, shadows: ShadowGenerator): Record<PropKind, Mesh> {
  const material: Record<PropKind, StandardMaterial> = {
    ac: new StandardMaterial("roofprop_ac", scene),
    tank: new StandardMaterial("roofprop_tank", scene),
    antenna: new StandardMaterial("roofprop_antenna", scene),
    chimney: new StandardMaterial("roofprop_chimney", scene),
    hut: new StandardMaterial("roofprop_hut", scene),
    solar: new StandardMaterial("roofprop_solar", scene),
  };
  material.ac.diffuseColor = new Color3(0.55, 0.56, 0.58);
  material.tank.diffuseColor = new Color3(0.55, 0.36, 0.22);
  material.antenna.diffuseColor = material.ac.diffuseColor;
  material.chimney.diffuseColor = new Color3(0.42, 0.22, 0.16);
  material.hut.diffuseColor = new Color3(0.62, 0.58, 0.5);
  material.solar.diffuseColor = new Color3(0.08, 0.12, 0.22);
  material.solar.specularColor = new Color3(0.4, 0.42, 0.48);

  /** Baked flat, given a name and a material, and switched off until it has instances to show. */
  const finish = (mesh: Mesh, kind: PropKind): Mesh => {
    mesh.name = `roofprop_${kind}`;
    mesh.material = material[kind];
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    mesh.alwaysSelectAsActiveMesh = true;
    // Bakes any rotation set on the merged mesh itself into its vertices, the same way a loaded
    // building is baked -- a thin instance's matrix is the mesh's only transform from here on.
    mesh.bakeCurrentTransformIntoVertices();
    mesh.refreshBoundingInfo();
    mesh.position.y = -mesh.getBoundingInfo().boundingBox.minimum.y;
    mesh.bakeCurrentTransformIntoVertices();
    mesh.setEnabled(false);
    shadows.addShadowCaster(mesh);
    return mesh;
  };

  const ac = Mesh.MergeMeshes(
    [box(scene, "roofprop_ac_body", 1.1, 0.55, 0.9, 0, 0.275, 0), box(scene, "roofprop_ac_duct", 0.3, 0.4, 0.3, 0.75, 0.2, 0)],
    true,
    true,
    undefined,
    false,
    false,
  )!;

  const tankLegs = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => {
      const leg = MeshBuilder.CreateCylinder(`roofprop_tank_leg_${sx}_${sz}`, { diameter: 0.12, height: 0.7, tessellation: 6 }, scene);
      leg.position.set(sx * 0.55, 0.35, sz * 0.55);
      return leg;
    }),
  );
  const tankBody = MeshBuilder.CreateCylinder("roofprop_tank_body", { diameter: 1.6, height: 1.8, tessellation: 12 }, scene);
  tankBody.position.y = 1.6;
  const tank = Mesh.MergeMeshes([tankBody, ...tankLegs], true, true, undefined, false, false)!;

  const pole = MeshBuilder.CreateCylinder("roofprop_antenna_pole", { diameter: 0.06, height: 2.2, tessellation: 6 }, scene);
  pole.position.y = 1.1;
  // A small dish, tilted to catch a signal rather than the sky.
  const dish = MeshBuilder.CreateCylinder("roofprop_antenna_dish", { diameter: 0.5, height: 0.05, tessellation: 12 }, scene);
  dish.position.set(0, 1.9, 0.15);
  dish.rotation.x = Math.PI / 3;
  const antenna = Mesh.MergeMeshes([pole, dish], true, true, undefined, false, false)!;

  const chimney = Mesh.MergeMeshes(
    [
      box(scene, "roofprop_chimney_stack", 0.55, 1.2, 0.55, 0, 0.6, 0),
      box(scene, "roofprop_chimney_cap", 0.75, 0.16, 0.75, 0, 1.28, 0),
    ],
    true,
    true,
    undefined,
    false,
    false,
  )!;

  const hut = Mesh.MergeMeshes(
    [box(scene, "roofprop_hut_body", 1.8, 1.6, 1.6, 0, 0.8, 0), box(scene, "roofprop_hut_lid", 1.9, 0.12, 1.7, 0, 1.66, 0)],
    true,
    true,
    undefined,
    false,
    false,
  )!;

  const solar = box(scene, "roofprop_solar", 1, 0.05, 1.6, 0, 0.35, 0);
  solar.rotation.x = Math.PI / 9;

  return {
    ac: finish(ac, "ac"),
    tank: finish(tank, "tank"),
    antenna: finish(antenna, "antenna"),
    chimney: finish(chimney, "chimney"),
    hut: finish(hut, "hut"),
    solar: finish(solar, "solar"),
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

/** One quad per taken cell, merged into a single mesh -- a highlight, not a hundred draw calls. */
function takenCellsMesh(scene: Scene, cells: readonly BuildableCell[]): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const cell of cells) {
    const base = positions.length / 3;
    for (const corner of cell.corners) positions.push(corner.x, corner.y + 0.1, corner.z);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const mesh = new Mesh("buildable-grid-taken", scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = Array.from({ length: positions.length / 3 }, () => [0, 1, 0]).flat();
  data.applyToMesh(mesh);
  return mesh;
}

async function loadModel(scene: Scene, id: string, shadows: ShadowGenerator): Promise<Model | null> {
  try {
    const result = await SceneLoader.ImportMeshAsync("", "/buildings/", `${id}.glb?v=${BUILDING_ASSET_VERSION}`, scene);
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
    mesh.enableEdgesRendering();
    mesh.edgesWidth = 0.45;
    mesh.edgesColor = new Color4(0.04, 0.05, 0.05, 0.3);
    mesh.setEnabled(false);
    for (const node of result.meshes) if (node !== mesh) node.dispose();

    const bounds = mesh.getBoundingInfo().boundingBox;
    const centerX = (bounds.minimum.x + bounds.maximum.x) / 2;
    return { id, mesh, centerX, roofY: bounds.maximum.y };
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
    finishBuildingMaterial(standard);
    return standard;
  }
  if (lit.name.includes("_glass") && lit.diffuseColor) {
    lit.diffuseColor = new Color3(0.18, 0.32, 0.42);
    lit.emissiveColor = new Color3(0.12, 0.22, 0.3);
  }
  if (lit.ambientColor) lit.ambientColor = Color3.Black();
  if (lit.emissiveColor && !lit.name.includes("_glass")) lit.emissiveColor = Color3.Black();
  if (typeof lit.environmentIntensity === "number") lit.environmentIntensity = 0;
  if (typeof lit.maxSimultaneousLights === "number") lit.maxSimultaneousLights = 32;
  return lit;
}

function finishBuildingMaterial(material: StandardMaterial): void {
  if (material.name.includes("_glass")) {
    material.diffuseColor = new Color3(0.35, 0.75, 0.95);
    material.emissiveColor = new Color3(0.28, 0.55, 0.7);
    material.disableLighting = true;
  } else if (material.name.includes("_trim")) {
    material.diffuseColor = new Color3(0.16, 0.17, 0.18);
    material.emissiveColor = new Color3(0.07, 0.075, 0.08);
    material.disableLighting = true;
  } else if (material.name.includes("_door") || material.name.includes("_industrial_door")) {
    material.diffuseColor = new Color3(0.22, 0.12, 0.08);
    material.emissiveColor = new Color3(0.06, 0.03, 0.02);
    material.disableLighting = true;
  } else if (material.name.includes("_sign")) {
    material.diffuseColor = new Color3(0.95, 0.65, 0.18);
    material.emissiveColor = new Color3(0.28, 0.16, 0.03);
    material.disableLighting = true;
  } else if (material.name.includes("_awning")) {
    material.diffuseColor = new Color3(0.16, 0.28, 0.34);
    material.emissiveColor = new Color3(0.03, 0.05, 0.06);
    material.disableLighting = true;
  }
  material.specularColor = Color3.Black();
  material.maxSimultaneousLights = 32;
}
