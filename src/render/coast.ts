import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3, Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import type { Scene } from "@babylonjs/core/scene";
import { SEA_LEVEL, type Heightmap } from "../sim/heightmap";

class ShoreFoam extends MaterialPluginBase {
  constructor(material: StandardMaterial) { super(material, "shoreFoam", 210, {}, true, true); }
  override getUniforms() {
    return { ubo: [{ name: "shoreTime", size: 1, type: "float" }], fragment: "uniform float shoreTime;" };
  }
  override bindForSubMesh(buffer: UniformBuffer): void { buffer.updateFloat("shoreTime", performance.now() / 1000); }
  override getCustomCode(shader: string): Record<string, string> | null {
    return shader === "fragment" ? { CUSTOM_FRAGMENT_BEFORE_FOG: `
      float wash = sin(shoreTime * 0.8 + vPositionW.x * 0.06 + vPositionW.z * 0.04);
      float line = 1.0 - smoothstep(0.15, 0.85, abs(vPositionW.y - ${SEA_LEVEL.toFixed(1)} - 0.35 - wash * 0.25));
      float flecks = 0.7 + 0.3 * sin(vPositionW.x * 0.19 + sin(vPositionW.z * 0.27) * 2.0 + shoreTime * 0.45);
      color.rgb = mix(color.rgb, min(color.rgb * 1.8 + vec3(0.04), vec3(0.78, 0.85, 0.80)), line * flecks * 0.65);
    ` } : null;
  }
}

export function coastalRockMatrices(ground: Heightmap): Matrix[] {
  const matrices: Matrix[] = [];
  const step = Math.max(1, Math.round(24 / ground.cell));
  for (let z = 0; z < ground.count; z += step) for (let x = 0; x < ground.count; x += step) {
    const seed = (Math.imul(x, 73856093) ^ Math.imul(z, 19349663)) >>> 0;
    const h = ground.at(x, z);
    if (seed % 5 !== 0 || h < SEA_LEVEL + 0.5 || h > SEA_LEVEL + 5 || Math.abs(h - ground.baseAt(x, z)) > 0.1) continue;
    const size = 2 + (seed % 13) * 0.3;
    matrices.push(Matrix.Compose(new Vector3(size * 1.4, size * 0.8, size),
      Quaternion.FromEulerAngles(0.2, seed % 7, 0.15), new Vector3(ground.worldX(x), h + size * 0.12, ground.worldZ(z))));
  }
  return matrices;
}

export function createCoast(scene: Scene, ground: Heightmap, terrainMaterial: StandardMaterial) {
  new ShoreFoam(terrainMaterial);
  const rocks = MeshBuilder.CreateSphere("coastal_rocks", { diameter: 1, segments: 3 }, scene);
  const material = new StandardMaterial("coastal_rocks", scene);
  material.diffuseColor = new Color3(0.37, 0.39, 0.35);
  material.specularColor = Color3.Black();
  rocks.material = material;
  rocks.receiveShadows = true;
  rocks.isPickable = false;
  rocks.setEnabled(false);
  return {
    rebuild() {
      const matrices = coastalRockMatrices(ground);
      const buffer = new Float32Array(matrices.length * 16);
      matrices.forEach((matrix, i) => { matrix.copyToArray(buffer, i * 16); });
      rocks.thinInstanceSetBuffer("matrix", buffer, 16, false);
      rocks.thinInstanceCount = matrices.length;
      rocks.setEnabled(matrices.length > 0);
    },
    dispose() { rocks.dispose(); material.dispose(); },
  };
}
