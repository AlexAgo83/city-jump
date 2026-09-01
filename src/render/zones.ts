import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";

import { terrainHeight } from "../sim/terrain";
import type { BuildableCell } from "../sim/slots";
import { BUILDING_KIND_COLOR } from "../sim/buildingKinds";

/** How much darker an occupied lot is drawn, so taken land reads apart from land still on offer. */
const OCCUPIED_TINT = 0.45;

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
   * @param cells Every buildable cell, each already carrying the zone painted over it.
   * @param occupied Cells a standing building covers, as `x:z` keys rounded to the metre.
   */
  function rebuild(cells: readonly BuildableCell[], occupied?: ReadonlySet<string>): void {
    mesh?.dispose();
    mesh = null;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    for (const cell of cells) {
      if (!cell.zone) continue;
      const base = positions.length / 3;
      const [r, g, b] = BUILDING_KIND_COLOR[cell.zone];
      const taken = occupied?.has(cellKey(cell)) === true;
      const tint = taken ? [r * OCCUPIED_TINT, g * OCCUPIED_TINT, b * OCCUPIED_TINT, 1] : [r, g, b, 1];
      for (const corner of cell.corners) {
        positions.push(corner.x, terrainHeight(corner.x, corner.z) + 0.18, corner.z);
        colors.push(...tint);
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

/** A cell's identity on the ground, so a parcel can say which cells it covers. */
export function cellKey(cell: Pick<BuildableCell, "corners">): string {
  const x = cell.corners.reduce((sum, corner) => sum + corner.x, 0) / 4;
  const z = cell.corners.reduce((sum, corner) => sum + corner.z, 0) / 4;
  return `${Math.round(x)}:${Math.round(z)}`;
}
