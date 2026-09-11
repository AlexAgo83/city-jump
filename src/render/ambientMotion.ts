import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer";
import { Color3, Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import type { Scene } from "@babylonjs/core/scene";
import { createSmokeMesh } from "./destructionEffects";

export class TreeWind extends MaterialPluginBase {
  constructor(material: StandardMaterial) { super(material, "treeWind", 210, {}, true, true); }
  override getUniforms() {
    return { ubo: [{ name: "windTime", size: 1, type: "float" }], vertex: "uniform float windTime;" };
  }
  override bindForSubMesh(buffer: UniformBuffer): void { buffer.updateFloat("windTime", performance.now() / 1000); }
  override getCustomCode(shader: string): Record<string, string> | null {
    return shader === "vertex" ? { CUSTOM_VERTEX_UPDATE_POSITION: `
      float phase = windTime * 1.25;
      #ifdef INSTANCES
      phase += world3.x * 0.05 + world3.z * 0.03;
      #endif
      float bend = pow(clamp(position.y / 12.0, 0.0, 1.3), 2.0);
      positionUpdated.x += (sin(phase) * 0.28 + sin(phase * 1.7) * 0.08) * bend;
      positionUpdated.z += cos(phase * 0.8) * 0.16 * bend;
    ` } : null;
  }
}

export function createChimneySmoke(scene: Scene) {
  const mesh = createSmokeMesh(scene, "roofprop_chimney_smoke", new Color3(0.65, 0.67, 0.66));
  let outlets: readonly Vector3[] = [];
  let visible = true;
  const matrices = new Float32Array(32 * 3 * 16);
  const colors = new Float32Array(32 * 3 * 4);
  const step = () => {
    if (!visible || !outlets.length) { mesh.setEnabled(false); return; }
    const now = performance.now() / 1000;
    for (const [i, point] of outlets.entries()) {
      for (let puff = 0; puff < 3; puff++) {
        const age = (now * 0.22 + puff / 3 + i * 0.17) % 1;
        const size = 0.8 + age * 4;
        Matrix.Compose(new Vector3(size, size * 1.5, size), Quaternion.Identity(),
          new Vector3(point.x + age * 4, point.y + age * 13, point.z + age * 2)).copyToArray(matrices, (i * 3 + puff) * 16);
        colors.set([1, 1, 1, Math.sin(age * Math.PI) * 0.5], (i * 3 + puff) * 4);
      }
    }
    mesh.thinInstanceSetBuffer("matrix", matrices, 16, false);
    mesh.thinInstanceSetBuffer("color", colors, 4, false);
    mesh.thinInstanceCount = outlets.length * 3;
  };
  const observer = scene.onBeforeRenderObservable.add(step);
  return {
    rebuild(points: readonly Vector3[]) {
      // ponytail: 32 smoking chimneys; select by camera if dense industrial districts need more.
      outlets = points.slice(0, 32);
      mesh.thinInstanceCount = outlets.length * 3;
      mesh.setEnabled(visible && outlets.length > 0);
      step();
    },
    setVisible(next: boolean) { visible = next; mesh.setEnabled(visible && outlets.length > 0); },
    dispose() { scene.onBeforeRenderObservable.remove(observer); mesh.material?.dispose(); mesh.dispose(); },
  };
}
