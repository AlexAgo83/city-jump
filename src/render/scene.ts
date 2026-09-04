import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { CascadedShadowGenerator } from "@babylonjs/core/Lights/Shadows/cascadedShadowGenerator";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { DEFAULT_HOUR } from "../sim/time";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { GROUND_SIZE } from "./ground";

export const DAYLIGHT_START = 5.5;
export const DAYLIGHT_END = 21.5;

export function daylightAt(hour: number): number {
  return smoothstep((hour - DAYLIGHT_START) / 2.5) * (1 - smoothstep((hour - 19.5) / 3));
}

export function sunAzimuthAt(hour: number): number {
  return ((hour - DAYLIGHT_START) / 24) * Math.PI * 2;
}

/** Engine, scene, camera and lights. Nothing here knows about roads. */
/** How lit the world stays at midnight, so a night is dim rather than off. */
const NIGHT_FLOOR = 0.42;

export function createScene(canvas: HTMLCanvasElement) {
  // adaptToDeviceRatio: without it the canvas renders at CSS pixels and a retina screen shows the
  // result upscaled. With it, a retina screen renders four times the pixels -- and this scene is
  // fill-bound the moment the water fills the frame. Capped at 1.5x: past that the multisampling
  // and FXAA are doing the work anyway, and the pixels are just cost.
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false }, true);
  engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.5));
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.106, 0.118, 0.137, 1);
  scene.imageProcessingConfiguration.contrast = 1.12;
  scene.imageProcessingConfiguration.exposure = 1.04;
  // Aerial perspective: everything far enough away becomes the horizon colour, so the
  // ocean has no visible end. ponytail: exp2 fog, swap for a real atmosphere shader only if needed.
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.00016;

  // Top-down-ish orbit camera: the city-builder default.
  const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3.6, 220, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 20;
  camera.upperRadiusLimit = 1200;
  camera.minZ = 2; // paired with the far maxZ below: keeps depth precision usable
  camera.maxZ = 60_000;
  camera.upperBetaLimit = Math.PI / 2.2; // never go under the ground
  camera.wheelPrecision = 0.6;
  camera.panningSensibility = 12;
  camera.panningInertia = 0.7;
  const keyboardPan = attachKeyboardPan(scene, camera, () => frameDeltaMs);

  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.52;
  ambient.groundColor = new Color3(0.18, 0.2, 0.22);

  const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.35), scene);
  // Two cascades, not the default four: the shadow map redraws every caster in the city once per
  // cascade, and at four that pass alone was costing a third of the frame (measured -- see
  // docs/performance.md). Two of them at 2048 run as fast as two at 1024 (the cost is the geometry
  // pass, not the fill) and resolve nearer shadows better than four at 1024 did.
  const shadows = new CascadedShadowGenerator(2048, sun);
  shadows.numCascades = 2;
  shadows.shadowMaxZ = 1600;
  shadows.stabilizeCascades = true;
  shadows.bias = 0.002;
  shadows.normalBias = 0.08;
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
  shadows.setDarkness(0.58);
  const sky = createSky(scene, camera);

  function setSunHour(hour: number): void {
    const phase = sunPhase(hour);
    // The island never goes fully dark. Played at night the city disappeared -- only the halos
    // under the streetlights were left -- and a builder you cannot see is a builder you cannot
    // play. A floor keeps the ground readable while the colour still says night.
    const daylight = NIGHT_FLOOR + daylightAt(hour) * (1 - NIGHT_FLOOR);
    const azimuth = sunAzimuthAt(hour);
    const sunVector = new Vector3(-Math.cos(azimuth), Math.sin(phase), -Math.sin(azimuth)).normalize();
    sun.direction.copyFromFloats(Math.cos(azimuth), -Math.max(0.05, daylight), Math.sin(azimuth)).normalize();
    // Once the sun is down the directional light becomes moonlight: dim, blue and still
    // directional, so the night keeps some shape instead of going flat black. Real moonlight is
    // near-neutral; the eye's scotopic response reads it as blue, which is also what film does.
    const moonlit = 1 - Math.min(1, daylight * 4);
    sun.intensity = daylight * 1.22 + moonlit * 0.34;
    sun.diffuse = Color3.Lerp(
      Color3.Lerp(new Color3(1, 0.52, 0.28), new Color3(1, 0.97, 0.9), daylight),
      new Color3(0.44, 0.58, 0.95),
      moonlit,
    );
    // Sky fill. Played at night, 0.12 still read as black: the city vanished and only the halos
    // under the streetlights were left. A night should be dim and blue, not an off switch.
    ambient.intensity = 0.34 + daylight * 0.26;
    ambient.diffuse = Color3.Lerp(new Color3(0.3, 0.42, 0.72), Color3.White(), daylight);
    ambient.groundColor = Color3.Lerp(new Color3(0.12, 0.16, 0.26), new Color3(0.18, 0.2, 0.22), daylight);
    scene.clearColor = new Color4(
      0.025 + daylight * 0.081,
      0.035 + daylight * 0.083,
      0.07 + daylight * 0.067,
      1,
    );
    const horizon = horizonColor(daylight, sunVector.y);
    scene.fogColor.copyFromFloats(horizon.r, horizon.g, horizon.b);
    sky.setHour(daylight, sunVector);
  }
  const setShadowsEnabled = (enabled: boolean): void => {
    sun.shadowEnabled = enabled;
  };

  /**
   * Nothing that casts a shadow moves on its own: cars and people are not casters, so between one
   * edit and the next the shadow map draws the same city over and over. It is rendered once and
   * then only again when something it depends on changes -- the camera (the cascades are fitted to
   * its frustum), the sun, or the city itself. Watching the camera here rather than asking callers
   * to report it keeps the rule in one place, and a moving camera is exactly the case where the
   * map has to be redrawn anyway.
   */
  const shadowMap = shadows.getShadowMap();
  let shadowKey = "";
  let shadowObserver: ReturnType<typeof scene.onBeforeRenderObservable.add> | null = null;
  if (shadowMap) {
    shadowMap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    shadowObserver = scene.onBeforeRenderObservable.add(() => {
      const key = `${camera.alpha.toFixed(4)},${camera.beta.toFixed(4)},${camera.radius.toFixed(2)},${camera.target.x.toFixed(2)},${camera.target.z.toFixed(2)},${sun.direction.x.toFixed(4)},${sun.direction.y.toFixed(4)}`;
      if (key === shadowKey) return;
      shadowKey = key;
      shadowMap.resetRefreshCounter();
    });
  }
  /** Whatever casts shadows has changed: draw the map again on the next frame. */
  const invalidateShadows = (): void => {
    shadowKey = "";
  };
  setSunHour(DEFAULT_HOUR);

  /**
   * How many frames a second to actually draw. The city runs flat out otherwise -- on a 120 Hz
   * laptop screen that is 120 frames of a scene that looks the same at 60, paid for in fan noise
   * and battery. A cap is the only optimisation that helps a machine already keeping up.
   *
   * ponytail: skip frames in the render loop rather than reaching for a fixed-timestep scheduler;
   * everything in this game is driven by elapsed time already, so a longer frame just moves
   * further.
   */
  let frameIntervalMs = 1000 / 60;
  let idleIntervalMs = 0;
  let lastFrame = 0;
  /**
   * Milliseconds between the frames actually drawn -- which is not what the engine reports once
   * this loop starts skipping some. Babylon samples its own delta every animation frame, so with
   * a cap on it reads the gap between two *animation* frames while the simulation has waited for
   * several: everything driven by it then moves at a rate that follows the frame rate rather than
   * the clock, and a city at 30 fps ran at a quarter of its speed at 120.
   */
  let frameDeltaMs = 0;
  let lastDrawn = 0;
  const setFrameCap = (fps: number): void => {
    frameIntervalMs = fps > 0 ? 1000 / fps : 0;
  };
  // Nobody is watching an unfocused window: it keeps running so the city stays live, slowly.
  const blur = (): void => {
    idleIntervalMs = 1000 / 10;
  };
  const focus = (): void => {
    idleIntervalMs = 0;
  };
  window.addEventListener("blur", blur);
  window.addEventListener("focus", focus);
  const renderLoop = (): void => {
    const interval = Math.max(frameIntervalMs, idleIntervalMs);
    if (interval > 0) {
      const now = performance.now();
      // Half a millisecond of slack: without it a 60 fps cap on a 60 Hz screen drops every other
      // frame, because the frame that arrives 16.6 ms later is a hair early by the clock.
      if (now - lastFrame < interval - 0.5) return;
      lastFrame = now;
    }
    const drawnAt = performance.now();
    frameDeltaMs = lastDrawn === 0 ? 1000 / 60 : drawnAt - lastDrawn;
    lastDrawn = drawnAt;
    scene.render();
  };
  engine.runRenderLoop(renderLoop);
  const resize = (): void => engine.resize();
  window.addEventListener("resize", resize);

  return {
    engine,
    scene,
    camera,
    shadows,
    setSunHour,
    setShadowsEnabled,
    invalidateShadows,
    setFrameCap,
    frameDelta: () => frameDeltaMs,
    dispose(): void {
      engine.stopRenderLoop(renderLoop);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      window.removeEventListener("resize", resize);
      keyboardPan.dispose();
      if (shadowObserver) scene.onBeforeRenderObservable.remove(shadowObserver);
      sky.dispose();
      shadows.dispose();
      ambient.dispose();
      sun.dispose();
      camera.detachControl();
      scene.dispose();
      engine.dispose();
    },
  };
}

