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
import { BUILDING_KIND_COLOR, type BuildingKind } from "../sim/buildingKinds";
import type { BuildingStatus } from "../sim/buildingLifecycle";
import { ASSET_VERSION } from "./assets";
import { buildFootDecor, buildRoofProps, type FootDecorKind, type PropKind } from "./decorMeshes";
import { createGroundShadow } from "./groundShadow";

/** Model ids, resolved to `public/buildings/<id>.glb`. See docs/assets.md. */
export const BUILDING_MODELS = [
  ...PARCEL_SIZES.map(({ frontageCells, depthCells }) => `lot_${frontageCells}x${depthCells}`),
  // Farms, works and compounds are their own models -- a barn and crop rows, tanks and a stack,
  // barracks and a hangar -- not a tinted office block. They only exist for the deep lots that
  // kind of frontage is allowed (see INDUSTRIAL_SIZES).
  ...["farm", "industrial", "military"].flatMap((prefix) =>
    PARCEL_SIZES.filter(({ depthCells }) => depthCells === 4).map(({ frontageCells }) => `${prefix}_${frontageCells}x4`),
  ),
];

/** Which model a parcel stands up: its size, and whether its business has its own models. */
export function buildingModelId(parcel: Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">): string {
  const size = `${parcel.frontageCells}x${parcel.depthCells}`;
  const own = parcel.kind === "agricultural" ? "farm" : parcel.kind === "industrial" || parcel.kind === "military" ? parcel.kind : null;
  return own && parcel.depthCells === 4 ? `${own}_${size}` : `lot_${size}`;
}

const STATE_CODE = { rising: 1, working: 2, idle: 3, rebuilding: 4 } as const;
const REASON_CODE = { construction: 1, workers: 2, power: 3, water: 4, materials: 5 } as const;

export function buildingStateSignature(
  statuses: readonly Pick<BuildingStatus, "parcel" | "state" | "progress" | "staffed" | "reason">[],
): number {
  let hash = statuses.length;
  for (const status of statuses) {
    const parcel = status.parcel;
    hash = Math.imul(hash ^ Math.round(parcel.position.x * 4), 16777619);
    hash = Math.imul(hash ^ Math.round(parcel.position.z * 4), 16777619);
    hash = Math.imul(hash ^ (parcel.frontageCells * 31 + parcel.depthCells * 7), 16777619);
    hash = Math.imul(hash ^ STATE_CODE[status.state], 16777619);
    hash = Math.imul(hash ^ Math.round(status.progress * 20), 16777619);
    hash = Math.imul(hash ^ (status.staffed ? 1 : 0), 16777619);
    hash = Math.imul(hash ^ (status.reason ? REASON_CODE[status.reason] : 0), 16777619);
  }
  return hash >>> 0;
}

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
 * ponytail: module-size stays while GLB loading, fallback boxes, thin instances and decor share
 * asset caches and one dirty renderer; split when one path gets a separate lifecycle.
 */
