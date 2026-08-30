import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import type { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { RawCubeTexture } from "@babylonjs/core/Materials/Textures/rawCubeTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Matrix, Vector3, Quaternion, Color3 } from "@babylonjs/core/Maths/math";

import type { RoadGraph } from "../sim/graph";
import { GRID, PARCEL_SIZES, type BuildableCell, type BuildingParcel } from "../sim/slots";
import { terrainHeight } from "../sim/terrain";
import { createGroundShadow } from "./groundShadow";

/** Model ids, resolved to `public/buildings/<id>.glb`. See docs/assets.md. */
export const BUILDING_MODELS = PARCEL_SIZES.map(({ frontageCells, depthCells }) => `lot_${frontageCells}x${depthCells}`);
const BUILDING_ASSET_VERSION = "2026-08-30-01";
let glassReflectionTexture: RawCubeTexture | null = null;

type RoofGeometry =
  | { readonly kind: "flat"; readonly deckY: number }
  | {
      readonly kind: "pitched";
      readonly deckY: number;
      readonly ridgeY: number;
      readonly ridgeZ: number;
    }
  | {
      readonly kind: "setback";
      readonly lowerDeckY: number;
      readonly upperDeckY: number;
      readonly width: number;
      readonly minX: number;
      readonly maxX: number;
      readonly minZ: number;
      readonly maxZ: number;
    };

interface BuildingManifest {
  readonly models: Record<string, RoofGeometry | undefined>;
}

type PropKind = "ac" | "tank" | "antenna" | "chimney" | "hut" | "solar";
type FootDecorKind = "bench" | "bollard" | "planter" | "utility" | "trash" | "mail" | "sign" | "shrub" | "bikeRack" | "crate" | "barrier" | "wallLight" | "vending";
type FootDecorFace = "front" | "back" | "left" | "right";

interface FootDecorPlacement {
  readonly kind: FootDecorKind;
  readonly matrix: Matrix;
}

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

export function roofPropY(roof: RoofGeometry | undefined, localX: number, localZ: number, boundsMaxY: number): number {
  if (!roof) return boundsMaxY;
  if (roof.kind === "flat") return roof.deckY;
  if (roof.kind === "setback") {
    const x = localX < 0 ? localX + roof.width : localX;
    return x >= roof.minX && x <= roof.maxX && localZ >= roof.minZ && localZ <= roof.maxZ ? roof.upperDeckY : roof.lowerDeckY;
  }
  const z = Math.min(0, Math.max(roof.ridgeZ * 2, localZ));
  return roof.deckY + (roof.ridgeY - roof.deckY) * (1 - Math.abs(z - roof.ridgeZ) / Math.abs(roof.ridgeZ));
}

function hasPitchedRoof(roof: RoofGeometry | undefined): boolean {
  return roof?.kind === "pitched";
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
  readonly roof: RoofGeometry | undefined;
}

/**
 * One mesh per model, one matrix per building. A city is thousands of buildings and one
 * draw call each does not render; thin instances make the count irrelevant.
 */
export async function createBuildingRenderer(scene: Scene, graph: RoadGraph, shadows: ShadowGenerator) {
  const manifest = await loadManifest();
  const available: Model[] = [];
  const roofProps = buildRoofProps(scene, shadows);
  const footDecor = buildFootDecor(scene);
  // Named without the "building_" prefix: that prefix is how tests and the shadow pipeline
  // pick out actual building meshes, and this plane is neither a building nor shadow-mapped.
  const groundShadow = createGroundShadow(scene, "ground_shadow_buildings", 0.32);
  const groundPad = buildingGroundPadMesh(scene);
  const groundPadMaterial = new StandardMaterial("building-ground-pad", scene);
  // Same paving tone as sidewalks, faded at the edges by vertex alpha.
  groundPadMaterial.diffuseColor = new Color3(0.56, 0.53, 0.48);
  groundPadMaterial.specularColor = Color3.Black();
  groundPadMaterial.alpha = 0.42;
  groundPadMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
  groundPadMaterial.backFaceCulling = false;
  groundPad.material = groundPadMaterial;
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
  // Roof props are created already opaque (see buildRoofProps), so this starts in sync with that
  // -- the very first setFaded(false) is then correctly a no-op too, not just repeats of it.
  let lastFaded = false;
  let lastPlaced = 0;
  let lastCells: readonly BuildableCell[] = [];
  let lastParcels: readonly BuildingParcel[] = [];

  function applyBuildingVisibility(): void {
    for (const model of available) model.mesh.setEnabled(visible && model.mesh.thinInstanceCount > 0);
    for (const mesh of Object.values(roofProps)) mesh.setEnabled(visible && mesh.thinInstanceCount > 0);
    for (const mesh of Object.values(footDecor)) mesh.setEnabled(visible && mesh.thinInstanceCount > 0);
    groundShadow.mesh.setEnabled(visible && groundShadow.mesh.thinInstanceCount > 0);
    groundPad.setEnabled(visible && groundPad.thinInstanceCount > 0);
  }

  /**
   * `cells` and `parcels` are the caller's, so the layout is solved once per rebuild rather than
   * once here and once again for the terrain that has to be flattened under it.
   */
  function rebuild(cells: readonly BuildableCell[], parcels: readonly BuildingParcel[]): number {
    lastCells = cells;
    lastParcels = parcels;
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
    const padMatrices = new Float32Array(parcels.length * 16);
    for (const [i, parcel] of parcels.entries()) buildingGroundPadMatrix(parcel).copyToArray(padMatrices, i * 16);
    groundPad.thinInstanceSetBuffer("matrix", padMatrices, 16, false);
    groundPad.thinInstanceCount = parcels.length;
    const occupiedCells = buildingCellSet(parcels);
    const footDecorMatrices = new Map<FootDecorKind, Matrix[]>();
    for (const parcel of parcels) {
      for (const placement of buildingFootDecorMatrices(parcel, terrainHeight, buildingBlockedDecorFaces(parcel, occupiedCells))) {
        const bucket = footDecorMatrices.get(placement.kind);
        if (bucket) bucket.push(placement.matrix);
        else footDecorMatrices.set(placement.kind, [placement.matrix]);
      }
    }

    let placed = 0;
    for (const model of available) {
      const chosen = buckets.get(model.id)!;
      model.mesh.thinInstanceCount = 0;
      // A mesh with no instance buffer still draws itself, at the origin. Until it has
      // somewhere to stand, it is switched off rather than left hovering over the map.
      model.mesh.setEnabled(visible && chosen.length > 0);
      if (chosen.length === 0) continue;

      const matrices = new Float32Array(chosen.length * 16);
      for (const [i, parcel] of chosen.entries()) {
        matrixFor(parcel, model.centerX).copyToArray(matrices, i * 16);
      }
      // Non-static: this buffer's instance count changes on every rebuild, and Babylon's
      // default (staticBuffer: true) left the GPU-side buffer sized for whichever rebuild
      // created it first -- a later, bigger count then drew past the end of that buffer
      // (a real "vertex buffer not big enough" GL error, silently dropping the draw for
      // that model, which is what read as buildings losing their roof/trim on a tool switch).
      model.mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
      model.mesh.thinInstanceCount = chosen.length;
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
      const pitched = hasPitchedRoof(model.roof);
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
        const local = new Vector3(localX, roofPropY(model.roof, localX, localZ, model.roofY), localZ);
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
      mesh.setEnabled(visible && list.length > 0);
      if (list.length === 0) continue;
      const buffer = new Float32Array(list.length * 16);
      list.forEach((m, i) => m.copyToArray(buffer, i * 16));
      mesh.thinInstanceSetBuffer("matrix", buffer, 16, false); // non-static: count changes every rebuild
      mesh.thinInstanceCount = list.length;
    }
    for (const [kind, mesh] of Object.entries(footDecor) as [FootDecorKind, Mesh][]) {
      const list = footDecorMatrices.get(kind) ?? [];
      mesh.thinInstanceCount = 0;
      mesh.setEnabled(visible && list.length > 0);
      if (list.length === 0) continue;
      const buffer = new Float32Array(list.length * 16);
      list.forEach((m, i) => m.copyToArray(buffer, i * 16));
      mesh.thinInstanceSetBuffer("matrix", buffer, 16, false);
      mesh.thinInstanceCount = list.length;
    }

    lastPlaced = placed;
    applyBuildingVisibility();
    return visible ? placed : 0;
  }

  // The 16 lot models resolve over a few frames, and each used to trigger its own full rebuild --
  // parcel bucketing, roof props and shadows over the *whole* city, once per model. On a small
  // demo city that's unnoticeable; on a real, built-up one it stacked into a multi-second freeze
  // as new models kept restarting the same city-wide pass. Debounced so the burst of arrivals
  // collapses into one rebuild after they settle, the same pattern the dirty-edit path already uses.
  let modelLoadRebuildTimer = 0;
  for (const id of BUILDING_MODELS) {
    void loadModel(scene, id, shadows, manifest.models[id]).then((model) => {
      if (!model) return;
      available.push(model);
      clearTimeout(modelLoadRebuildTimer);
      modelLoadRebuildTimer = window.setTimeout(() => rebuild(lastCells, lastParcels), 50);
    });
  }
  const startupModelCount = available.length;
  return {
    rebuild,
    setVisible(next: boolean) {
      visible = next;
      applyBuildingVisibility();
      return visible ? lastPlaced : 0;
    },
    setGridVisible(next: boolean) {
      gridVisible = next;
      grid?.setEnabled(next);
      taken?.setEnabled(next);
    },
    setFaded(faded: boolean) {
      // Buildings themselves stay permanently opaque (fading them briefly showed their trim as
      // wireframe) -- only the roof props still fade. Every tool-bar click calls this, including
      // repeats of the same faded value; reassigning transparencyMode even to the value it already
      // has was enough to corrupt the thin-instance draw state on unrelated building meshes
      // (buildings losing their roof/trim until a reload). Skip the no-op case entirely.
      if (faded === lastFaded) return;
      lastFaded = faded;
      for (const mesh of Object.values(roofProps)) setMaterialAlpha(mesh.material, faded ? 0.35 : 1);
    },
    count: () => (visible ? lastPlaced : 0),
    buildingAt(x: number, z: number): BuildingParcel | null {
      if (!visible) return null;
      return lastParcels.find((parcel) => parcel.cells.some((cell) => pointInCell(x, z, cell))) ?? null;
    },
    buildingPoint(): { x: number; y: number; z: number } | null {
      const points = lastParcels
        .map((parcel) => parcel.cells[0])
        .filter((cell): cell is BuildableCell => cell !== undefined)
        .map((cell) => ({
          x: cell.corners.reduce((sum, p) => sum + p.x, 0) / 4,
          y: cell.corners.reduce((sum, p) => sum + p.y, 0) / 4,
          z: cell.corners.reduce((sum, p) => sum + p.z, 0) / 4,
        }));
      return points.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0] ?? null;
    },
    get modelCount() {
      return available.length;
    },
    startupModelCount,
  };
}

