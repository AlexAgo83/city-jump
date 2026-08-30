import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Material } from "@babylonjs/core/Materials/material";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3, Matrix } from "@babylonjs/core/Maths/math";

/**
 * A small, constant contact shadow under an object. Unlike the sun-tracking shadow the
 * CascadedShadowGenerator casts, this one never moves and never switches off, so an object
 * still reads as standing on the ground rather than pasted onto it -- at night, or whenever
 * the real shadow lands somewhere else entirely.
 *
 * A soft radial gradient rather than a flat disc: a hard-edged shape at uniform alpha reads as
 * a grey puddle, not a shadow. One shared texture, one shared plane -- every object of a kind
 * is a thin instance of it.
 */
export function createGroundShadow(scene: Scene, name: string, alpha = 0.35) {
  const texture = new DynamicTexture(`${name}_texture`, 64, scene, false);
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(0.6, "rgba(0,0,0,0.5)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  texture.update(false);

  const material = new StandardMaterial(`${name}_material`, scene);
  material.diffuseTexture = texture;
  material.diffuseTexture.hasAlpha = true;
  material.useAlphaFromDiffuseTexture = true;
  material.diffuseColor = Color3.Black();
  material.emissiveColor = Color3.Black();
  material.specularColor = Color3.Black();
  material.disableLighting = true;
  material.alpha = alpha;
  material.transparencyMode = Material.MATERIAL_ALPHABLEND;
  material.backFaceCulling = false;

  // A plane in its default orientation faces the camera, not the sky -- rotate it flat and
  // bake that in, so the thin-instance matrices below are pure scale and translation.
  const mesh = MeshBuilder.CreatePlane(name, { size: 1 }, scene);
  mesh.rotation.x = Math.PI / 2;
  mesh.bakeCurrentTransformIntoVertices();
  mesh.material = material;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.setEnabled(false);

  function setInstances(bases: readonly { x: number; y: number; z: number; radius: number }[]): void {
    mesh.thinInstanceCount = 0;
    mesh.setEnabled(bases.length > 0);
    if (bases.length === 0) return;

    const buffer = new Float32Array(bases.length * 16);
    for (const [i, base] of bases.entries()) {
      const size = base.radius * 2;
      Matrix.Scaling(size, 1, size)
        .multiply(Matrix.Translation(base.x, base.y + 0.03, base.z))
        .copyToArray(buffer, i * 16);
    }
    mesh.thinInstanceSetBuffer("matrix", buffer, 16, false); // non-static: count changes every rebuild
    mesh.thinInstanceCount = bases.length;
  }

  return { mesh, setInstances };
}

export type GroundShadowBase = { x: number; y: number; z: number; radius: number };