const PAN_KEYS: Record<string, "forward" | "back" | "left" | "right"> = {
  ArrowUp: "forward",
  ArrowDown: "back",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/**
 * Arrow keys walk the camera over the map instead of orbiting it: up/down move along the
 * direction the camera currently faces, left/right strafe across it. Recomputed every frame, so
 * turning the camera turns what "forward" means.
 * ponytail: held-key set + one per-frame vector, no input abstraction layer.
 */
function attachKeyboardPan(scene: Scene, camera: ArcRotateCamera, frameDelta: () => number): { dispose(): void } {
  camera.keysUp = [];
  camera.keysDown = [];
  camera.keysLeft = [];
  camera.keysRight = [];

  const held = new Set<string>();
  const track = (event: KeyboardEvent, down: boolean): void => {
    const direction = PAN_KEYS[event.key];
    if (!direction) return;
    // Let the arrow keys keep doing their normal job inside the toolbar controls.
    const focused = document.activeElement?.tagName;
    if (focused === "INPUT" || focused === "SELECT") return;
    event.preventDefault();
    if (down) held.add(direction);
    else held.delete(direction);
  };
  const keydown = (event: KeyboardEvent): void => track(event, true);
  const keyup = (event: KeyboardEvent): void => track(event, false);
  const blur = (): void => held.clear();
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  window.addEventListener("blur", blur);

  const move = new Vector3();
  const beforeRenderObserver = scene.onBeforeRenderObservable.add(() => {
    if (held.size === 0) return;
    const forward = camera.getDirection(Vector3.Forward());
    const right = camera.getDirection(Vector3.Right());
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    move.setAll(0);
    if (held.has("forward")) move.addInPlace(forward);
    if (held.has("back")) move.subtractInPlace(forward);
    if (held.has("right")) move.addInPlace(right);
    if (held.has("left")) move.subtractInPlace(right);
    if (move.lengthSquared() === 0) return;

    // Speed scales with zoom: the same keypress should cover the same fraction of the screen
    // whether you are on a street or looking at the whole island.
    const step = (camera.radius * 0.9 * frameDelta()) / 1000;
    move.normalize().scaleInPlace(step);
    camera.target.x = clamp(camera.target.x + move.x, PAN_LIMIT);
    camera.target.z = clamp(camera.target.z + move.z, PAN_LIMIT);
  });
  return {
    dispose(): void {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      scene.onBeforeRenderObservable.remove(beforeRenderObserver);
      held.clear();
    },
  };
}

/** Half the ground, so the camera cannot walk off the map. */
const PAN_LIMIT = GROUND_SIZE / 2;

const clamp = (value: number, limit: number): number => Math.min(limit, Math.max(-limit, value));

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
  skyMaterial.fogEnabled = false;
  skybox.material = skyMaterial;

  const sunDisc = celestialDisc(scene, "sun_disc", new Color3(1, 0.78, 0.34), 260);
  const moonDisc = celestialDisc(scene, "moon_disc", new Color3(0.72, 0.78, 0.86), 190);
  let sunVector = new Vector3(0, 1, 0);

  const beforeRenderObserver = scene.onBeforeRenderObservable.add(() => {
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
    dispose(): void {
      scene.onBeforeRenderObservable.remove(beforeRenderObserver);
      skybox.material?.dispose();
      sunDisc.material?.dispose();
      moonDisc.material?.dispose();
      skybox.dispose();
      sunDisc.dispose();
      moonDisc.dispose();
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
  material.fogEnabled = false;
  mesh.material = material;
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  mesh.ignoreCameraMaxZ = true;
  mesh.isPickable = false;
  return mesh;
}

/** The colour the sky fades to at eye level. Fog uses it so distant water dissolves into the sky. */
export function horizonColor(daylight: number, sunAltitude: number): Color4 {
  const twilight = (1 - Math.min(1, Math.abs(sunAltitude) / 0.45)) * (sunAltitude < 0.5 ? 1 : 0);
  return Color4.Lerp(
    Color4.Lerp(new Color4(0.04, 0.055, 0.13, 1), new Color4(0.76, 0.88, 0.98, 1), daylight),
    new Color4(0.95, 0.38, 0.18, 1),
    twilight,
  );
}

function updateSkyColors(mesh: Mesh, daylight: number, sunAltitude: number): void {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind) as Float32Array;
  const colors = new Float32Array((positions.length / 3) * 4);
  const twilight = (1 - Math.min(1, Math.abs(sunAltitude) / 0.45)) * (sunAltitude < 0.5 ? 1 : 0);
  const horizon = horizonColor(daylight, sunAltitude);
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