function pointInCell(x: number, z: number, cell: BuildableCell): boolean {
  let sign = 0;
  for (let i = 0; i < cell.corners.length; i++) {
    const a = cell.corners[i]!;
    const b = cell.corners[(i + 1) % cell.corners.length]!;
    const cross = (b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x);
    if (Math.abs(cross) < 1e-6) continue;
    const next = Math.sign(cross);
    if (sign && next !== sign) return false;
    sign = next;
  }
  return true;
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

function buildFootDecor(scene: Scene): Record<FootDecorKind, Mesh> {
  const material: Record<FootDecorKind, StandardMaterial> = {
    bench: new StandardMaterial("footdecor_bench", scene),
    bollard: new StandardMaterial("footdecor_bollard", scene),
    planter: new StandardMaterial("footdecor_planter", scene),
    utility: new StandardMaterial("footdecor_utility", scene),
    trash: new StandardMaterial("footdecor_trash", scene),
    mail: new StandardMaterial("footdecor_mail", scene),
    sign: new StandardMaterial("footdecor_sign", scene),
    shrub: new StandardMaterial("footdecor_shrub", scene),
    bikeRack: new StandardMaterial("footdecor_bikeRack", scene),
    crate: new StandardMaterial("footdecor_crate", scene),
    barrier: new StandardMaterial("footdecor_barrier", scene),
    wallLight: new StandardMaterial("footdecor_wallLight", scene),
    vending: new StandardMaterial("footdecor_vending", scene),
  };
  material.bench.diffuseColor = new Color3(0.34, 0.2, 0.12);
  material.bollard.diffuseColor = new Color3(0.82, 0.72, 0.42);
  material.planter.diffuseColor = new Color3(0.18, 0.38, 0.2);
  material.utility.diffuseColor = new Color3(0.32, 0.34, 0.34);
  material.trash.diffuseColor = new Color3(0.12, 0.26, 0.24);
  material.mail.diffuseColor = new Color3(0.14, 0.28, 0.68);
  material.sign.diffuseColor = new Color3(0.78, 0.72, 0.52);
  material.shrub.diffuseColor = new Color3(0.12, 0.36, 0.16);
  material.bikeRack.diffuseColor = new Color3(0.58, 0.6, 0.62);
  material.crate.diffuseColor = new Color3(0.5, 0.3, 0.16);
  material.barrier.diffuseColor = new Color3(0.86, 0.28, 0.12);
  material.wallLight.diffuseColor = new Color3(0.92, 0.78, 0.42);
  material.wallLight.emissiveColor = new Color3(0.25, 0.18, 0.06);
  material.vending.diffuseColor = new Color3(0.7, 0.12, 0.16);
  for (const mat of Object.values(material)) mat.specularColor = Color3.Black();

  const finish = (mesh: Mesh, kind: FootDecorKind): Mesh => {
    mesh.name = `footdecor_${kind}`;
    mesh.material = material[kind];
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.setEnabled(false);
    return mesh;
  };

  const bench = Mesh.MergeMeshes(
    [
      box(scene, "footdecor_bench_seat", 2.6, 0.22, 0.7, 0, 0.48, 0),
      box(scene, "footdecor_bench_back", 2.6, 0.68, 0.18, 0, 0.82, -0.36),
    ],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const bollard = MeshBuilder.CreateCylinder("footdecor_bollard", { diameter: 0.42, height: 1, tessellation: 8 }, scene);
  bollard.position.y = 0.5;
  const planter = box(scene, "footdecor_planter", 2.2, 0.55, 0.75, 0, 0.275, 0);
  const utility = box(scene, "footdecor_utility", 1.15, 1.05, 0.7, 0, 0.525, 0);
  const trash = MeshBuilder.CreateCylinder("footdecor_trash", { diameter: 0.75, height: 1, tessellation: 10 }, scene);
  trash.position.y = 0.5;
  const mail = Mesh.MergeMeshes(
    [box(scene, "footdecor_mail_post", 0.16, 0.8, 0.16, 0, 0.4, 0), box(scene, "footdecor_mail_box", 0.9, 0.42, 0.55, 0, 0.95, 0)],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const sign = Mesh.MergeMeshes(
    [box(scene, "footdecor_sign_board", 1, 0.72, 0.08, 0, 0.78, 0), box(scene, "footdecor_sign_feet", 1.1, 0.12, 0.5, 0, 0.06, 0)],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const shrubTop = MeshBuilder.CreateSphere("footdecor_shrub_top", { diameter: 1.15, segments: 8 }, scene);
  shrubTop.position.y = 0.95;
  const shrub = Mesh.MergeMeshes([box(scene, "footdecor_shrub_pot", 0.8, 0.45, 0.8, 0, 0.225, 0), shrubTop], true, true, undefined, false, false)!;
  const bikeRack = Mesh.MergeMeshes(
    [-0.45, 0, 0.45].map((x) => box(scene, `footdecor_bikeRack_${x}`, 0.08, 0.75, 0.55, x, 0.375, 0)),
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const crate = Mesh.MergeMeshes(
    [box(scene, "footdecor_crate_a", 0.85, 0.55, 0.75, -0.25, 0.275, 0), box(scene, "footdecor_crate_b", 0.7, 0.45, 0.65, 0.45, 0.225, 0.05)],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const barrier = Mesh.MergeMeshes(
    [box(scene, "footdecor_barrier_bar", 1.6, 0.18, 0.12, 0, 0.7, 0), box(scene, "footdecor_barrier_l", 0.14, 0.9, 0.14, -0.65, 0.45, 0), box(scene, "footdecor_barrier_r", 0.14, 0.9, 0.14, 0.65, 0.45, 0)],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const wallLightGlobe = MeshBuilder.CreateSphere("footdecor_wallLight_globe", { diameter: 0.45, segments: 8 }, scene);
  wallLightGlobe.position.y = 1;
  const wallLight = Mesh.MergeMeshes([box(scene, "footdecor_wallLight_stem", 0.14, 0.8, 0.14, 0, 0.4, 0), wallLightGlobe], true, true, undefined, false, false)!;
  const vending = box(scene, "footdecor_vending", 0.95, 1.8, 0.65, 0, 0.9, 0);

  return {
    bench: finish(bench, "bench"),
    bollard: finish(bollard, "bollard"),
    planter: finish(planter, "planter"),
    utility: finish(utility, "utility"),
    trash: finish(trash, "trash"),
    mail: finish(mail, "mail"),
    sign: finish(sign, "sign"),
    shrub: finish(shrub, "shrub"),
    bikeRack: finish(bikeRack, "bikeRack"),
    crate: finish(crate, "crate"),
    barrier: finish(barrier, "barrier"),
    wallLight: finish(wallLight, "wallLight"),
    vending: finish(vending, "vending"),
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

export function buildingGroundPadMatrix(parcel: BuildingParcel): Matrix {
  const margin = 8;
  const width = parcel.frontageCells * GRID.cellSize + margin;
  const depth = parcel.depthCells * GRID.cellSize + margin;
  const rotation = Quaternion.FromEulerAngles(0, parcel.rotationY, 0);
  const outX = -Math.sin(parcel.rotationY);
  const outZ = -Math.cos(parcel.rotationY);
  return Matrix.Compose(
    new Vector3(width, 1, depth),
    rotation,
    new Vector3(parcel.position.x + outX * (depth / 2 - margin / 2), parcel.position.y + 0.035, parcel.position.z + outZ * (depth / 2 - margin / 2)),
  );
}

export function buildingFootDecorMatrices(
  parcel: BuildingParcel,
  heightAt = terrainHeight,
  blockedFaces: ReadonlySet<FootDecorFace> = new Set(),
): FootDecorPlacement[] {
  const width = parcel.frontageCells * GRID.cellSize;
  const depth = parcel.depthCells * GRID.cellSize;
  const halfWidth = width / 2;
  const gap = 0.8;
  const placements: FootDecorPlacement[] = [];
  const maxPlacements = 1 + (roofSeed(parcel) % 4);

  const add = (kind: FootDecorKind, localX: number, localZ: number, rotationY: number) => {
    if (placements.length >= maxPlacements) return;
    const rotation = Quaternion.FromEulerAngles(0, parcel.rotationY, 0);
    const position = Vector3.TransformCoordinates(
      new Vector3(localX, 0, localZ),
      Matrix.Compose(Vector3.OneReadOnly, rotation, new Vector3(parcel.position.x, parcel.position.y, parcel.position.z)),
    );
    position.y = heightAt(position.x, position.z) + 0.08;
    placements.push({
      kind,
      matrix: Matrix.Compose(Vector3.OneReadOnly, Quaternion.FromEulerAngles(0, parcel.rotationY + rotationY, 0), position),
    });
  };
  const shouldPlace = (face: FootDecorFace, i: number) => decorSeed(parcel, face, i) % 5 !== 0;
  const pick = (face: FootDecorFace, i: number, kinds: readonly FootDecorKind[]) => kinds[Math.floor(decorSeed(parcel, face, i) / 5) % kinds.length]!;

  for (let i = 0; i < parcel.frontageCells; i++) {
    const x = -halfWidth + (i + 0.5) * GRID.cellSize;
    if (parcel.frontageCells > 1 && !blockedFaces.has("front") && shouldPlace("front", i)) add(pick("front", i, ["bench", "planter", "sign", "trash", "mail", "bikeRack", "vending"]), x, gap, 0);
    if (!blockedFaces.has("back") && shouldPlace("back", i)) add(pick("back", i, ["utility", "crate", "barrier", "trash", "shrub"]), x, -depth - gap, Math.PI);
  }
  for (let i = 0; i < parcel.depthCells; i++) {
    const z = -(i + 0.5) * GRID.cellSize;
    if (!blockedFaces.has("left") && shouldPlace("left", i)) add(pick("left", i, ["bollard", "planter", "shrub", "wallLight"]), -halfWidth - gap, z, Math.PI / 2);
    if (!blockedFaces.has("right") && shouldPlace("right", i)) add(pick("right", i, ["planter", "bollard", "wallLight", "trash"]), halfWidth + gap, z, -Math.PI / 2);
  }

  return placements;
}

function decorSeed(parcel: BuildingParcel, face: FootDecorFace, index: number): number {
  const faceSeed = face === "front" ? 11 : face === "back" ? 23 : face === "left" ? 37 : 41;
  return (roofSeed(parcel) ^ Math.imul(faceSeed + index, 2654435761)) >>> 0;
}

export function buildingBlockedDecorFaces(parcel: BuildingParcel, occupiedCells: ReadonlySet<string>): ReadonlySet<FootDecorFace> {
  if (parcel.cells.length === 0) return new Set();
  const rows = parcel.cells.map((cell) => cell.row);
  const columns = parcel.cells.map((cell) => cell.column);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minColumn = Math.min(...columns);
  const maxColumn = Math.max(...columns);
  const first = parcel.cells[0]!;
  const has = (column: number, row: number) => occupiedCells.has(buildingCellKey(first, column, row));
  const blocked = new Set<FootDecorFace>();
  if (Array.from({ length: parcel.frontageCells }, (_, i) => minColumn + i).some((column) => has(column, minRow - 1))) blocked.add("front");
  if (Array.from({ length: parcel.frontageCells }, (_, i) => minColumn + i).some((column) => has(column, maxRow + 1))) blocked.add("back");
  if (Array.from({ length: parcel.depthCells }, (_, i) => minRow + i).some((row) => has(minColumn - 1, row))) blocked.add("left");
  if (Array.from({ length: parcel.depthCells }, (_, i) => minRow + i).some((row) => has(maxColumn + 1, row))) blocked.add("right");
  return blocked;
}

function buildingCellSet(parcels: readonly BuildingParcel[]): Set<string> {
  return new Set(parcels.flatMap((parcel) => parcel.cells.map((cell) => buildingCellKey(cell, cell.column, cell.row))));
}

function buildingCellKey(cell: BuildableCell, column: number, row: number): string {
  return `${cell.segment}:${cell.side}:${cell.block}:${column}:${row}`;
}

function buildingGroundPadMesh(scene: Scene): Mesh {
  const steps = 8;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let z = 0; z <= steps; z++) {
    for (let x = 0; x <= steps; x++) {
      const u = x / steps;
      const v = z / steps;
      positions.push(u - 0.5, 0, v - 0.5);
      const edge = Math.min(u, v, 1 - u, 1 - v);
      colors.push(1, 1, 1, Math.min(1, edge / 0.18));
      if (x < steps && z < steps) {
        const i = z * (steps + 1) + x;
        indices.push(i, i + 1, i + steps + 1, i + 1, i + steps + 2, i + steps + 1);
      }
    }
  }
  const mesh = new Mesh("building-ground-pads", scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = Array.from({ length: positions.length / 3 }, () => [0, 1, 0]).flat();
  data.colors = colors;
  data.applyToMesh(mesh, true);
  mesh.hasVertexAlpha = true;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.setEnabled(false);
  return mesh;
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

async function loadManifest(): Promise<BuildingManifest> {
  try {
    const response = await fetch(`/buildings/manifest.json?v=${BUILDING_ASSET_VERSION}`);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json() as BuildingManifest;
  } catch (error) {
    console.error("could not load building manifest", error);
    return { models: {} };
  }
}

async function loadModel(scene: Scene, id: string, shadows: ShadowGenerator, roof: RoofGeometry | undefined): Promise<Model | null> {
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
    mesh.setEnabled(false);
    for (const node of result.meshes) if (node !== mesh) node.dispose();

    const bounds = mesh.getBoundingInfo().boundingBox;
    const centerX = (bounds.minimum.x + bounds.maximum.x) / 2;
    return { id, mesh, centerX, roofY: bounds.maximum.y, roof };
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
        reflectionTexture?: BaseTexture | null;
        specularColor?: Color3;
        specularPower?: number;
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
    lit.diffuseColor = new Color3(0.28, 0.38, 0.44);
    lit.alpha = 1;
    lit.transparencyMode = Material.MATERIAL_OPAQUE;
    lit.reflectionTexture = mirrorGlassReflection(scene);
    if (lit.specularColor) lit.specularColor = new Color3(0.8, 0.9, 1);
    if (typeof lit.specularPower === "number") lit.specularPower = 96;
  } else if (lit.name.includes("_trim")) {
    lit.alpha = 1;
    lit.transparencyMode = Material.MATERIAL_OPAQUE;
    // The trim sits a few centimetres from the wall/glass behind it -- close enough that depth
    // precision flickers between them at distance or a grazing angle. Nudging trim toward the
    // camera in the depth buffer settles which one wins instead of leaving it to flicker.
    lit.zOffset = -2;
  }
  if (lit.ambientColor) lit.ambientColor = Color3.Black();
  if (lit.emissiveColor) lit.emissiveColor = Color3.Black();
  if (typeof lit.environmentIntensity === "number") lit.environmentIntensity = 0;
  if (typeof lit.maxSimultaneousLights === "number") lit.maxSimultaneousLights = 32;
  return lit;
}

function finishBuildingMaterial(material: StandardMaterial): void {
  if (material.name.includes("_glass")) {
    material.diffuseColor = new Color3(0.28, 0.38, 0.44);
    material.emissiveColor = Color3.Black();
    material.alpha = 1;
    material.transparencyMode = Material.MATERIAL_OPAQUE;
    material.reflectionTexture = mirrorGlassReflection(material.getScene());
    material.specularColor = new Color3(0.8, 0.9, 1);
    material.specularPower = 96;
  } else if (material.name.includes("_door") || material.name.includes("_industrial_door")) {
    material.diffuseColor = new Color3(0.22, 0.12, 0.08);
  } else if (material.name.includes("_sign")) {
    material.diffuseColor = new Color3(0.95, 0.65, 0.18);
  } else if (material.name.includes("_awning")) {
    material.diffuseColor = new Color3(0.16, 0.28, 0.34);
  } else if (material.name.includes("_trim")) {
    material.diffuseColor = new Color3(0.12, 0.15, 0.16);
    material.alpha = 1;
    material.transparencyMode = Material.MATERIAL_OPAQUE;
    material.zOffset = -2;
  }
  if (!material.name.includes("_glass")) material.specularColor = Color3.Black();
  material.maxSimultaneousLights = 32;
}

function mirrorGlassReflection(scene: Scene): RawCubeTexture {
  if (glassReflectionTexture) return glassReflectionTexture;
  const face = (top: [number, number, number], bottom: [number, number, number]) =>
    new Uint8Array([...top, ...top, ...bottom, ...bottom]);
  glassReflectionTexture = new RawCubeTexture(
    scene,
    [
      face([90, 125, 150], [28, 34, 38]),
      face([70, 95, 115], [22, 28, 32]),
      face([145, 180, 215], [85, 120, 150]),
      face([35, 42, 38], [18, 22, 20]),
      face([80, 110, 130], [24, 30, 34]),
      face([65, 85, 105], [20, 26, 30]),
    ],
    2,
    Constants.TEXTUREFORMAT_RGB,
    Constants.TEXTURETYPE_UNSIGNED_BYTE,
    false,
    false,
    Texture.BILINEAR_SAMPLINGMODE,
  );
  glassReflectionTexture.name = "building_glass_reflection";
  glassReflectionTexture.coordinatesMode = Texture.CUBIC_MODE;
  glassReflectionTexture.level = 0.55;
  return glassReflectionTexture;
}
