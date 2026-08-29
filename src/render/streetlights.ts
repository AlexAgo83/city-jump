import { ClusteredLightContainer } from "@babylonjs/core/Lights/Clustered/clusteredLightContainer";
import type { Light } from "@babylonjs/core/Lights/light";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3, Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import type { Scene } from "@babylonjs/core/scene";

import type { RoadGraph } from "../sim/graph";
import { allJunctions, segmentTrims } from "../sim/junction";
import { roadType } from "../sim/roadTypes";
import { normalizeXZ, perpXZ } from "../sim/vec";
import { createGroundShadow } from "./groundShadow";
import { ROAD_LIFT } from "./roadMesh";

function streetlightsOnAt(hour: number): boolean {
  return hour >= 20 || hour < 6.5;
}

export function createStreetlightRenderer(scene: Scene, graph: RoadGraph) {
  const lightCluster = new ClusteredLightContainer("streetlight_lights", [], scene);
  lightCluster.maxRange = 52;
  const groundShadow = createGroundShadow(scene, "streetlight_ground_shadows", 0.28);
  const pole = MeshBuilder.CreateCylinder(
    "streetlight_poles",
    { height: 7.5, diameterBottom: 0.38, diameterTop: 0.24, tessellation: 8 },
    scene,
  );
  const arm = MeshBuilder.CreateBox("streetlight_arms", { width: 0.22, height: 0.22, depth: 3.8 }, scene);
  const head = MeshBuilder.CreateBox("streetlight_heads", { width: 0.75, height: 0.22, depth: 1.25 }, scene);
  const bulb = MeshBuilder.CreateCylinder("streetlight_bulbs", { height: 0.08, diameter: 0.58, tessellation: 16 }, scene);

  const metal = new StandardMaterial("streetlight_metal", scene);
  metal.diffuseColor = new Color3(0.08, 0.085, 0.08);
  metal.specularColor = new Color3(0.12, 0.12, 0.1);
  pole.material = metal;
  arm.material = metal;
  head.material = metal;

  const glow = new StandardMaterial("streetlight_glow", scene);
  glow.diffuseColor = new Color3(1, 0.8, 0.36);
  glow.emissiveColor = new Color3(1, 0.66, 0.22);
  glow.specularColor = Color3.Black();
  glow.disableLighting = true;
  bulb.material = glow;

  for (const mesh of [pole, arm, head, bulb]) {
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.setEnabled(false);
  }

  let lamps = 0;
  let sunHour = 14;
  let lampPositions: { position: Vector3; direction: Vector3 }[] = [];
  let realLights: Light[] = [];

  function rebuild(): number {
    const poleMatrices: Matrix[] = [];
    const armMatrices: Matrix[] = [];
    const headMatrices: Matrix[] = [];
    const bulbMatrices: Matrix[] = [];
    const positions: typeof lampPositions = [];
    const shadowBases: { x: number; y: number; z: number; radius: number }[] = [];
    const junctions = allJunctions(graph);

    for (const segment of graph.allSegments()) {
      const type = roadType(segment.type);
      if (type.tunnelDepth) continue;

      // A junction or roundabout trims the road surface back from its node -- a lamp placed by
      // raw distance along the segment doesn't know that, and can land on ground that reads as
      // "past the road" (the junction's own disc, a roundabout's ring) rather than beside it.
      const { start: trimStart, end: trimEnd } = segmentTrims(junctions, graph, segment.id);

      const spacing = segment.type === "avenue" ? 70 : 95;
      for (let d = spacing / 2; d < segment.length - 12; d += spacing) {
        if (d < trimStart || d > segment.length - trimEnd) continue;
        const sides: (-1 | 1)[] = segment.type === "avenue" ? [-1, 1] : [Math.floor(d / spacing) % 2 === 0 ? -1 : 1];
        const { position, tangent } = graph.pointAt(segment.id, d);
        const n = perpXZ(normalizeXZ(tangent));
        for (const side of sides) {
          const poleOffset = side * (type.width / 2 + 1.8);
          const bulbOffset = side * Math.max(0.5, type.width / 2 - 1.8);
          const poleX = position.x + n.x * poleOffset;
          const poleZ = position.z + n.z * poleOffset;
          const bulbX = position.x + n.x * bulbOffset;
          const bulbZ = position.z + n.z * bulbOffset;
          const y = position.y + ROAD_LIFT;
          const armRotation = Quaternion.FromEulerAngles(0, Math.atan2(bulbX - poleX, bulbZ - poleZ), 0);
          poleMatrices.push(Matrix.Compose(Vector3.OneReadOnly, Quaternion.Identity(), new Vector3(poleX, y + 3.75, poleZ)));
          armMatrices.push(Matrix.Compose(Vector3.OneReadOnly, armRotation, new Vector3((poleX + bulbX) / 2, y + 7.38, (poleZ + bulbZ) / 2)));
          headMatrices.push(Matrix.Compose(Vector3.OneReadOnly, armRotation, new Vector3(bulbX, y + 7.22, bulbZ)));
          const lightPosition = new Vector3(bulbX, y + 7.06, bulbZ);
          bulbMatrices.push(Matrix.Compose(Vector3.OneReadOnly, armRotation, lightPosition));
          positions.push({ position: lightPosition, direction: new Vector3(n.x * side * 0.45, -1, n.z * side * 0.45).normalize() });
          shadowBases.push({ x: poleX, y, z: poleZ, radius: 0.5 });
        }
      }
    }

    applyInstances(pole, poleMatrices);
    applyInstances(arm, armMatrices);
    applyInstances(head, headMatrices);
    applyInstances(bulb, bulbMatrices);
    groundShadow.setInstances(shadowBases);
    lampPositions = positions;
    lamps = bulbMatrices.length;
    rebuildLights();
    updateLights();
    return lamps;
  }

  function setSunHour(hour: number): void {
    sunHour = hour;
    updateLights();
  }

  function updateLights(): void {
    const on = streetlightsOnAt(sunHour);
    glow.emissiveColor = on ? new Color3(1, 0.68, 0.24) : new Color3(0.25, 0.18, 0.08);
    lightCluster.setEnabled(on);
    for (const light of realLights) light.setEnabled(on);
  }

  function rebuildLights(): void {
    for (const light of realLights) {
      lightCluster.removeLight(light);
      light.dispose();
    }
    realLights = [];

    for (const { position, direction } of lampPositions) {
      const pool = new SpotLight(`streetlight_pool_${realLights.length}`, position, direction, Math.PI / 2.1, 1.35, scene);
      pool.diffuse = new Color3(1, 0.72, 0.4);
      pool.specular = new Color3(0.45, 0.28, 0.1);
      pool.intensity = 7;
      pool.range = 44;
      const facade = new PointLight(`streetlight_facade_${realLights.length}`, position, scene);
      facade.diffuse = new Color3(1, 0.66, 0.34);
      facade.specular = new Color3(0.34, 0.2, 0.08);
      facade.intensity = 3.2;
      facade.range = 40;
      for (const light of [pool, facade]) {
        lightCluster.addLight(light);
        realLights.push(light);
      }
    }
  }

  return { rebuild, setSunHour, count: () => lamps, realLightCount: () => (lightCluster.isEnabled() ? realLights.length : 0) };
}

function applyInstances(mesh: Mesh, matrices: Matrix[]): void {
  mesh.thinInstanceCount = 0;
  mesh.setEnabled(matrices.length > 0);
  if (matrices.length === 0) return;

  const buffer = new Float32Array(matrices.length * 16);
  for (const [i, matrix] of matrices.entries()) matrix.copyToArray(buffer, i * 16);
  mesh.thinInstanceSetBuffer("matrix", buffer, 16);
}
