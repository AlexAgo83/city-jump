import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";

import { terrainHeight } from "../sim/terrain";
import { buildableCellCentre, type BuildableCell } from "../sim/slots";
import { ZONE_CELL_SIZE, type Zones } from "../sim/zones";
import { BUILDING_KIND_COLOR } from "../sim/buildingKinds";

/** How much darker an occupied lot is drawn, so taken land reads apart from land still on offer. */
const OCCUPIED_TINT = 0.45;
/** How faint paint is on ground no lot can reach, so the brush is visible without promising a lot. */
const OFF_GRID_ALPHA = 0.3;

export function createZoneRenderer(scene: Scene) {
  const material = new StandardMaterial("zones-overlay", scene);
  material.diffuseColor = Color3.White();
  material.emissiveColor = Color3.White();
  material.alpha = 0.42;
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
      const centre = buildableCellCentre(cell);
      const kind = zones?.at(centre.x, centre.z) ?? cell.zone;
      if (!kind) continue;
      const base = positions.length / 3;
      const [r, g, b] = BUILDING_KIND_COLOR[kind];
      const taken = occupied?.has(cellKey(cell)) === true;
      const tint = taken ? [r * OCCUPIED_TINT, g * OCCUPIED_TINT, b * OCCUPIED_TINT, 1] : [r, g, b, 1];
      for (const corner of cell.corners) {
        positions.push(corner.x, terrainHeight(corner.x, corner.z) + 0.18, corner.z);
        colors.push(...tint);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    // The brush stroke itself, faint, wherever it fell outside the lot grid. Painting away from a
    // road builds nothing -- but a brush that leaves no mark at all reads as a broken tool.
    const onGrid = new Set(cells.map((cell) => zoneKeyOf(cell)));
    for (const [gx, gz, kind] of zones?.toJSON() ?? []) {
      if (onGrid.has(`${gx}:${gz}`)) continue;
      const base = positions.length / 3;
      const [r, g, b] = BUILDING_KIND_COLOR[kind];
      for (const [x, z] of [[gx, gz], [gx + 1, gz], [gx + 1, gz + 1], [gx, gz + 1]] as const) {
        const wx = x * ZONE_CELL_SIZE;
        const wz = z * ZONE_CELL_SIZE;
        positions.push(wx, terrainHeight(wx, wz) + 0.16, wz);
        colors.push(r, g, b, OFF_GRID_ALPHA);
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

/** Which zone cell a buildable cell sits in, so the faint layer can skip what the grid already has. */
function zoneKeyOf(cell: Pick<BuildableCell, "corners">): string {
  const centre = buildableCellCentre(cell);
  return `${Math.floor(centre.x / ZONE_CELL_SIZE)}:${Math.floor(centre.z / ZONE_CELL_SIZE)}`;
}

/** A cell's identity on the ground, so a parcel can say which cells it covers. */
export function cellKey(cell: Pick<BuildableCell, "corners">): string {
  const x = cell.corners.reduce((sum, corner) => sum + corner.x, 0) / 4;
  const z = cell.corners.reduce((sum, corner) => sum + corner.z, 0) / 4;
  return `${Math.round(x)}:${Math.round(z)}`;
}
