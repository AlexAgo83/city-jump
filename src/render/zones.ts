import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";

import type { BuildableCell } from "../sim/slots";
import type { ZoneKind, Zones } from "../sim/zones";
import type { BuildingKind } from "../sim/buildingKinds";

/**
 * The overlay's own palette, not the buildings'.
 *
 * A building's colour is read against a building. Laid flat on a green island, the residential
 * green sat on grass and vanished: a fully zoned city looked untouched, and only the brown, blue
 * and yellow districts ever showed. These are the same five identities, chosen to be read against
 * the ground instead.
 */
const OVERLAY_COLOR: Record<BuildingKind, readonly [number, number, number]> = {
  residential: [0.25, 1, 0.35],
  commercial: [0.24, 0.62, 1],
  industrial: [1, 0.86, 0.2],
  agricultural: [0.78, 0.5, 0.22],
  military: [0.74, 0.44, 1],
};

const FREE_LOT_ALPHA = 0.45;
/**
 * How far each zone colour is lifted towards white for the overlay.
 *
 * The building palette is read against a building. Laid flat on grass, residential green sat on
 * top of a green field and disappeared -- the grid looked unpainted however much of it was zoned.
 * Lifting every kind the same amount keeps them apart from each other and away from the ground.
 */
const LIFT = 0.1;
export function createZoneRenderer(scene: Scene) {
  const materials = new Map<string, StandardMaterial>();

  let meshes: Mesh[] = [];
  let visible = false;

  /**
   * Colours only the zoned buildable cells the brush touched.
   *
   * @param cells Every buildable cell.
   * @param zones Read live rather than from each cell's baked `zone`: painting only repaints the
   * region it touched, so the baked tag lags a brush stroke by a whole rebuild and the grid stayed
   * blank under the paint.
   * @param occupied Cells a standing building covers, as `x:z` keys rounded to the metre.
   */
  function rebuild(cells: readonly BuildableCell[], zones?: Zones, occupied?: ReadonlySet<string>): void {
    for (const mesh of meshes) mesh.dispose();
    meshes = [];
    const buckets = new Map<string, { positions: number[]; indices: number[] }>();
    for (const cell of cells) {
      const kind = zoneOver(cell, zones);
      if (!kind) continue;
      const taken = occupied?.has(cellKey(cell)) === true;
      const key = `${kind}:${taken ? "taken" : "free"}`;
      const bucket = buckets.get(key) ?? { positions: [], indices: [] };
      const base = bucket.positions.length / 3;
      for (const corner of cell.corners) {
        bucket.positions.push(corner.x, corner.y + 0.16, corner.z);
      }
      bucket.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      buckets.set(key, bucket);
    }
    for (const [key, bucket] of buckets) {
      const [kind, state] = key.split(":") as [ZoneKind, string];
      const mesh = new Mesh("zones-overlay", scene);
      const data = new VertexData();
      data.positions = bucket.positions;
      data.indices = bucket.indices;
      data.applyToMesh(mesh);
      mesh.material = materialFor(kind, state === "free" ? FREE_LOT_ALPHA : 1);
      mesh.isPickable = false;
      mesh.setEnabled(visible);
      meshes.push(mesh);
    }
  }

  return {
    rebuild,
    setVisible(next: boolean) {
      visible = next;
      for (const mesh of meshes) mesh.setEnabled(next);
    },
    dispose(): void {
      for (const mesh of meshes) mesh.dispose();
      meshes = [];
      for (const material of materials.values()) material.dispose();
      materials.clear();
    },
  };

  function materialFor(kind: ZoneKind, alpha: number): StandardMaterial {
    const key = `${kind}:${alpha}`;
    const cached = materials.get(key);
    if (cached) return cached;
    const [r, g, b] = lift(kind);
    const material = new StandardMaterial(`zones-overlay-${key}`, scene);
    material.diffuseColor = new Color3(r, g, b);
    material.emissiveColor = new Color3(r, g, b);
    material.specularColor = Color3.Black();
    material.alpha = alpha;
    material.disableLighting = true;
    material.transparencyMode = alpha < 1 ? Material.MATERIAL_ALPHABLEND : Material.MATERIAL_OPAQUE;
    material.backFaceCulling = false;
    materials.set(key, material);
    return material;
  }
}

/**
 * The zone painted over any part of a lot, not only over its middle.
 *
 * Testing the centre alone left whole rows of the grid blank under a brush stroke that plainly
 * covered them: a lot is eight metres and so is a zone cell, but they are not aligned, so a stroke
 * can cover a lot without ever crossing its centre point.
 */
/** A zone's colour as the overlay draws it, optionally lightened for a lot still on offer. */
function lift(kind: ZoneKind, extra = 0): [number, number, number] {
  const [r, g, b] = OVERLAY_COLOR[kind];
  const amount = LIFT + extra;
  return [r + (1 - r) * amount, g + (1 - g) * amount, b + (1 - b) * amount];
}

function zoneOver(cell: BuildableCell, zones?: Zones): ZoneKind | undefined {
  return zones ? zones.ofLot(cell) : cell.zone;
}

/** A cell's identity on the ground, so a parcel can say which cells it covers. */
export function cellKey(cell: Pick<BuildableCell, "corners">): string {
  const x = cell.corners.reduce((sum, corner) => sum + corner.x, 0) / 4;
  const z = cell.corners.reduce((sum, corner) => sum + corner.z, 0) / 4;
  return `${Math.round(x)}:${Math.round(z)}`;
}