export async function createBuildingRenderer(scene: Scene, _graph: RoadGraph, shadows: ShadowGenerator, heightAt: (x: number, z: number) => number) {
  const manifest = await loadManifest();
  const available: Model[] = [];
  let glassReflectionTexture: RawCubeTexture | null = null;
  const glassReflection = (): RawCubeTexture => {
    glassReflectionTexture ??= createGlassReflection(scene);
    return glassReflectionTexture;
  };
  const roofProps = buildRoofProps(scene, shadows);
  const footDecor = buildFootDecor(scene);
  // Named without the "building_" prefix: that prefix is how tests and the shadow pipeline
  // pick out actual building meshes, and this plane is neither a building nor shadow-mapped.
  const groundShadow = createGroundShadow(scene, "ground_shadow_buildings", 0.32);
  /**
   * The whole city as boxes. From high up a building is a few pixels of coloured roof, and the
   * model it came from is a few thousand vertices of window frames and roof plant nobody can see.
   * One box per building, in the same colours, drawn instead of the models above DISTANT_RADIUS.
   */
  const distant = MeshBuilder.CreateBox("building_distant", { size: 1 }, scene);
  const distantMaterial = new StandardMaterial("building_distant", scene);
  distantMaterial.diffuseColor = Color3.White();
  distantMaterial.specularColor = Color3.Black();
  distant.material = distantMaterial;
  distant.isPickable = false;
  distant.receiveShadows = true;
  distant.alwaysSelectAsActiveMesh = true;
  distant.setEnabled(false);
  shadows.addShadowCaster(distant);

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
  // Each filled cell carries its parcel's kind as a vertex colour, so the grid reads as the same
  // zoning the buildings do. disableLighting leaves the diffuse term at zero (that is why this was
  // always an emissive material), and the vertex colour multiplies that emissive white -- driving
  // it through diffuseColor instead just renders black.
  takenMaterial.diffuseColor = Color3.Black();
  takenMaterial.emissiveColor = Color3.White();
  takenMaterial.specularColor = Color3.Black();
  takenMaterial.disableLighting = true;
  takenMaterial.alpha = 0.3;
  takenMaterial.transparencyMode = Material.MATERIAL_ALPHABLEND;
  takenMaterial.backFaceCulling = false;
  let grid: LinesMesh | null = null;
  let taken: Mesh | null = null;
  let visible = true;
  let far = false;
  let gridVisible = false;
  // Roof props are created already opaque (see buildRoofProps), so this starts in sync with that
  // -- the very first setFaded(false) is then correctly a no-op too, not just repeats of it.
  let lastFaded = false;
  let lastPlaced = 0;
  let decorVisible = true;
  let decorSignature = "";
  let stateSignature = 0;
  let lastCells: readonly BuildableCell[] = [];
  let lastParcels: readonly BuildingParcel[] = [];
  let lastStatuses: readonly BuildingStatus[] = [];
  const modelById = new Map<string, Model>();

  function applyBuildingVisibility(): void {
    for (const model of available) model.mesh.setEnabled(visible && !far && model.mesh.thinInstanceCount > 0);
    distant.setEnabled(visible && far && distant.thinInstanceCount > 0);
    for (const mesh of Object.values(roofProps)) mesh.setEnabled(visible && mesh.thinInstanceCount > 0);
    for (const mesh of Object.values(footDecor)) mesh.setEnabled(visible && mesh.thinInstanceCount > 0);
    groundShadow.mesh.setEnabled(visible && groundShadow.mesh.thinInstanceCount > 0);
    groundPad.setEnabled(visible && groundPad.thinInstanceCount > 0);
  }

  /**
   * `cells` and `parcels` are the caller's, so the layout is solved once per rebuild rather than
   * once here and once again for the terrain that has to be flattened under it.
   */
  /**
   * A building is decorated once it stands. Not while it is rising, and not while it is being
   * rebuilt after a wave: a lot at eighteen per cent of its height used to come with its benches
   * and its rooftop plant already in place.
   */
  function decorated(status: BuildingStatus): boolean {
    return status.state === "working" || status.state === "idle";
  }

  /**
   * Which buildings are wearing their clutter, as one cheap value. Compared every tick, so that a
   * lot finishing its construction gets its decorations then rather than at the next rebuild --
   * which, for a city nobody is editing, is never.
   */
  function decorKey(statuses: readonly BuildingStatus[]): string {
    let count = 0;
    let sum = 0;
    for (const status of statuses) {
      if (!decorated(status)) continue;
      count += 1;
      sum += Math.round(status.parcel.position.x) * 31 + Math.round(status.parcel.position.z);
    }
    return `${count}:${sum}`;
  }

  function modelFor(parcel: Pick<BuildingParcel, "kind" | "frontageCells" | "depthCells">): Model | undefined {
    return modelById.get(buildingModelId(parcel));
  }

  /**
   * What stands on a roof and what stands at the foot of a building, for every building that is
   * finished. Its own pass because three things ask for it: a rebuild, the settings switch that
   * turns it off, and a construction stage running out.
   *
   * Turned off, the buffers are simply not filled. Hiding the meshes would not hold: the distance
   * culler re-enables anything named `footdecor_` or `roofprop_` as soon as the camera comes back
   * in, and it has no idea the player asked for none.
   */
  function applyDecor(): void {
    decorSignature = decorKey(lastStatuses);
    const standing = decorVisible ? lastStatuses.filter(decorated).map((status) => status.parcel) : [];
    // Every parcel, not only the standing ones: a face that touches the lot next door gets no
    // furniture whether or not that lot has finished going up.
    const occupiedCells = buildingCellSet(lastParcels);
    const footDecorMatrices = new Map<FootDecorKind, Matrix[]>();
    for (const parcel of standing) {
      for (const placement of buildingFootDecorMatrices(parcel, heightAt, buildingBlockedDecorFaces(parcel, occupiedCells))) {
        const bucket = footDecorMatrices.get(placement.kind);
        if (bucket) bucket.push(placement.matrix);
        else footDecorMatrices.set(placement.kind, [placement.matrix]);
      }
    }

    // Whatever stands on each roof: picked once per parcel from `ROOF_LAYOUTS`, by its own
    // model's roof height and its own footprint, then bucketed by kind the same way a building
    // itself is bucketed by model.
    const propMatrices = new Map<PropKind, Matrix[]>();
    for (const parcel of standing) {
      // Nothing stands on a barn, a works shed or a hangar -- they carry their own stacks.
      if (buildingModelId(parcel) !== `lot_${parcel.frontageCells}x${parcel.depthCells}`) continue;
      const model = available.find((m) => m.id === buildingModelId(parcel));
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
    for (const [kind, mesh] of Object.entries(roofProps) as [PropKind, Mesh][]) writeDecorBuffer(mesh, propMatrices.get(kind) ?? []);
    for (const [kind, mesh] of Object.entries(footDecor) as [FootDecorKind, Mesh][]) writeDecorBuffer(mesh, footDecorMatrices.get(kind) ?? []);
  }

  function writeDecorBuffer(mesh: Mesh, list: readonly Matrix[]): void {
    mesh.thinInstanceCount = 0;
    mesh.setEnabled(visible && list.length > 0);
    if (list.length === 0) return;
    const buffer = new Float32Array(list.length * 16);
    list.forEach((m, i) => {
      m.copyToArray(buffer, i * 16);
    });
    mesh.thinInstanceSetBuffer("matrix", buffer, 16, false); // non-static: the count changes with the city
    mesh.thinInstanceCount = list.length;
  }

  function rebuild(cells: readonly BuildableCell[], statuses: readonly BuildingStatus[]): number {
    lastCells = cells;
    lastStatuses = statuses;
    lastParcels = statuses.map((status) => status.parcel);
    stateSignature = buildingStateSignature(statuses);
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
    taken = lastParcels.length ? takenCellsMesh(scene, lastParcels) : null;
    if (taken) {
      taken.material = takenMaterial;
      taken.isPickable = false;
      taken.setEnabled(gridVisible);
    }
    const buckets = new Map<string, BuildingStatus[]>(available.map((m) => [m.id, []]));

    for (const status of statuses) {
      buckets.get(buildingModelId(status.parcel))?.push(status);
    }
    groundShadow.setInstances(
      lastParcels.map((parcel) => ({
        x: parcel.position.x,
        y: parcel.position.y,
        z: parcel.position.z,
        radius: ((parcel.frontageCells + parcel.depthCells) / 2) * GRID.cellSize * 0.3,
      })),
    );
    const padMatrices = new Float32Array(lastParcels.length * 16);
    const padColors = new Float32Array(lastParcels.length * 4);
    for (const [i, parcel] of lastParcels.entries()) {
      buildingGroundPadMatrix(parcel).copyToArray(padMatrices, i * 16);
      // A farm stands on turned soil, not on the paving every other building gets.
      padColors.set(parcel.kind === "agricultural" ? [0.75, 0.56, 0.38, 1] : [1, 1, 1, 1], i * 4);
    }
    groundPad.thinInstanceSetBuffer("matrix", padMatrices, 16, false);
    groundPad.thinInstanceSetBuffer("color", padColors, 4, false);
    groundPad.thinInstanceCount = lastParcels.length;
    // The stand-in boxes: same footprint, same colour, and as tall as the model that would have
    // stood there -- built every rebuild whether or not they are being drawn, since they are a
    // matrix each and the alternative is a stall the first time the camera pulls out.
    const distantMatrices = new Float32Array(statuses.length * 16);
    const distantColors = new Float32Array(statuses.length * 4);
    for (const [i, status] of statuses.entries()) {
      const parcel = status.parcel;
      const model = modelFor(parcel);
      distantBoxMatrix(parcel, model?.roofY ?? 12, status).copyToArray(distantMatrices, i * 16);
      distantColors.set([...buildingStateColor(parcel, status), 1], i * 4);
    }
    distant.thinInstanceSetBuffer("matrix", distantMatrices, 16, false);
    distant.thinInstanceSetBuffer("color", distantColors, 4, false);
    distant.thinInstanceCount = statuses.length;

    let placed = 0;
    for (const model of available) {
      const chosen = buckets.get(model.id)!;
      model.mesh.thinInstanceCount = 0;
      // A mesh with no instance buffer still draws itself, at the origin. Until it has
      // somewhere to stand, it is switched off rather than left hovering over the map.
      model.mesh.setEnabled(visible && chosen.length > 0);
      if (chosen.length === 0) continue;

      const matrices = new Float32Array(chosen.length * 16);
      for (const [i, status] of chosen.entries()) {
        matrixFor(status.parcel, model.centerX, status).copyToArray(matrices, i * 16);
      }
      // Non-static: this buffer's instance count changes on every rebuild, and Babylon's
      // default (staticBuffer: true) left the GPU-side buffer sized for whichever rebuild
      // created it first -- a later, bigger count then drew past the end of that buffer
      // (a real "vertex buffer not big enough" GL error, silently dropping the draw for
      // that model, which is what read as buildings losing their roof/trim on a tool switch).
      model.mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
      const colors = new Float32Array(chosen.length * 4);
      for (const [i, status] of chosen.entries()) {
        colors.set([...buildingModelColor(status.parcel, status), 1], i * 4);
      }
      model.mesh.thinInstanceSetBuffer("color", colors, 4, false);
      model.mesh.thinInstanceCount = chosen.length;
      placed += chosen.length;
    }

    applyDecor();

    lastPlaced = placed;
    // Models arrive over several frames and rebuild the city as they land, outside the app's own
    // rebuild -- and the shadow map is only redrawn when it is told to, so tell it.
    shadows.getShadowMap()?.resetRefreshCounter();
    applyBuildingVisibility();
    return visible ? placed : 0;
  }

  function updateStates(statuses: readonly BuildingStatus[]): void {
    lastStatuses = statuses;
    if (!lastParcels.length) return;
    const nextSignature = buildingStateSignature(statuses);
    if (nextSignature === stateSignature) return;
    stateSignature = nextSignature;
    const buckets = new Map<string, BuildingStatus[]>(available.map((m) => [m.id, []]));
    for (const status of statuses) buckets.get(buildingModelId(status.parcel))?.push(status);
    for (const model of available) {
      const chosen = buckets.get(model.id)!;
      if (chosen.length === 0) continue;
      const matrices = new Float32Array(chosen.length * 16);
      const colors = new Float32Array(chosen.length * 4);
      for (const [i, status] of chosen.entries()) {
        matrixFor(status.parcel, model.centerX, status).copyToArray(matrices, i * 16);
        colors.set([...buildingModelColor(status.parcel, status), 1], i * 4);
      }
      model.mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
      model.mesh.thinInstanceSetBuffer("color", colors, 4, false);
    }
    const distantMatrices = new Float32Array(statuses.length * 16);
    const distantColors = new Float32Array(statuses.length * 4);
    for (const [i, status] of statuses.entries()) {
      const model = modelFor(status.parcel);
      distantBoxMatrix(status.parcel, model?.roofY ?? 12, status).copyToArray(distantMatrices, i * 16);
      distantColors.set([...buildingStateColor(status.parcel, status), 1], i * 4);
    }
    distant.thinInstanceSetBuffer("matrix", distantMatrices, 16, false);
    distant.thinInstanceSetBuffer("color", distantColors, 4, false);
    // A construction stage running out is what earns a building its clutter, and this is the pass
    // that notices.
    if (decorKey(statuses) !== decorSignature) applyDecor();
  }

  // The 16 lot models resolve over a few frames, and each used to trigger its own full rebuild --
  // parcel bucketing, roof props and shadows over the *whole* city, once per model. On a small
  // demo city that's unnoticeable; on a real, built-up one it stacked into a multi-second freeze
  // as new models kept restarting the same city-wide pass. Debounced so the burst of arrivals
  // collapses into one rebuild after they settle, the same pattern the dirty-edit path already uses.
  let modelLoadRebuildTimer = 0;
  let disposed = false;
  for (const id of BUILDING_MODELS) {
    void loadModel(scene, id, shadows, manifest.models[id], glassReflection).then((model) => {
      if (!model) return;
      if (disposed) {
        shadows.removeShadowCaster(model.mesh);
        model.mesh.material?.dispose();
        model.mesh.dispose();
        glassReflectionTexture?.dispose();
        glassReflectionTexture = null;
        return;
      }
      available.push(model);
      modelById.set(model.id, model);
      clearTimeout(modelLoadRebuildTimer);
      modelLoadRebuildTimer = window.setTimeout(() => rebuild(lastCells, lastStatuses), 50);
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
    /** The player's own switch for street furniture and roof clutter. */
    setDecor(next: boolean) {
      if (next === decorVisible) return;
      decorVisible = next;
      applyDecor();
    },
    /** Draw the city as boxes rather than models -- for when the camera is too high to tell. */
    setDistant(next: boolean) {
      if (next === far) return;
      far = next;
      applyBuildingVisibility();
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
    updateStates,
    count: () => (visible ? lastPlaced : 0),
    buildingAt(x: number, z: number): BuildingStatus | null {
      if (!visible) return null;
      return lastStatuses.find((status) => status.parcel.cells.some((cell) => pointInCell(x, z, cell))) ?? null;
    },
    /** @param nearX @param nearZ Which building: the one closest to here, the origin by default. */
    buildingPoint(nearX = 0, nearZ = 0): { x: number; y: number; z: number } | null {
      const points = lastParcels
        .map((parcel) => parcel.cells[0])
        .filter((cell): cell is BuildableCell => cell !== undefined)
        .map((cell) => ({
          x: cell.corners.reduce((sum, p) => sum + p.x, 0) / 4,
          y: cell.corners.reduce((sum, p) => sum + p.y, 0) / 4,
          z: cell.corners.reduce((sum, p) => sum + p.z, 0) / 4,
        }));
      return points.sort((a, b) => Math.hypot(a.x - nearX, a.z - nearZ) - Math.hypot(b.x - nearX, b.z - nearZ))[0] ?? null;
    },
    get modelCount() {
      return available.length;
    },
    startupModelCount,
    dispose(): void {
      disposed = true;
      clearTimeout(modelLoadRebuildTimer);
      grid?.dispose();
      taken?.dispose();
      groundPad.dispose();
      groundPadMaterial.dispose();
      takenMaterial.dispose();
      distant.dispose();
      distantMaterial.dispose();
      groundShadow.dispose();
      for (const mesh of [...Object.values(roofProps), ...Object.values(footDecor)]) {
        mesh.material?.dispose();
        mesh.dispose();
      }
      for (const model of available) {
        shadows.removeShadowCaster(model.mesh);
        model.mesh.material?.dispose();
        model.mesh.dispose();
      }
      glassReflectionTexture?.dispose();
      glassReflectionTexture = null;
      available.length = 0;
      modelById.clear();
    },
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
/**
 * The only thing telling a farm from a barracks apart right now: there is one set of lot models,
 * so a parcel's business shows as a tint and how tall it is allowed to stand. Residential keeps
 * the models' own look; the working kinds squat and take their colour.
 * ponytail: tint + squash, swap for real per-kind models when there are any.
 */
export const BUILDING_KIND_STYLE: Record<BuildingKind, { scaleY: number; color: [number, number, number] }> = {
  residential: { scaleY: 1, color: tintFor("residential", 0.25) },
  commercial: { scaleY: 1, color: tintFor("commercial", 0.3) },
  industrial: { scaleY: 1, color: [1, 1, 1] }, // its own models already look the part
  agricultural: { scaleY: 1, color: [1, 1, 1] }, // its own models already look the part

  military: { scaleY: 1, color: [1, 1, 1] },
};

/** The kind's own colour, mixed back towards white -- a full-strength tint over an already
 * textured model reads as a plastic toy rather than a building. */
function tintFor(kind: BuildingKind, strength: number): [number, number, number] {
  const [r, g, b] = BUILDING_KIND_COLOR[kind];
  return [1 + (r - 1) * strength, 1 + (g - 1) * strength, 1 + (b - 1) * strength];
}

function matrixFor(parcel: BuildingParcel, centerX: number, status?: Pick<BuildingStatus, "state" | "progress">): Matrix {
  const rotation = Quaternion.FromEulerAngles(0, parcel.rotationY, 0);
  // Along-frontage direction is the model's +X once rotated.
  const alongX = Math.cos(parcel.rotationY);
  const alongZ = -Math.sin(parcel.rotationY);
  return Matrix.Compose(
    new Vector3(1, BUILDING_KIND_STYLE[parcel.kind].scaleY * buildingStateScaleY(status), 1),
    rotation,
    new Vector3(
      parcel.position.x - alongX * centerX,
      parcel.position.y,
      parcel.position.z - alongZ * centerX,
    ),
  );
}

/**
 * The wall colours the model generator paints a lot with, picked by the same rule it uses
 * (`scripts/gen_buildings.py`), so a box swapped in for a model is the colour that was standing
 * there a frame earlier. The working kinds have one colour each, which is what their own models
 * are built in.
 */
const LOT_COLORS: readonly [number, number, number][] = [
  [0.78, 0.7, 0.58],
  [0.68, 0.55, 0.48],
  [0.6, 0.62, 0.66],
  [0.45, 0.52, 0.6],
  [0.62, 0.68, 0.58],
];
const WORKS_COLORS: Partial<Record<BuildingKind, [number, number, number]>> = {
  agricultural: [0.46, 0.38, 0.3],
  industrial: [0.62, 0.64, 0.66],
  military: [0.42, 0.45, 0.34],
};

function distantColor(parcel: BuildingParcel): [number, number, number] {
  return WORKS_COLORS[parcel.kind] ?? LOT_COLORS[(parcel.frontageCells * 4 + parcel.depthCells) % LOT_COLORS.length]!;
}

/**
 * The same states on a real model rather than on a stand-in box. The state colours are per-instance
 * vertex colours, and those multiply the model's own texture, so `working` -- the one state that is
 * not saying anything -- has to multiply by nothing. `buildingStateColor` answers a wall colour
 * there, which is right for the untextured boxes and halved the brightness of every finished
 * building that was drawn as a model.
 */
export function buildingModelColor(parcel: BuildingParcel, status?: Pick<BuildingStatus, "state" | "reason">): [number, number, number] {
  if (status?.state === "working") return [1, 1, 1];
  const [r, g, b] = buildingStateColor(parcel, status);
  // A building under construction wears its state: sand-coloured and eighteen per cent of its
  // height, it is a site and should look like one. A building that has stopped is still a
  // building, and a state colour is a multiplier on its own texture -- idle at 0.28 painted a
  // whole district black every time the workforce moved. Half strength keeps the grey, the
  // no-power yellow and the no-water blue readable as a tint over the model rather than instead
  // of it.
  if (status?.state === "rising" || status?.state === "rebuilding") return [r, g, b];
  return [1 + (r - 1) * STOPPED_TINT, 1 + (g - 1) * STOPPED_TINT, 1 + (b - 1) * STOPPED_TINT];
}

/** How much of its state colour a standing building takes. The stand-in boxes take all of it. */
const STOPPED_TINT = 0.5;

export function buildingStateColor(parcel: BuildingParcel, status?: Pick<BuildingStatus, "state" | "reason">): [number, number, number] {
  const color = status?.state === "rising" ? [0.86, 0.72, 0.42] : status?.reason === "power" ? [0.95, 0.74, 0.2] : status?.reason === "water" ? [0.2, 0.56, 0.9] : status?.state === "idle" ? [0.28, 0.29, 0.3] : status?.state === "rebuilding" ? [0.58, 0.42, 0.34] : distantColor(parcel);
  return color as [number, number, number];
}

function buildingStateScaleY(status?: Pick<BuildingStatus, "state" | "progress">): number {
  return status?.state === "rising" || status?.state === "rebuilding" ? 0.18 + 0.82 * status.progress : 1;
}

/** A box the size of the building that would stand on this parcel, seated on its frontage. */
function distantBoxMatrix(parcel: BuildingParcel, height: number, status?: Pick<BuildingStatus, "state" | "progress">): Matrix {
  const width = parcel.frontageCells * GRID.cellSize - 1.5;
  const depth = parcel.depthCells * GRID.cellSize - 1.5;
  const scaledHeight = height * buildingStateScaleY(status);
  const rotation = Quaternion.FromEulerAngles(0, parcel.rotationY, 0);
  // The parcel's position is the middle of its frontage; the building runs back from there.
  const backX = -Math.sin(parcel.rotationY);
  const backZ = -Math.cos(parcel.rotationY);
  return Matrix.Compose(
    new Vector3(width, scaledHeight, depth),
    rotation,
    new Vector3(
      parcel.position.x + backX * (depth / 2),
      parcel.position.y + scaledHeight / 2,
      parcel.position.z + backZ * (depth / 2),
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
  heightAt: (x: number, z: number) => number,
  blockedFaces: ReadonlySet<FootDecorFace> = new Set(),
): FootDecorPlacement[] {
  const width = parcel.frontageCells * GRID.cellSize;
  const depth = parcel.depthCells * GRID.cellSize;
  const halfWidth = width / 2;
  const gap = 0.8;
  const placements: FootDecorPlacement[] = [];
  // Half of what it used to be (1..4): the pavement clutter read as a junk shop up close.
  const maxPlacements = Math.max(1, Math.round((1 + (roofSeed(parcel) % 4)) / 2));

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
function takenCellsMesh(scene: Scene, parcels: readonly BuildingParcel[]): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  for (const parcel of parcels) {
    const [r, g, b] = BUILDING_KIND_COLOR[parcel.kind];
    for (const cell of parcel.cells) {
      const base = positions.length / 3;
      for (const corner of cell.corners) {
        positions.push(corner.x, corner.y + 0.1, corner.z);
        colors.push(r, g, b, 1);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const mesh = new Mesh("buildable-grid-taken", scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.colors = colors;
  data.normals = Array.from({ length: positions.length / 3 }, () => [0, 1, 0]).flat();
  data.applyToMesh(mesh);
  return mesh;
}

async function loadManifest(): Promise<BuildingManifest> {
  try {
    const response = await fetch(`/buildings/manifest.json?v=${ASSET_VERSION}`);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json() as BuildingManifest;
  } catch (error) {
    console.error("could not load building manifest", error);
    return { models: {} };
  }
}

async function loadModel(scene: Scene, id: string, shadows: ShadowGenerator, roof: RoofGeometry | undefined, glassReflection: () => RawCubeTexture): Promise<Model | null> {
  try {
    const result = await SceneLoader.ImportMeshAsync("", "/buildings/", `${id}.glb?v=${ASSET_VERSION}`, scene);
    const parts = result.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0);
    if (parts.length === 0) return null;

    const mesh = parts.length === 1 ? parts[0]! : Mesh.MergeMeshes(parts, true, true, undefined, false, true)!;
    mesh.name = `building_${id}`;
    mesh.material = normalizeBuildingMaterial(scene, mesh.material, glassReflection);
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    mesh.alwaysSelectAsActiveMesh = true; // one bounding box for the whole city is useless
    shadows.addShadowCaster(mesh);
    // The loader parents everything under a __root__ carrying glTF's handedness flip.
    // setParent(null) moves that transform into the mesh's own, and baking it into the
    // vertices leaves an identity transform for the instance matrices to replace.
    mesh.setParent(null);
    mesh.bakeCurrentTransformIntoVertices();
    // No convertToFlatShadedMesh here: on a multi-material model it quietly drops all but the
    // first few submeshes (a farm lost its walls, silo and crop rows). The models are authored
    // flat-faced anyway, so there is nothing to convert.
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

function normalizeBuildingMaterial(scene: Scene, material: Material | null, glassReflection: () => RawCubeTexture): Material | null {
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
    lit.subMaterials = lit.subMaterials.map((sub) => normalizeBuildingMaterial(scene, sub, glassReflection));
  } else if (lit.albedoColor && !lit.diffuseColor) {
    const standard = new StandardMaterial(`${lit.name}_standard`, scene);
    standard.diffuseColor = lit.albedoColor.clone();
    finishBuildingMaterial(standard, glassReflection);
    return standard;
  }
  if (lit.name.includes("_glass") && lit.diffuseColor) {
    lit.diffuseColor = new Color3(0.28, 0.38, 0.44);
    lit.alpha = 1;
    lit.transparencyMode = Material.MATERIAL_OPAQUE;
    lit.reflectionTexture = glassReflection();
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

function finishBuildingMaterial(material: StandardMaterial, glassReflection: () => RawCubeTexture): void {
  if (material.name.includes("_glass")) {
    material.diffuseColor = new Color3(0.28, 0.38, 0.44);
    material.emissiveColor = Color3.Black();
    material.alpha = 1;
    material.transparencyMode = Material.MATERIAL_OPAQUE;
    material.reflectionTexture = glassReflection();
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

function createGlassReflection(scene: Scene): RawCubeTexture {
  const face = (top: [number, number, number], bottom: [number, number, number]) =>
    new Uint8Array([...top, ...top, ...bottom, ...bottom]);
  const texture = new RawCubeTexture(
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
  texture.name = "building_glass_reflection";
  texture.coordinatesMode = Texture.CUBIC_MODE;
  texture.level = 0.55;
  return texture;
}
