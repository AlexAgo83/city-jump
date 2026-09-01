import { ClusteredLightContainer } from "@babylonjs/core/Lights/Clustered/clusteredLightContainer";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3, Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import type { Scene } from "@babylonjs/core/scene";

import type { RoadGraph } from "../sim/graph";
import type { TerrainBounds } from "../sim/heightmap";
import { allJunctions, segmentTrims, type JunctionGeometry } from "../sim/junction";
import { baseRoadTypeId, roadType } from "../sim/roadTypes";
import { normalizeXZ, perpXZ } from "../sim/vec";
import { createGroundShadow } from "./groundShadow";
import { ROAD_LIFT, segmentMeshTouchesBounds } from "./roadMesh";

/**
 * The hour a fresh city opens at: late enough for the light to be low and the lamps to be about to
 * come on, which is when the city looks like something. The slider in `index.html` carries the
 * same value as its own default -- that one is markup, this one is what the code starts from.
 */
/** A run opens in daylight. It used to open at dusk and be dark within seconds. */
export const DEFAULT_HOUR = 11;

/** The hours streetlights burn -- and, with them, every headlight on the road. */
export function streetlightsOnAt(hour: number): boolean {
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
  // A highway's own lamp, lit cooler/whiter than an ordinary street's warm sodium glow -- same
  // pole and head, its own bulb mesh only, since a material is shared across every thin instance.
  const bulbWhite = MeshBuilder.CreateCylinder("streetlight_bulbs_white", { height: 0.08, diameter: 0.58, tessellation: 16 }, scene);

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

  const glowWhite = new StandardMaterial("streetlight_glow_white", scene);
  glowWhite.diffuseColor = new Color3(0.92, 0.95, 1);
  glowWhite.emissiveColor = new Color3(0.85, 0.92, 1);
  glowWhite.specularColor = Color3.Black();
  glowWhite.disableLighting = true;
  bulbWhite.material = glowWhite;

  for (const mesh of [pole, arm, head, bulb, bulbWhite]) {
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.setEnabled(false);
  }

  let lamps = 0;
  let sunHour = 14;
  let lightsEnabled = true;
  let lampPositions: { position: Vector3; direction: Vector3; white: boolean }[] = [];
  interface LampRecord {
    segment: number;
    pole: Matrix;
    arm: Matrix;
    head: Matrix;
    bulb: Matrix | null;
    bulbWhite: Matrix | null;
    position: Vector3;
    direction: Vector3;
    white: boolean;
    shadow: { x: number; y: number; z: number; radius: number };
    lights?: { pool: SpotLight; facade: PointLight };
  }
  let lampRecords: LampRecord[] = [];

  function rebuild(junctions: Map<number, JunctionGeometry> = allJunctions(graph), dirty?: TerrainBounds): number {
    const poleMatrices: Matrix[] = [];
    const armMatrices: Matrix[] = [];
    const headMatrices: Matrix[] = [];
    const bulbMatrices: Matrix[] = [];
    const bulbWhiteMatrices: Matrix[] = [];
    const positions: typeof lampPositions = [];
    const shadowBases: { x: number; y: number; z: number; radius: number }[] = [];
    const changedRecords: LampRecord[] = [];
    const spareLights: NonNullable<LampRecord["lights"]>[] = [];
    if (!dirty) {
      for (const record of lampRecords) {
        if (record.lights) spareLights.push(record.lights);
        record.lights = undefined;
      }
    }
    const records: LampRecord[] = dirty
      ? lampRecords.filter((record) => {
          try {
            const segment = graph.segment(record.segment);
            const keep = !streetlightSegmentTouchesBounds(segment.samples, roadType(segment.type), dirty);
            if (!keep && record.lights) spareLights.push(record.lights);
            if (!keep) record.lights = undefined;
            return keep;
          } catch {
            if (record.lights) spareLights.push(record.lights);
            record.lights = undefined;
            return false;
          }
        })
      : [];
    const pushRecord = (record: LampRecord): void => {
      changedRecords.push(record);
      records.push(record);
      poleMatrices.push(record.pole);
      armMatrices.push(record.arm);
      headMatrices.push(record.head);
      if (record.bulb) bulbMatrices.push(record.bulb);
      if (record.bulbWhite) bulbWhiteMatrices.push(record.bulbWhite);
      positions.push({ position: record.position, direction: record.direction, white: record.white });
      shadowBases.push(record.shadow);
      if (!record.lights && spareLights.length) {
        record.lights = spareLights.pop();
        moveRecordLights(record);
      }
    };
    for (const record of records) {
      poleMatrices.push(record.pole);
      armMatrices.push(record.arm);
      headMatrices.push(record.head);
      if (record.bulb) bulbMatrices.push(record.bulb);
      if (record.bulbWhite) bulbWhiteMatrices.push(record.bulbWhite);
      positions.push({ position: record.position, direction: record.direction, white: record.white });
      shadowBases.push(record.shadow);
    }
    for (const segment of graph.allSegments()) {
      const type = roadType(segment.type);
      if (type.tunnelDepth) continue;
      if (dirty && !streetlightSegmentTouchesBounds(segment.samples, type, dirty)) continue;

      // A junction or roundabout trims the road surface back from its node -- a lamp placed by
      // raw distance along the segment doesn't know that, and can land on ground that reads as
      // "past the road" (the junction's own disc, a roundabout's ring) rather than beside it.
      const { start: trimStart, end: trimEnd } = segmentTrims(junctions, graph, segment.id);

      const isAvenue = baseRoadTypeId(segment.type) === "avenue" || type.industrial;
      const isHighway = type.highway === true;
      const spacing = isAvenue || isHighway ? 70 : 95;
      for (let d = spacing / 2; d < segment.length - 12; d += spacing) {
        if (d < trimStart || d > segment.length - trimEnd) continue;
        const sides: (-1 | 1)[] = isAvenue || isHighway ? [-1, 1] : [Math.floor(d / spacing) % 2 === 0 ? -1 : 1];
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
          const poleMatrix = Matrix.Compose(Vector3.OneReadOnly, Quaternion.Identity(), new Vector3(poleX, y + 3.75, poleZ));
          const armMatrix = Matrix.Compose(Vector3.OneReadOnly, armRotation, new Vector3((poleX + bulbX) / 2, y + 7.38, (poleZ + bulbZ) / 2));
          const headMatrix = Matrix.Compose(Vector3.OneReadOnly, armRotation, new Vector3(bulbX, y + 7.22, bulbZ));
          const lightPosition = new Vector3(bulbX, y + 7.06, bulbZ);
          const bulbMatrix = Matrix.Compose(Vector3.OneReadOnly, armRotation, lightPosition);
          pushRecord({
            segment: segment.id,
            pole: poleMatrix,
            arm: armMatrix,
            head: headMatrix,
            bulb: isHighway ? null : bulbMatrix,
            bulbWhite: isHighway ? bulbMatrix : null,
            position: lightPosition,
            direction: new Vector3(n.x * side * 0.45, -1, n.z * side * 0.45).normalize(),
            white: isHighway,
            shadow: { x: poleX, y, z: poleZ, radius: 0.5 },
          });
        }
      }
    }

    applyInstances(pole, poleMatrices);
    applyInstances(arm, armMatrices);
    applyInstances(head, headMatrices);
    applyInstances(bulb, bulbMatrices);
    applyInstances(bulbWhite, bulbWhiteMatrices);
    // ponytail: dirty rebuild preserves records/lights, but still uploads whole thin-instance buffers;
    // split buffers by segment if the measured ~15.7 ms placement cost starts to matter.
    groundShadow.setInstances(shadowBases);
    lampPositions = positions;
    lampRecords = records;
    lamps = bulbMatrices.length + bulbWhiteMatrices.length;
    rebuildLights(records.filter((record) => !record.lights));
    for (const lights of spareLights) disposeLights(lights);
    if (dirty) updateRecordLights(changedRecords);
    else updateLights();
    return lamps;
  }

  function setSunHour(hour: number): void {
    sunHour = hour;
    updateLights();
  }

  function updateLights(): void {
    const on = lightsEnabled && streetlightsOnAt(sunHour);
    glow.emissiveColor = on ? new Color3(1, 0.68, 0.24) : new Color3(0.25, 0.18, 0.08);
    glowWhite.emissiveColor = on ? new Color3(0.85, 0.92, 1) : new Color3(0.16, 0.19, 0.22);
    lightCluster.setEnabled(on);
    for (const record of lampRecords) {
      updateRecordLights([record]);
    }
  }

  function updateRecordLights(records: LampRecord[]): void {
    const on = lightsEnabled && streetlightsOnAt(sunHour);
    for (const record of records) {
      if (!record.lights) continue;
      record.lights.pool.setEnabled(on);
      record.lights.facade.setEnabled(on);
    }
  }

  function rebuildLights(records: LampRecord[]): void {
    // Creating or disposing a light walks every mesh in the scene, and a city carries hundreds
    // of lamps: churning them all on every rebuild cost seconds per road drawn. Only the
    // difference in count is created or disposed now; every other light is simply moved.
    for (const record of records) {
      const i = lampRecords.indexOf(record);
      const pool = new SpotLight(`streetlight_pool_${i}`, Vector3.Zero(), Vector3.Down(), Math.PI / 2.1, 1.35, scene);
      pool.intensity = 7;
      pool.range = 44;
      const facade = new PointLight(`streetlight_facade_${i}`, Vector3.Zero(), scene);
      facade.intensity = 3.2;
      facade.range = 40;
      for (const light of [pool, facade]) lightCluster.addLight(light);
    record.lights = { pool, facade };
    moveRecordLights(record);
    }
  }

  function moveRecordLights(record: LampRecord): void {
    if (!record.lights) return;
    const { pool, facade } = record.lights;
    pool.position = record.position;
    pool.direction = record.direction;
    pool.diffuse = record.white ? new Color3(0.82, 0.9, 1) : new Color3(1, 0.72, 0.4);
    pool.specular = record.white ? new Color3(0.3, 0.34, 0.4) : new Color3(0.45, 0.28, 0.1);
    facade.position = record.position;
    facade.diffuse = record.white ? new Color3(0.78, 0.86, 1) : new Color3(1, 0.66, 0.34);
    facade.specular = record.white ? new Color3(0.22, 0.25, 0.3) : new Color3(0.34, 0.2, 0.08);
  }

  function disposeRecordLights(record: LampRecord): void {
    if (!record.lights) return;
    disposeLights(record.lights);
    record.lights = undefined;
  }

  function disposeLights(lights: NonNullable<LampRecord["lights"]>): void {
    for (const light of [lights.pool, lights.facade]) {
      lightCluster.removeLight(light);
      light.dispose();
    }
  }

  /** The Traffic view fades these back the same way it fades the road they stand beside. */
  let lastFaded = false;
  function setFaded(faded: boolean): void {
    // See buildings.ts's setFaded: reassigning transparencyMode to the value it already has, on
    // every tool-bar click, was enough to corrupt unrelated thin-instanced meshes' draw state.
    if (faded === lastFaded) return;
    lastFaded = faded;
    const alpha = faded ? 0.35 : 1;
    for (const m of [metal, glow, glowWhite]) {
      m.alpha = alpha;
      m.transparencyMode = alpha < 1 ? Material.MATERIAL_ALPHABLEND : Material.MATERIAL_OPAQUE;
    }
  }

  return {
    rebuild,
    setSunHour,
    setLightsEnabled(enabled: boolean) {
      lightsEnabled = enabled;
      updateLights();
    },
    setFaded,
    count: () => lamps,
    realLightCount: () => (lightCluster.isEnabled() ? lampRecords.filter((record) => record.lights).length * 2 : 0),
  };
}

export function streetlightSegmentTouchesBounds(
  samples: readonly { x: number; y: number; z: number }[],
  type: { width: number; highway?: boolean; pedestrian?: boolean },
  bounds: TerrainBounds,
): boolean {
  return segmentMeshTouchesBounds(samples, { ...type, width: type.width + 4 }, bounds);
}

function applyInstances(mesh: Mesh, matrices: Matrix[]): void {
  mesh.thinInstanceCount = 0;
  mesh.setEnabled(matrices.length > 0);
  if (matrices.length === 0) return;

  const buffer = new Float32Array(matrices.length * 16);
  for (const [i, matrix] of matrices.entries()) matrix.copyToArray(buffer, i * 16);
  mesh.thinInstanceSetBuffer("matrix", buffer, 16, false); // non-static: count changes every rebuild
  mesh.thinInstanceCount = matrices.length;
}
