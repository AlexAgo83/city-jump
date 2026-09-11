import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Material } from "@babylonjs/core/Materials/material";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
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
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let z = 0; z < 64; z++) for (let x = 0; x < 64; x++) {
    const radius = Math.hypot((x - 31.5) / 31.5, (z - 31.5) / 31.5);
    pixels[(z * 64 + x) * 4 + 3] = Math.round(Math.max(0, 1 - radius * radius) ** 2 * 255);
  }
  const texture = RawTexture.CreateRGBATexture(pixels, 64, 64, scene, false, false, Texture.BILINEAR_SAMPLINGMODE);
  texture.name = `${name}_texture`;

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
  material.disableDepthWrite = true;
  material.zOffset = -2;

  // A plane in its default orientation faces the camera, not the sky -- rotate it flat and
  // bake that in, so the thin-instance matrices below are pure scale and translation.
  const mesh = MeshBuilder.CreatePlane(name, { size: 1 }, scene);
  mesh.rotation.x = Math.PI / 2;
  mesh.bakeCurrentTransformIntoVertices();
  mesh.material = material;
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.setEnabled(false);

  function setInstances(bases: readonly GroundShadowBase[]): void {
    mesh.thinInstanceCount = 0;
    mesh.setEnabled(bases.length > 0);
    if (bases.length === 0) return;

    const buffer = new Float32Array(bases.length * 16);
    for (const [i, base] of bases.entries()) {
      const size = base.radius * 2;
      Matrix.Scaling(size, 1, (base.radiusZ ?? base.radius) * 2)
        .multiply(Matrix.RotationY(base.rotationY ?? 0))
        .multiply(Matrix.Translation(base.x, base.y + 0.03, base.z))
        .copyToArray(buffer, i * 16);
    }
    mesh.thinInstanceSetBuffer("matrix", buffer, 16, false); // non-static: count changes every rebuild
    mesh.thinInstanceCount = bases.length;
  }

  return {
    mesh,
    setInstances,
    dispose(): void {
      mesh.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

export type GroundShadowBase = { x: number; y: number; z: number; radius: number; radiusZ?: number; rotationY?: number };
