// node scripts/with-dev-server.mjs scripts/pedestrians-shot.mjs /tmp/city-jump-pedestrians
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const [url = "http://127.0.0.1:5173", out = "/tmp/city-jump-pedestrians"] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.cityjump?._scene);
  const live = await page.evaluate(async () => {
    const api = window.cityjump;
    api.setRunRules({ kaijuSpawns: false });
    api.demoCity();
    api.setPaused(false);
    const walkers = api._scene.meshes.filter((mesh) => mesh.name.startsWith("pedestrian_") && !mesh.parent);
    const before = walkers.map((mesh) => ({ position: mesh.position.clone(), angle: mesh.getChildMeshes()[0].rotation.x }));
    await new Promise((resolve) => setTimeout(resolve, 700));
    const moved = walkers.some((mesh, i) => !mesh.position.equals(before[i].position));
    const animated = walkers.some((mesh, i) => mesh.getChildMeshes()[0].rotation.x !== before[i].angle);
    api.setPaused(true);
    const poses = walkers.map((mesh) => mesh.getChildMeshes().map((limb) => limb.rotation.x));
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      count: walkers.length, moved, animated,
      paused: walkers.every((mesh, i) => mesh.getChildMeshes().every((limb, j) => limb.rotation.x === poses[i][j])),
      articulated: walkers.every((mesh) => mesh.getChildMeshes().length === 4),
    };
  });
  assert.ok(live.count > 0 && live.moved && live.animated && live.paused && live.articulated, JSON.stringify(live));
  await page.screenshot({ path: `${out}/pedestrians-traffic.png` });
  const budgets = await page.evaluate(async () => {
    const scene = window.cityjump._scene;
    for (const mesh of scene.meshes) mesh.setEnabled(false);
    scene.onBeforeRenderObservable.add(() => {
      for (const mesh of scene.meshes) if (!/^(walker_|showcase_)/.test(mesh.name)) mesh.setEnabled(false);
    });
    const { HemisphericLight } = await import("/node_modules/@babylonjs/core/Lights/hemisphericLight.js");
    const { Vector3 } = await import("/node_modules/@babylonjs/core/Maths/math.vector.js");
    for (const light of scene.lights) light.setEnabled(false);
    const fill = new HemisphericLight("showcase_fill", new Vector3(-0.5, 1, 0.5), scene);
    fill.intensity = 1.3;
    fill.groundColor.set(0.35, 0.35, 0.35);
    scene.fogDensity = 0;
    scene.clearColor.set(0.17, 0.21, 0.24, 1);
    const bodies = scene.meshes.filter((mesh) => mesh.name.startsWith("walker_") && mesh.name.endsWith("_body"));
    for (const [i, body] of bodies.entries()) {
      body.setEnabled(true);
      const walker = body.createInstance(`showcase_${i}`);
      walker.position.set((Math.floor(i / 4) - 2.5) * 2.1, 0, (i % 4 - 1.5) * 2.6);
      walker.rotation.y = -0.25;
      for (const part of ["left_arm", "right_arm", "left_leg", "right_leg"]) {
        const source = scene.getMeshByName(body.name.replace(/body$/, part));
        source.setEnabled(true);
        const limb = source.createInstance(`showcase_${i}_${part}`);
        limb.parent = walker;
      }
    }
    const camera = scene.activeCamera;
    camera.lowerRadiusLimit = 2;
    camera.target.set(0, 0.8, 0);
    camera.radius = 19;
    camera.beta = 1.04;
    camera.alpha = Math.PI / 2;
    for (const child of document.body.children) if (!["CANVAS", "SCRIPT"].includes(child.tagName)) child.style.display = "none";
    return bodies.map((body) => ({
      name: body.name,
      triangles: scene.meshes.filter((mesh) => mesh.name.startsWith(body.name.replace(/body$/, "")))
        .reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0),
    }));
  });
  assert.equal(budgets.length, 24);
  assert.ok(budgets.every(({ triangles }) => triangles >= 250 && triangles <= 600));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/pedestrians-catalogue.png` });
  await page.evaluate(() => { window.cityjump._scene.activeCamera.alpha = -Math.PI / 2.5; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/pedestrians-back.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const scene = window.cityjump._scene;
    for (const mesh of scene.meshes) if (mesh.name.startsWith("showcase_") && !mesh.name.startsWith("showcase_4")) mesh.setEnabled(false);
    const walker = scene.getMeshByName("showcase_4");
    const camera = scene.activeCamera;
    camera.target.copyFrom(walker.position);
    camera.target.y = 0.9;
    camera.radius = 4.3;
    camera.beta = 1.25;
    camera.alpha = Math.PI / 2.7;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/pedestrians-mobile.png` });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ...live, variants: budgets.length, triangles: budgets.map(({ triangles }) => triangles) }));
} finally {
  await browser.close();
}
