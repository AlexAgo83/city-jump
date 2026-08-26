import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";

export const GROUND_SIZE = 2000;

/** The pickable ground. Flat here; the heightmap slice replaces the mesh, not the role. */
export function createGround(scene: Scene): Mesh {
  const ground = MeshBuilder.CreateGround("ground", { width: GROUND_SIZE, height: GROUND_SIZE }, scene);
  const material = new StandardMaterial("ground", scene);
  material.diffuseColor = new Color3(0.34, 0.42, 0.29);
  material.specularColor = Color3.Black();
  ground.material = material;
  return ground;
}
