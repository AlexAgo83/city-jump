import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

/** World-space grain avoids stretched UVs on junctions and fades before it can shimmer. */
export class SurfaceDetail extends MaterialPluginBase {
  constructor(material: StandardMaterial, private readonly paving = false) {
    super(material, "surfaceDetail", 210, {}, true, true);
  }
  override getCustomCode(shader: string): Record<string, string> | null {
    return shader === "fragment" ? { CUSTOM_FRAGMENT_BEFORE_FOG: `
      vec2 groundPoint = vPositionW.xz;
      float grain = fract(sin(dot(floor(groundPoint * 9.0), vec2(12.9898,78.233))) * 43758.5453);
      float patches = sin(groundPoint.x * 0.17 + sin(groundPoint.y * 0.11)) * sin(groundPoint.y * 0.23);
      float detailFade = 1.0 - smoothstep(80.0, 260.0, length(vEyePosition.xyz - vPositionW));
      color.rgb *= 0.97 + patches * 0.035 + (grain - 0.5) * 0.07 * detailFade;
      ${this.paving ? `
      vec2 joint = abs(fract(groundPoint / vec2(1.8, 1.2)) - 0.5);
      float seam = smoothstep(0.46, 0.49, max(joint.x, joint.y));
      color.rgb *= 1.0 - seam * 0.18 * detailFade;
      ` : ""}
    ` } : null;
  }
}
