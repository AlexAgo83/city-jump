// Real browser check of GLB arrival, moving traffic, day/night lamps and the whole fleet.
// node scripts/with-dev-server.mjs scripts/vehicles-shot.mjs /tmp/city-jump-vehicles
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const [url = "http://127.0.0.1:5173", out = "/tmp/city-jump-vehicles"] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.text().includes("could not load vehicle")) errors.push(message.text());
  });
  await page.goto(url);
  const catalog = await (await page.request.get(`${url}/vehicles/manifest.json`)).json();
  await page.waitForFunction((names) => {
    const scene = window.cityjump?._scene;
    return names.every((name) => scene?.getMeshByName(`car_body_${name}_0`)?.metadata?.vehicleAsset);
  }, catalog.map((shape) => shape.name), { timeout: 60000 });
  const live = await page.evaluate(async () => {
    const api = window.cityjump;
    api.setRunRules({ kaijuSpawns: false });
    api.demoCity();
    api.setPaused(false);
    const cars = api._scene.meshes.filter((mesh) => mesh.name.startsWith("traffic_"));
    const before = cars.map((car) => car.position.clone());
    await new Promise((resolve) => setTimeout(resolve, 700));
    const moved = cars.some((car, i) => !car.position.equals(before[i]));
    api.setPaused(true);
    api.selectVehicle();
    return { count: cars.length, moved, loaded: cars.every((car) => car.sourceMesh?.metadata?.vehicleAsset) };
  });
  assert.ok(live.count > 100 && live.moved && live.loaded, JSON.stringify(live));
  await page.screenshot({ path: `${out}/vehicles-traffic.png` });
  await page.keyboard.press("Escape");
  await page.evaluate(async (catalog) => {
    const api = window.cityjump;
    const scene = api._scene;
    for (const mesh of scene.meshes) mesh.setEnabled(false);
    scene.onBeforeRenderObservable.add(() => {
      for (const mesh of scene.meshes) {
        if (!mesh.name.startsWith("showcase_") && !mesh.name.startsWith("car_")) mesh.setEnabled(false);
      }
    });
    const { HemisphericLight } = await import("/node_modules/@babylonjs/core/Lights/hemisphericLight.js");
    const { Vector3 } = await import("/node_modules/@babylonjs/core/Maths/math.vector.js");
    for (const light of scene.lights) light.setEnabled(false);
    const fill = new HemisphericLight("showcase_fill", new Vector3(-0.5, 1, -0.6), scene);
    fill.intensity = 1.2;
    fill.groundColor.set(0.32, 0.36, 0.4);
    scene.fogDensity = 0;
    scene.clearColor.set(0.14, 0.18, 0.21, 1);
    const camera = scene.activeCamera;
    camera.lowerRadiusLimit = 4;
    camera.target.set(0, 1, 0);
    camera.radius = 32;
    camera.beta = 0.82;
    camera.alpha = Math.PI / 2.4;
    for (const [i, shape] of catalog.entries()) {
      const body = scene.getMeshByName(`car_body_${shape.name}_0`);
      const meshes = [body, scene.getMeshByName(`car_parts_${shape.name}`), scene.getMeshByName(`car_head_${shape.name}`), scene.getMeshByName(`car_tail_${shape.name}`)];
      for (const mesh of meshes) {
        mesh.setEnabled(true);
        const instance = mesh.createInstance(`showcase_${i}_${mesh.name}`);
        instance.position.set((2-(i % 5))*5.2, 0, i < 5 ? -5.5 : 5.5);
        instance.rotation.y = -0.35;
      }
    }
    const head = scene.getMaterialByName("car_head_lamps");
    const tail = scene.getMaterialByName("car_tail_lamps");
    head.emissiveColor.set(0.5, 0.49, 0.44);
    tail.emissiveColor.set(0.34, 0.07, 0.06);
    for (const light of scene.lights) {
      if (light.name.startsWith("car_beam_")) light.setEnabled(false);
    }
    // Hide the game HUD only for the catalogue photograph.
    for (const child of document.body.children) if (child.tagName !== "CANVAS" && child.tagName !== "SCRIPT") child.style.display = "none";
  }, catalog);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/vehicles-fleet.png` });
  for (let color = 1; color < 4; color++) {
    const complete = await page.evaluate(({ catalog, color }) => {
      const scene = window.cityjump._scene;
      for (const [i, shape] of catalog.entries()) {
        const variants = scene.meshes.filter((mesh) => mesh.name.startsWith(`car_body_${shape.name}_`));
        const body = variants[color % variants.length];
        const first = scene.getMeshByName(`showcase_${i}_car_body_${shape.name}_0`);
        first.setEnabled(false);
        scene.getMeshByName(`showcase_color_${i}`)?.dispose();
        body.setEnabled(true);
        const instance = body.createInstance(`showcase_color_${i}`);
        instance.position.copyFrom(first.position);
        instance.rotation.copyFrom(first.rotation);
      }
      return scene.meshes.filter((mesh) => mesh.name.startsWith("car_body_")).every((body) =>
        [body, ...body.instances].every((mesh) =>
          mesh.subMeshes.reduce((sum, part) => sum + part.indexCount, 0) === body.getTotalIndices()));
    }, { catalog, color });
    assert.ok(complete, `complete draw ranges for colour ${color}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/vehicles-fleet-color-${color}.png` });
  }
  await page.evaluate(() => {
    const scene = window.cityjump._scene;
    for (const mesh of [...scene.meshes]) {
      if (mesh.name.startsWith("showcase_color_")) mesh.dispose();
      else if (mesh.name.startsWith("showcase_")) mesh.setEnabled(true);
    }
  });
  await page.evaluate(() => {
    const scene = window.cityjump._scene;
    scene.getMaterialByName("car_head_lamps").emissiveColor.set(1, 0.97, 0.86);
    scene.getMaterialByName("car_tail_lamps").emissiveColor.set(0.95, 0.13, 0.1);
    scene.clearColor.set(0.025, 0.035, 0.06, 1);
    for (const light of scene.lights) light.intensity *= 0.15;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/vehicles-fleet-night.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const scene = window.cityjump._scene;
    scene.getLightByName("showcase_fill").intensity = 1.2;
    scene.clearColor.set(0.14, 0.18, 0.21, 1);
    for (const mesh of scene.meshes) {
      if (mesh.name.startsWith("showcase_") && !mesh.name.startsWith("showcase_7_")) mesh.setEnabled(false);
    }
    const camera = scene.activeCamera;
    camera.radius = 16;
    camera.target.set(0, 1, 5.5);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/vehicles-mobile.png` });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ...live, models: catalog.length, triangles: catalog.map(({ name, triangles }) => ({ name, triangles })) }, null, 2));
} finally {
  await browser.close();
}
