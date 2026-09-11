import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { BuildingStatus } from "../sim/buildingLifecycle";
import { daylightAt } from "./scene";

/** One seed per connected pane, so a window never lights up half a triangle at a time. */
export function windowSeeds(positions: ArrayLike<number>, indices: ArrayLike<number>): Float32Array {
  const count = positions.length / 3;
  const parents = Int32Array.from({ length: count }, (_, i) => i);
  const root = (vertex: number): number => {
    while (parents[vertex] !== vertex) {
      parents[vertex] = parents[parents[vertex]!]!;
      vertex = parents[vertex]!;
    }
    return vertex;
  };
  for (let i = 0; i < indices.length; i += 3) {
    const a = root(indices[i]!);
    parents[root(indices[i + 1]!)] = a;
    parents[root(indices[i + 2]!)] = a;
  }
  const seeds = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const j = root(i) * 3;
    seeds[i * 2] = positions[j]! * 0.73 + positions[j + 2]! * 1.17;
    seeds[i * 2 + 1] = Math.floor(positions[j + 1]! / 3.2);
  }
  return seeds;
}

export function windowPower(status: Pick<BuildingStatus, "state" | "reason">): number {
  return (status.state === "working" || status.state === "idle") && status.reason !== "power" ? 1 : 0;
}

/** The existing glass draw calls carry the lights; no extra panes, textures or point lights. */
class WindowLights extends MaterialPluginBase {
  constructor(material: StandardMaterial, private readonly hour: () => number) {
    super(material, "cityWindows", 200, {}, true, true);
  }

  override getAttributes(attributes: string[]): void {
    attributes.push("windowSeed", "windowPower");
  }

  override getUniforms() {
    return {
      ubo: [{ name: "windowNight", size: 1, type: "float" }, { name: "windowOffice", size: 1, type: "float" }],
      vertex: "uniform float windowOffice;",
      fragment: "uniform float windowNight; uniform float windowOffice;",
    };
  }

  override bindForSubMesh(buffer: UniformBuffer): void {
    buffer.updateFloat("windowNight", 1 - daylightAt(this.hour()));
    buffer.updateFloat("windowOffice", this._material.name.startsWith("commercial_") ? 1 : 0);
  }

  override getCustomCode(shaderType: string): Record<string, string> {
    return shaderType === "vertex" ? {
      CUSTOM_VERTEX_DEFINITIONS: "attribute vec2 windowSeed; attribute float windowPower; varying float vWindowLight;",
      CUSTOM_VERTEX_MAIN_END: `
        float blockSeed = dot(finalWorld[3].xz, vec2(0.017, 0.031));
        float floorRoll = fract(sin(windowSeed.y * 12.9898 + blockSeed) * 43758.5453);
        float paneRoll = fract(sin(dot(windowSeed, vec2(12.9898, 78.233)) + blockSeed) * 43758.5453);
        vWindowLight = windowPower * step(0.24 + windowOffice * 0.28, floorRoll)
          * step(0.36, paneRoll) * (0.65 + paneRoll * 0.35);
      `,
    } : {
      CUSTOM_FRAGMENT_DEFINITIONS: "varying float vWindowLight;",
      CUSTOM_FRAGMENT_BEFORE_FOG: `
        vec3 roomColor = mix(vec3(1.0, 0.66, 0.28), vec3(0.65, 0.82, 1.0), windowOffice);
        color.rgb += roomColor * vWindowLight * windowNight * 0.85;
      `,
    };
  }
}

class SignGlow extends MaterialPluginBase {
  constructor(material: StandardMaterial, private readonly hour: () => number) { super(material, "signGlow", 210, {}, true, true); }
  override getAttributes(attributes: string[]): void { attributes.push("windowPower"); }
  override getUniforms() {
    return { ubo: [{ name: "signNight", size: 1, type: "float" }, { name: "signTime", size: 1, type: "float" }],
      fragment: "uniform float signNight; uniform float signTime;" };
  }
  override bindForSubMesh(buffer: UniformBuffer): void {
    buffer.updateFloat("signNight", 1 - daylightAt(this.hour()));
    buffer.updateFloat("signTime", performance.now() / 1000);
  }
  override getCustomCode(shader: string): Record<string, string> {
    return shader === "vertex" ? {
      CUSTOM_VERTEX_DEFINITIONS: "attribute float windowPower; varying float vSignPower;",
      CUSTOM_VERTEX_MAIN_END: "vSignPower = windowPower;",
    } : {
      CUSTOM_FRAGMENT_DEFINITIONS: "varying float vSignPower;",
      CUSTOM_FRAGMENT_BEFORE_FOG: "color.rgb += vec3(0.45, 0.3, 0.16) * vSignPower * signNight * (0.94 + 0.06 * sin(signTime * 0.6 + vPositionW.x));",
    };
  }
}

export function attachWindowLights(mesh: Mesh, hour: () => number): void {
  for (const material of new Set(mesh.subMeshes.map((sub) => sub.getMaterial() as StandardMaterial))) {
    if (material?.name.startsWith("commercial_") && material.name.includes("_sign")) new SignGlow(material, hour);
  }
  const glass = mesh.subMeshes.filter((sub) => sub.getMaterial()?.name.includes("_glass"));
  if (!glass.length) return;
  const indices = mesh.getIndices()!;
  const glassIndices = glass.flatMap((sub) => Array.from(indices.slice(sub.indexStart, sub.indexStart + sub.indexCount)));
  mesh.setVerticesData("windowSeed", windowSeeds(mesh.getVerticesData("position")!, glassIndices), false, 2);
  for (const material of new Set(glass.map((sub) => sub.getMaterial() as StandardMaterial))) new WindowLights(material, hour);
}
