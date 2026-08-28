import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { CascadedShadowGenerator } from "@babylonjs/core/Lights/Shadows/cascadedShadowGenerator";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";

export const DAYLIGHT_START = 5.5;
export const DAYLIGHT_END = 21.5;

export function daylightAt(hour: number): number {
  return smoothstep((hour - DAYLIGHT_START) / 2.5) * (1 - smoothstep((hour - 19.5) / 3));
}

export function sunAzimuthAt(hour: number): number {
  return ((hour - DAYLIGHT_START) / 24) * Math.PI * 2;
}

/** Engine, scene, camera and lights. Nothing here knows about roads. */
export function createScene(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.106, 0.118, 0.137, 1);
  scene.imageProcessingConfiguration.contrast = 1.12;
  scene.imageProcessingConfiguration.exposure = 1.04;

  // Top-down-ish orbit camera: the city-builder default.
  const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3.6, 220, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 20;
  camera.upperRadiusLimit = 1200;
  camera.maxZ = 20_000;
  camera.upperBetaLimit = Math.PI / 2.2; // never go under the ground
  camera.wheelPrecision = 0.6;
  camera.panningSensibility = 12;
  camera.panningInertia = 0.7;

  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.52;
  ambient.groundColor = new Color3(0.18, 0.2, 0.22);

  const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.35), scene);
  const shadows = new CascadedShadowGenerator(1024, sun);
  shadows.shadowMaxZ = 1600;
  shadows.stabilizeCascades = true;
  shadows.bias = 0.002;
  shadows.normalBias = 0.08;
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
  shadows.setDarkness(0.44);
  const sky = createSky(scene, camera);

  function setSunHour(hour: number): void {
    const phase = sunPhase(hour);
    const daylight = daylightAt(hour);
    const azimuth = sunAzimuthAt(hour);
    const sunVector = new Vector3(-Math.cos(azimuth), Math.sin(phase), -Math.sin(azimuth)).normalize();
    sun.direction.copyFromFloats(Math.cos(azimuth), -Math.max(0.05, daylight), Math.sin(azimuth)).normalize();
    sun.intensity = daylight * 1.22;
    sun.diffuse = Color3.Lerp(new Color3(1, 0.52, 0.28), new Color3(1, 0.97, 0.9), daylight);
    ambient.intensity = 0.02 + daylight * 0.5;
    ambient.diffuse = Color3.Lerp(new Color3(0.22, 0.3, 0.48), Color3.White(), daylight);
    scene.clearColor = new Color4(
      0.025 + daylight * 0.081,
      0.035 + daylight * 0.083,
      0.07 + daylight * 0.067,
      1,
    );
    sky.setHour(daylight, sunVector);
  }
  setSunHour(14);

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());

  return { engine, scene, camera, shadows, setSunHour };
}

function sunPhase(hour: number): number {
  return ((hour - DAYLIGHT_START) / (DAYLIGHT_END - DAYLIGHT_START)) * Math.PI;
}

function createSky(scene: Scene, camera: ArcRotateCamera) {
  const skybox = MeshBuilder.CreateSphere("skybox", { diameter: 1, segments: 24 }, scene);
  skybox.scaling.setAll(16_000);
  skybox.infiniteDistance = true;
  skybox.ignoreCameraMaxZ = true;
  skybox.isPickable = false;
  skybox.useVertexColors = true;

  const skyMaterial = new StandardMaterial("skybox_material", scene);
  skyMaterial.disableLighting = true;
  skyMaterial.emissiveColor = Color3.White();
  skyMaterial.disableDepthWrite = true;
  skyMaterial.backFaceCulling = false;
  skyMaterial.specularColor = Color3.Black();
  skybox.material = skyMaterial;

  const sunDisc = celestialDisc(scene, "sun_disc", new Color3(1, 0.78, 0.34), 260);
  const moonDisc = celestialDisc(scene, "moon_disc", new Color3(0.72, 0.78, 0.86), 190);
  let sunVector = new Vector3(0, 1, 0);

  scene.registerBeforeRender(() => {
    sunDisc.position.copyFrom(camera.position).addInPlace(sunVector.scale(6500));
    moonDisc.position.copyFrom(camera.position).addInPlace(sunVector.scale(-6500));
  });

  return {
    setHour(daylight: number, nextSunVector: Vector3): void {
      sunVector = nextSunVector;
      updateSkyColors(skybox, daylight, nextSunVector.y);
      sunDisc.setEnabled(nextSunVector.y > -0.05);
      moonDisc.setEnabled(nextSunVector.y < 0.35);
      (sunDisc.material as StandardMaterial).alpha = Math.min(1, Math.max(0, nextSunVector.y * 2));
      (moonDisc.material as StandardMaterial).alpha = Math.min(0.85, Math.max(0, 0.5 - nextSunVector.y));
    },
  };
}

function celestialDisc(scene: Scene, name: string, color: Color3, size: number): Mesh {
  const mesh = MeshBuilder.CreateDisc(name, { radius: size, tessellation: 32 }, scene);
  const material = new StandardMaterial(`${name}_material`, scene);
  material.disableLighting = true;
  material.emissiveColor = color;
  material.diffuseColor = color;
  material.specularColor = Color3.Black();
  material.backFaceCulling = false;
  material.alpha = 1;
  mesh.material = material;
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  mesh.ignoreCameraMaxZ = true;
  mesh.isPickable = false;
  return mesh;
}

function updateSkyColors(mesh: Mesh, daylight: number, sunAltitude: number): void {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind) as Float32Array;
  const colors = new Float32Array((positions.length / 3) * 4);
  const twilight = (1 - Math.min(1, Math.abs(sunAltitude) / 0.45)) * (sunAltitude < 0.5 ? 1 : 0);
  const horizon = Color4.Lerp(
    Color4.Lerp(new Color4(0.04, 0.055, 0.13, 1), new Color4(0.76, 0.88, 0.98, 1), daylight),
    new Color4(0.95, 0.38, 0.18, 1),
    twilight,
  );
  const zenith = Color4.Lerp(
    Color4.Lerp(new Color4(0.018, 0.028, 0.09, 1), new Color4(0.22, 0.5, 0.9, 1), daylight),
    new Color4(0.08, 0.12, 0.32, 1),
    twilight * 0.65,
  );
  const stars = (1 - daylight) * Math.max(0, -sunAltitude) * 0.55;

  for (let i = 0; i < positions.length / 3; i++) {
    const y = positions[i * 3 + 1]!;
    const t = smoothstep((y + 0.12) / 0.62);
    const color = Color4.Lerp(horizon, zenith, t);
    if (t > 0.45 && hash(positions[i * 3]!, y, positions[i * 3 + 2]!) > 0.985) {
      color.r += stars;
      color.g += stars;
      color.b += stars;
    }
    color.toArray(colors, i * 4);
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, colors, true);
}

function hash(x: number, y: number, z: number): number {
  const value = Math.sin(x * 127.1 + y * 269.5 + z * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

const smoothstep = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
