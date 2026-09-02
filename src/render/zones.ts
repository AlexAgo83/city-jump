import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";

import { terrainHeight } from "../sim/terrain";
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
  residential: [0.45, 0.95, 0.62],
  commercial: [0.24, 0.62, 1],
  industrial: [1, 0.86, 0.2],
  agricultural: [0.78, 0.5, 0.22],
  military: [0.74, 0.44, 1],
};

/**
 * A zoned lot is drawn opaque, so the ground never shows through it.
 *
 * Blending the overlay over the map meant residential green sat on a green field and came out
 * green: the grid read as unpainted however much of it was zoned. Taken and free lots are told
 * apart by tone instead -- a free lot is the same colour, lighter.
 */
const FREE_LOT_LIFT = 0.5;
/**
 * How far each zone colour is lifted towards white for the overlay.
 *
 * The building palette is read against a building. Laid flat on grass, residential green sat on
 * top of a green field and disappeared -- the grid looked unpainted however much of it was zoned.
 * Lifting every kind the same amount keeps them apart from each other and away from the ground.
 */
const LIFT = 0.12;
/** Buildable land with no zone on it: neutral, but plainly land and not grass. */
const UNZONED: readonly [number, number, number] = [0.82, 0.85, 0.86];

export function createZoneRenderer(scene: Scene) {
  const material = new StandardMaterial("zones-overlay", scene);
  material.diffuseColor = Color3.Black();
  material.emissiveColor = Color3.White();
  // The overlay is information, not scenery: it must read the same at midnight as at noon, and
  // the vertex colour must be the whole of it rather than a tint over an already-lit surface.
  material.useEmissiveAsIllumination = true;
  material.alpha = 1;
  material.disableLighting = true;
  material.transparencyMode = Material.MATERIAL_ALPHABLEND;

  let mesh: Mesh | null = null;
  let visible = false;

  /**
   * Colours the lot grid itself, not the brush stroke that painted it.
   *
   * The overlay used to draw the zone's own eight-metre cells, so a round brush left round edges,
   * holes and blocks of colour on ground no lot could ever sit on -- a stain on the grass rather
   * than a plan. Every quad here is a buildable cell, the same one the white grid outlines, and a
   * cell with a building already on it is drawn darker so what is taken reads apart from what is
   * still on offer.
   *
   * @param cells Every buildable cell.
   * @param zones Read live rather than from each cell's baked `zone`: painting only repaints the
   * region it touched, so the baked tag lags a brush stroke by a whole rebuild and the grid stayed
   * blank under the paint.
   * @param occupied Cells a standing building covers, as `x:z` keys rounded to the metre.
   */
  function rebuild(cells: readonly BuildableCell[], zones?: Zones, occupied?: ReadonlySet<string>): void {
    mesh?.dispose();
    mesh = null;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    for (const cell of cells) {
      const kind = zoneOver(cell, zones);
      const base = positions.length / 3;
      if (!kind) {
        // Buildable land nobody has zoned yet: filled too, in a neutral tone, so the whole grid
        // reads as land a building can stand on rather than as an outline over grass.
        for (const corner of cell.corners) {
          positions.push(corner.x, terrainHeight(corner.x, corner.z) + 0.17, corner.z);
          colors.push(...UNZONED, 1);
        }
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        continue;
      }
      const taken = occupied?.has(cellKey(cell)) === true;
      const [r, g, b] = lift(kind, taken ? 0 : FREE_LOT_LIFT);
      for (const corner of cell.corners) {
        positions.push(corner.x, terrainHeight(corner.x, corner.z) + 0.18, corner.z);
        colors.push(r, g, b, 1);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    if (!positions.length) return;
    mesh = new Mesh("zones-overlay", scene);
    const data = new VertexData();
    data.positions = positions;
    data.indices = indices;
    data.colors = colors;
    data.applyToMesh(mesh);
    mesh.material = material;
    mesh.hasVertexAlpha = true;
    mesh.isPickable = false;
    mesh.setEnabled(visible);
  }

  return {
    rebuild,
    setVisible(next: boolean) {
      visible = next;
      mesh?.setEnabled(next);
    },
  };
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
