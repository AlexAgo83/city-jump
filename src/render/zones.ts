import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { Scene } from "@babylonjs/core/scene";

import { terrainHeight } from "../sim/terrain";
import { ZONE_CELL_SIZE, type ZoneKind, type Zones } from "../sim/zones";
import { BUILDING_KIND_COLOR } from "../sim/buildingKinds";

export function createZoneRenderer(scene: Scene) {
  const material = new StandardMaterial("zones-overlay", scene);
  material.diffuseColor = Color3.White();
  material.emissiveColor = Color3.White();
  material.alpha = 0.34;
  material.disableLighting = true;
  material.transparencyMode = Material.MATERIAL_ALPHABLEND;

  let mesh: Mesh | null = null;
  let visible = false;

  function rebuild(zones: Zones): void {
    mesh?.dispose();
    mesh = null;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    for (const [gx, gz, kind] of zones.toJSON()) {
      const base = positions.length / 3;
      const tint = [...BUILDING_KIND_COLOR[kind], 1];
      for (const [x, z] of [[gx, gz], [gx + 1, gz], [gx + 1, gz + 1], [gx, gz + 1]] as const) {
        const wx = x * ZONE_CELL_SIZE;
        const wz = z * ZONE_CELL_SIZE;
        positions.push(wx, terrainHeight(wx, wz) + 0.18, wz);
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
