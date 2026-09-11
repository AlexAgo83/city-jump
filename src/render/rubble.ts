import type { Scene } from "@babylonjs/core/scene";
import { Matrix, Quaternion, Vector3, Color3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { SavedRubble } from "../sim/rubble";
import { buildableCellCentre, GRID, type BuildingParcel } from "../sim/slots";
import { createGroundShadow } from "./groundShadow";

/** Cells retain their footprint; matched parcels supply facade direction and material character. */
export function rubblePieces(rubble: readonly SavedRubble[], parcels: readonly BuildingParcel[], heightAt: (x: number, z: number) => number) {
  if (!rubble.length) return { matrices: [] as Matrix[], colors: [] as number[] };
  const key = (x: number, z: number) => `${Math.round(x * 100)}:${Math.round(z * 100)}`;
  const lots = new Map<string, BuildingParcel>();
  for (const parcel of parcels) for (const cell of parcel.cells) {
    const { x, z } = buildableCellCentre(cell);
    lots.set(key(x, z), parcel);
  }
  const occupied = new Set(rubble.map(([x, z]) => key(x, z)));
  const matrices: Matrix[] = [];
  const colors: number[] = [];
  for (const [x, z] of rubble) {
    const parcel = lots.get(key(x, z));
    const yaw = parcel?.rotationY ?? 0;
    const seed = Math.abs(Math.round(x * 31 + z * 17));
    const base = new Vector3(x, heightAt(x, z), z);
    const rotation = Quaternion.FromEulerAngles(0, yaw, 0);
    const tint = parcel?.kind === "residential" ? [0.42, 0.31, 0.25] : parcel?.kind === "commercial" ? [0.35, 0.38, 0.39] : [0.3, 0.29, 0.25];
    const add = (size: Vector3, offset: Vector3, tilt = 0) => {
      matrices.push(Matrix.Compose(size, Quaternion.FromEulerAngles(tilt, yaw, tilt * 0.4), Vector3.TransformCoordinates(offset, Matrix.Compose(Vector3.OneReadOnly, rotation, base))));
      colors.push(...tint, 1);
    };
    add(new Vector3(7, 0.5, 7), new Vector3(0, 0.3, 0));
    for (let side = 0; side < 4; side++) {
      const angle = yaw + side * Math.PI / 2;
      if (occupied.has(key(x + Math.sin(angle) * GRID.cellSize, z + Math.cos(angle) * GRID.cellSize))) continue;
      const height = 2.5 + (seed + side * 7) % 5;
      const offset = new Vector3(Math.sin(side * Math.PI / 2) * 3.2, height / 2 + 0.5, Math.cos(side * Math.PI / 2) * 3.2);
      add(new Vector3(side % 2 ? 0.6 : 5.7, height, side % 2 ? 5.7 : 0.6), offset, 0.08);
    }
    add(new Vector3(4.6, 0.45, 3), new Vector3(-0.7, 1.5, 0.5), 0.35 + (seed % 3) * 0.12);
    add(new Vector3(2.2, 1.1, 2.6), new Vector3(1.4, 0.9, -1), -0.3);
  }
  return { matrices, colors };
}

export function createRubbleRenderer(scene: Scene, heightAt: (x: number, z: number) => number) {
  const mesh = MeshBuilder.CreateBox("rubble", { size: 1 }, scene);
  const material = new StandardMaterial("rubble", scene);
  material.diffuseColor = Color3.White();
  material.specularColor = Color3.Black();
  material.maxSimultaneousLights = 5;
  mesh.material = material;
  mesh.receiveShadows = true;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  const scorch = createGroundShadow(scene, "rubble_scorch", 0.65);
  return {
    rebuild(rubble: readonly SavedRubble[], parcels: readonly BuildingParcel[] = []): void {
      const pieces = rubblePieces(rubble, parcels, heightAt);
      const matrices = new Float32Array(pieces.matrices.length * 16);
      pieces.matrices.forEach((matrix, i) => { matrix.copyToArray(matrices, i * 16); });
      mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
      mesh.thinInstanceSetBuffer("color", Float32Array.from(pieces.colors), 4, false);
      mesh.thinInstanceCount = pieces.matrices.length;
      mesh.setEnabled(pieces.matrices.length > 0);
      scorch.setInstances(rubble.map(([x, z]) => ({ x, y: heightAt(x, z), z, radius: 6 })));
    },
    dispose(): void { scorch.dispose(); mesh.dispose(); material.dispose(); },
  };
}
