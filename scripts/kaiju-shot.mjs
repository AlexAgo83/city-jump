// Inspect the shipped creature through the actual game renderer on desktop and mobile.
// node scripts/kaiju-shot.mjs [url] [output directory]
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const [url = "http://127.0.0.1:5173", out = "/tmp/city-jump-kaiju"] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.cityjump?._scene.getTransformNodeByName("kaiju_left_leg"), null, { timeout: 30000 });
  await page.evaluate(() => {
    window.cityjump.forceWave();
    window.cityjump.setPaused(false);
  });
  const animated = ["left_leg", "right_leg", "left_arm", "right_arm", "tail", "jaw"];
  await page.waitForFunction((names) => names.every((name) => window.cityjump._scene.getTransformNodeByName(`kaiju_${name}`)?.rotationQuaternion), animated);
  const before = await page.evaluate((names) => names.map((name) => window.cityjump._scene.getTransformNodeByName(`kaiju_${name}`).rotationQuaternion.asArray()), animated);
  await page.waitForFunction(({ names, previous }) => names.every((name, i) =>
    window.cityjump._scene.getTransformNodeByName(`kaiju_${name}`).rotationQuaternion.asArray().some((value, axis) => Math.abs(value - previous[i][axis]) > 0.001)),
  { names: animated, previous: before });
  await page.waitForFunction(() => window.cityjump._scene.getTransformNodeByName("kaiju_left_leg").rotationQuaternion.x > 0.07);
  await page.evaluate(() => window.cityjump.setPaused(true));
  for (const [name, width, height] of [["desktop", 1440, 1000], ["profile", 1440, 1000], ["mobile", 390, 844]]) {
    await page.setViewportSize({ width, height });
    const report = await page.evaluate(async (view) => {
      const mobile = view === "mobile";
      const scene = window.cityjump._scene;
      const root = scene.getTransformNodeByName("kaiju");
      const camera = scene.activeCamera;
      camera.target.copyFrom(root.position);
      camera.target.y += 45;
      camera.radius = mobile ? 310 : 205;
      camera.beta = 1.18;
      camera.alpha = Math.PI / 2 - root.rotationQuaternion.toEulerAngles().y + (view === "profile" ? 0.85 : -0.65);
      camera.lowerRadiusLimit = 100;
      const meshes = root.getChildMeshes().filter((mesh) => mesh.getTotalVertices() > 0);
      await scene.whenReadyAsync();
      scene.render();
      const pixels = await scene.getEngine().readPixels(0, 0, scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight());
      const colors = new Set();
      for (let i = 0; i < pixels.length; i += 256) colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
      return { meshes: meshes.length, colors: colors.size, visible: root.isEnabled(), textures: meshes.every((mesh) => mesh.material.isReady(mesh)), parented: scene.getTransformNodeByName("kaiju_left_leg").getChildMeshes().length };
    }, name);
    assert.ok(report.visible && report.meshes >= 20 && report.colors > 100 && report.textures && report.parented >= 2, JSON.stringify(report));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/kaiju-${name}.png` });
    console.log(name, report);
  }
  // Inspect fixed attack phases through the real renderer and shipped model.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(async () => {
    const scene = window.cityjump._scene;
    const original = scene.getTransformNodeByName("kaiju");
    const position = original.position.clone();
    const heading = original.rotationQuaternion.toEulerAngles().y;
    scene.onBeforeRenderObservable.clear(); // Freeze this inspection page's game simulation.
    original.setEnabled(false);
    const { createKaijuRenderer } = await import("/src/render/kaiju.ts");
    const shadows = scene.lights.map((light) => light.getShadowGenerator?.()).find(Boolean);
    const renderer = createKaijuRenderer(scene, shadows);
    const root = scene.transformNodes.find((node) => node.name === "kaiju" && node !== original);
    window.kaijuPreview = { renderer, root, position, heading };
    scene.activeCamera.radius = 230;
    scene.activeCamera.alpha = Math.PI / 2 - heading + 0.85;
  });
  await page.waitForFunction(() => window.kaijuPreview.root.getChildMeshes().length >= 20);
  for (const [name, mode, seconds, attackSeconds] of [
    ["sprint", "running", 0.25, 0],
    ["windup", "attacking", 2.75, 2.75],
    ["slam", "attacking", 4.99, 4.99],
    ["impact", "walking", 5, 0],
    ["recovered", "walking", 6, 0],
  ]) {
    const lean = await page.evaluate(({ mode, seconds, attackSeconds }) => {
      const { renderer, root, position, heading } = window.kaijuPreview;
      renderer.show(position, heading, seconds, mode, attackSeconds);
      return root.getDescendants().find((node) => node.name === "kaiju_torso").rotationQuaternion.toEulerAngles().x;
    }, { mode, seconds, attackSeconds });
    if (name === "sprint") assert.ok(lean > 0.28);
    if (name === "windup") assert.ok(lean < -0.15);
    if (name === "slam" || name === "impact") assert.ok(lean > 0.55);
    if (name === "recovered") assert.ok(Math.abs(lean) < 1e-9);
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${out}/kaiju-${name}.png` });
    console.log(name, { lean });
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
