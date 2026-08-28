import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3, Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import type { Scene } from "@babylonjs/core/scene";

import type { RoadGraph } from "../sim/graph";
import { roadType } from "../sim/roadTypes";
import { normalizeXZ, perpXZ } from "../sim/vec";
import { ROAD_LIFT } from "./roadMesh";

const MAX_REAL_LIGHTS = 48;

export function createStreetlightRenderer(scene: Scene, graph: RoadGraph) {
  const pole = MeshBuilder.CreateBox("streetlight_poles", { width: 0.45, height: 7, depth: 0.45 }, scene);
  const arm = MeshBuilder.CreateBox("streetlight_arms", { width: 0.35, height: 0.35, depth: 4.2 }, scene);
  const bulb = MeshBuilder.CreateSphere("streetlight_bulbs", { diameter: 1.1, segments: 8 }, scene);

  const metal = new StandardMaterial("streetlight_metal", scene);
  metal.diffuseColor = new Color3(0.08, 0.085, 0.08);
  metal.specularColor = new Color3(0.12, 0.12, 0.1);
  pole.material = metal;
  arm.material = metal;

  const glow = new StandardMaterial("streetlight_glow", scene);
  glow.diffuseColor = new Color3(1, 0.8, 0.36);
  glow.emissiveColor = new Color3(1, 0.66, 0.22);
  glow.specularColor = Color3.Black();
  bulb.material = glow;

  for (const mesh of [pole, arm, bulb]) {
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.setEnabled(false);
  }

  let lamps = 0;
  let sunHour = 14;
  let lampPositions: Vector3[] = [];
  let realLights: SpotLight[] = [];

  function rebuild(): number {
    const poleMatrices: Matrix[] = [];
    const armMatrices: Matrix[] = [];
    const bulbMatrices: Matrix[] = [];
    const positions: Vector3[] = [];

    for (const segment of graph.allSegments()) {
      const type = roadType(segment.type);
      if (type.tunnelDepth) continue;

      const spacing = segment.type === "avenue" ? 70 : 95;
      for (let d = spacing / 2; d < segment.length - 12; d += spacing) {
        const sides: (-1 | 1)[] = segment.type === "avenue" ? [-1, 1] : [Math.floor(d / spacing) % 2 === 0 ? -1 : 1];
        const { position, tangent } = graph.pointAt(segment.id, d);
        const n = perpXZ(normalizeXZ(tangent));
        const yaw = Math.atan2(tangent.x, tangent.z);
        for (const side of sides) {
          const poleOffset = side * (type.width / 2 + 3.2);
          const bulbOffset = side * Math.max(1.2, type.width / 2 - 0.8);
          const poleX = position.x + n.x * poleOffset;
          const poleZ = position.z + n.z * poleOffset;
          const bulbX = position.x + n.x * bulbOffset;
          const bulbZ = position.z + n.z * bulbOffset;
          const y = position.y + ROAD_LIFT;
          const rotation = Quaternion.FromEulerAngles(0, yaw, 0);
          poleMatrices.push(Matrix.Compose(Vector3.OneReadOnly, rotation, new Vector3(poleX, y + 3.5, poleZ)));
          armMatrices.push(Matrix.Compose(Vector3.OneReadOnly, rotation, new Vector3((poleX + bulbX) / 2, y + 6.9, (poleZ + bulbZ) / 2)));
          const lightPosition = new Vector3(bulbX, y + 6.45, bulbZ);
          bulbMatrices.push(Matrix.Compose(Vector3.OneReadOnly, rotation, lightPosition));
          positions.push(lightPosition);
        }
      }
    }

    applyInstances(pole, poleMatrices);
    applyInstances(arm, armMatrices);
    applyInstances(bulb, bulbMatrices);
    lampPositions = positions;
    lamps = bulbMatrices.length;
    updateLights();
    return lamps;
  }

  function setSunHour(hour: number): void {
    sunHour = hour;
    updateLights();
  }

  function updateLights(): void {
    const on = sunHour >= 17 || sunHour < 8;
    glow.emissiveColor = on ? new Color3(1, 0.68, 0.24) : new Color3(0.25, 0.18, 0.08);
    for (const light of realLights) light.dispose();
    realLights = [];
    if (!on) return;

    const stride = Math.max(1, Math.ceil(lampPositions.length / MAX_REAL_LIGHTS));
    for (let i = 0; i < lampPositions.length && realLights.length < MAX_REAL_LIGHTS; i += stride) {
      const light = new SpotLight(`streetlight_light_${realLights.length}`, lampPositions[i]!, new Vector3(0, -1, 0), Math.PI / 2.8, 2, scene);
      light.diffuse = new Color3(1, 0.68, 0.24);
      light.specular = new Color3(0.25, 0.16, 0.05);
      light.intensity = 1.35;
      light.range = 34;
      realLights.push(light);
    }
  }

  return { rebuild, setSunHour, count: () => lamps, realLightCount: () => realLights.length };
}

function applyInstances(mesh: Mesh, matrices: Matrix[]): void {
  mesh.thinInstanceCount = 0;
  mesh.setEnabled(matrices.length > 0);
  if (matrices.length === 0) return;

  const buffer = new Float32Array(matrices.length * 16);
  for (const [i, matrix] of matrices.entries()) matrix.copyToArray(buffer, i * 16);
  mesh.thinInstanceSetBuffer("matrix", buffer, 16);
}
