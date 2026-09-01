import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";

import { terrainHeight } from "../sim/terrain";
import { buildableCellCentre, type BuildableCell } from "../sim/slots";
import { ZONE_CELL_SIZE, type ZoneKind, type Zones } from "../sim/zones";
import { BUILDING_KIND_COLOR } from "../sim/buildingKinds";

/** A zoned lot still waiting for its building, lighter than one already taken. */
const EMPTY_ALPHA = 0.68;
/** Paint on ground no lot can reach: visible, but plainly not a promise of anything. */
const OFF_GRID_ALPHA = 0.22;

export function createZoneRenderer(scene: Scene) {
  const material = new StandardMaterial("zones-overlay", scene);
  material.diffuseColor = Color3.White();
  material.emissiveColor = Color3.White();
  material.alpha = 0.85;
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
    const covered = new Set<string>();
    for (const cell of cells) {
      const kind = zoneOver(cell, zones);
      if (!kind) continue;
      for (const key of zoneKeysOf(cell)) covered.add(key);
      const base = positions.length / 3;
      const [r, g, b] = BUILDING_KIND_COLOR[kind];
      // A lot with a building on it is the full colour; one still waiting is the same colour,
      // lighter, so what is taken and what is on offer read apart at a glance.
      const alpha = occupied?.has(cellKey(cell)) === true ? 1 : EMPTY_ALPHA;
      for (const corner of cell.corners) {
        positions.push(corner.x, terrainHeight(corner.x, corner.z) + 0.18, corner.z);
        colors.push(r, g, b, alpha);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    // Paint that fell on ground no lot can reach, drawn faintly: it builds nothing, but a brush
    // that leaves no mark at all reads as a broken tool.
    for (const [gx, gz, kind] of zones?.toJSON() ?? []) {
      if (covered.has(`${gx}:${gz}`)) continue;
      const base = positions.length / 3;
      const [r, g, b] = BUILDING_KIND_COLOR[kind];
      for (const [x, z] of [[gx, gz], [gx + 1, gz], [gx + 1, gz + 1], [gx, gz + 1]] as const) {
        const wx = x * ZONE_CELL_SIZE;
        const wz = z * ZONE_CELL_SIZE;
        positions.push(wx, terrainHeight(wx, wz) + 0.14, wz);
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

/**
 * The zone painted over any part of a lot, not only over its middle.
 *
 * Testing the centre alone left whole rows of the grid blank under a brush stroke that plainly
 * covered them: a lot is eight metres and so is a zone cell, but they are not aligned, so a stroke
 * can cover a lot without ever crossing its centre point.
 */
function zoneOver(cell: BuildableCell, zones?: Zones): ZoneKind | undefined {
  if (!zones) return cell.zone;
  for (const point of [buildableCellCentre(cell), ...cell.corners]) {
    const kind = zones.at(point.x, point.z);
    if (kind) return kind;
  }
  return undefined;
}

/** Every zone cell a lot touches, so the faint layer skips what the grid already covers. */
function zoneKeysOf(cell: BuildableCell): string[] {
  return [buildableCellCentre(cell), ...cell.corners].map((point) => `${Math.floor(point.x / ZONE_CELL_SIZE)}:${Math.floor(point.z / ZONE_CELL_SIZE)}`);
}

/** A cell's identity on the ground, so a parcel can say which cells it covers. */
export function cellKey(cell: Pick<BuildableCell, "corners">): string {
  const x = cell.corners.reduce((sum, corner) => sum + corner.x, 0) / 4;
  const z = cell.corners.reduce((sum, corner) => sum + corner.z, 0) / 4;
  return `${Math.round(x)}:${Math.round(z)}`;
}
