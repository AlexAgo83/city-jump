import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";

/** Engine, scene, camera and lights. Nothing here knows about roads. */
export function createScene(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.106, 0.118, 0.137, 1);

  // Top-down-ish orbit camera: the city-builder default.
  const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3.6, 220, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 20;
  camera.upperRadiusLimit = 1200;
  camera.upperBetaLimit = Math.PI / 2.2; // never go under the ground
  camera.wheelPrecision = 0.6;
  camera.panningSensibility = 12;
  camera.panningInertia = 0.7;

  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.65;
  ambient.groundColor = new Color3(0.25, 0.27, 0.3);

  const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.35), scene);

  function setSunHour(hour: number): void {
    const phase = ((hour - 6) / 12) * Math.PI;
    const daylight = Math.max(0, Math.sin(phase));
    const azimuth = ((hour - 6) / 24) * Math.PI * 2;
    sun.direction.copyFromFloats(Math.cos(azimuth), -Math.max(0.05, daylight), Math.sin(azimuth)).normalize();
    sun.intensity = daylight * 1.1;
    sun.diffuse = Color3.Lerp(new Color3(1, 0.56, 0.34), Color3.White(), daylight);
    ambient.intensity = 0.2 + daylight * 0.45;
    scene.clearColor = new Color4(
      0.025 + daylight * 0.081,
      0.035 + daylight * 0.083,
      0.07 + daylight * 0.067,
      1,
    );
  }
  setSunHour(14);

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());

  return { engine, scene, camera, setSunHour };
}
