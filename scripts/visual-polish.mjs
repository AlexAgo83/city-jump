// node scripts/with-dev-server.mjs scripts/visual-polish.mjs [/tmp/city-jump-polish]
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const [url = "http://127.0.0.1:5173", out = "/tmp/city-jump-polish"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
try {
  await page.goto(url);
  await page.evaluate((save) => localStorage.setItem("cityjump.autosave", save), readFileSync("public/default-demo.json", "utf8"));
  await page.reload();
  await page.waitForFunction(() => window.cityjump?.stats().models === 235, null, { timeout: 90_000 });
  await page.waitForFunction(() => window.cityjump.stats().buildings > 1000, null, { timeout: 90_000 });
  for (const [name, hour, radius] of [["day", 14, 600], ["night", 23, 600], ["street", 19, 240], ["coast", 14, 1200]]) {
    const report = await page.evaluate(async ({ hour, radius, name }) => {
      const api = window.cityjump;
      api.setPaused(true);
      const slider = document.getElementById("sun-hour");
      slider.value = String(hour);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      api.camera(radius, Math.PI / 3.2, -Math.PI / 3);
      if (name === "coast") api._scene.activeCamera.target.set(1100, 0, 350);
      await api._scene.whenReadyAsync();
      const buildings = api._scene.meshes.filter((mesh) => mesh.name.startsWith("building_") && mesh.thinInstanceCount > 0);
      const glass = buildings.flatMap((mesh) => mesh.subMeshes.filter((sub) => sub.getMaterial()?.name.includes("_glass")));
      return {
        buildings: api.stats().buildings,
        windows: glass.length,
        windowPlugins: glass.filter((sub) => sub.getMaterial().pluginManager?.getPlugin("cityWindows")).length,
        fps: await api.measureFps(1000),
        meshes: api._scene.getActiveMeshes().length,
      };
    }, { name, hour, radius });
    assert.ok(report.windows > 0 && report.windowPlugins === report.windows, JSON.stringify(report));
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(name, report);
  }
  for (const name of ["environment-street", "environment-coast"]) {
    const report = await page.evaluate(async (name) => {
      const api = window.cityjump;
      const scene = api._scene;
      const slider = document.getElementById("sun-hour");
      slider.value = "14";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      if (name === "environment-coast") {
        const rocks = scene.getMeshByName("coastal_rocks");
        const point = rocks.thinInstanceGetWorldMatrices().map((matrix) => matrix.getTranslation()).find((point) => point.x > 0 && point.z > 0);
        if (!point) throw new Error("no coastal rocks in the demo");
        scene.activeCamera.target.copyFrom(point);
        api.camera(220, 0.9, -Math.PI / 3);
      } else {
        const point = api.buildingPoint(0, 0);
        scene.activeCamera.target.set(point.x, point.y + 8, point.z);
        api.camera(150, 1.05, -Math.PI / 3);
      }
      await scene.whenReadyAsync();
      await api.measureFps(1000);
      return {
        rocks: scene.getMeshByName("coastal_rocks").thinInstanceCount,
        wind: scene.materials.filter((material) => material.pluginManager?.getPlugin("treeWind")).length,
        signs: scene.materials.filter((material) => material.pluginManager?.getPlugin("signGlow")).length,
        chimneys: scene.getMeshByName("roofprop_chimney_smoke").thinInstanceCount,
        paths: scene.getMeshByName("footdecor_path").thinInstanceCount,
        vehicleShadows: scene.meshes.filter((mesh) => mesh.name.startsWith("vehicle_contact_")).length,
      };
    }, name);
    for (const count of Object.values(report)) assert.ok(count > 0, JSON.stringify(report));
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(name, report);
  }
  await page.evaluate(async () => {
    const api = window.cityjump;
    const scene = api._scene;
    const { createKaijuRenderer } = await import("/src/render/kaiju.ts");
    const { createDestructionEffects } = await import("/src/render/destructionEffects.ts");
    const shadows = scene.lights.map((light) => light.getShadowGenerator?.()).find(Boolean);
    const node = api._graph.allNodes().sort((a, b) => Math.hypot(a.pos.x, a.pos.z) - Math.hypot(b.pos.x, b.pos.z))[0];
    const position = { ...node.pos };
    const kaiju = createKaijuRenderer(scene, shadows);
    const effects = createDestructionEffects(scene, () => position.y);
    scene.activeCamera.target.set(position.x, position.y + 45, position.z);
    api.camera(240, 1.15, 0.8);
    scene.render(); // Let distance detail follow the new camera before freezing the page.
    scene.onBeforeRenderObservable.clear(); // Fixed inspection poses, as in kaiju-shot.mjs.
    kaiju.show(position, Math.PI / 2, 0.25, "walking");
    const { createRubbleRenderer } = await import("/src/render/rubble.ts");
    const ruins = createRubbleRenderer(scene, (x, z) => scene.getMeshByName("ground").intersects({ origin: { x, y: 1000, z }, direction: { x: 0, y: -1, z: 0 } }).pickedPoint.y);
    const cells = [0, 1].flatMap((x) => [0, 1].map((z) => ({ corners: [
      { x: position.x + 38 + x * 8, y: position.y, z: position.z + 28 + z * 8 },
      { x: position.x + 46 + x * 8, y: position.y, z: position.z + 28 + z * 8 },
      { x: position.x + 46 + x * 8, y: position.y, z: position.z + 36 + z * 8 },
      { x: position.x + 38 + x * 8, y: position.y, z: position.z + 36 + z * 8 },
    ] })));
    const rubble = cells.map((cell) => [cell.corners[0].x + 4, cell.corners[0].z + 4]);
    ruins.rebuild(rubble, [{ kind: "residential", rotationY: 0, cells }]);
    window.polishAttack = { kaiju, effects, position, ruins };
  });
  await page.waitForFunction(() => window.cityjump._scene.materials.filter((m) => m.name === "kaiju_dorsal_fissures").length >= 2);
  for (const [name, seconds, attackSeconds] of [["footsteps", 0.65, 0], ["windup", 2.75, 2.75], ["rubble", 5.1, 0]]) {
    const report = await page.evaluate(({ name, seconds, attackSeconds }) => {
      const { kaiju, effects, position } = window.polishAttack;
      kaiju.show(position, Math.PI / 2, seconds, attackSeconds ? "attacking" : "walking", attackSeconds);
      if (name === "rubble") effects.rebuildFires([[position.x - 40, position.z + 10], [position.x - 55, position.z - 5]], seconds);
      window.cityjump._scene.render();
      const scene = window.cityjump._scene;
      return {
        heat: scene.materials.filter((m) => m.name === "kaiju_dorsal_fissures").at(-1).emissiveColor.g,
        dust: scene.meshes.filter((m) => m.name === "kaiju_footstep_dust").at(-1).thinInstanceCount,
        smoke: scene.meshes.filter((m) => m.name === "rubble_smoke").at(-1).thinInstanceCount,
        activeSmoke: scene.getActiveMeshes().data.filter((m) => m?.name === "rubble_smoke").length,
      };
    }, { name, seconds, attackSeconds });
    if (name === "windup") assert.ok(report.heat > 1.5);
    if (name === "footsteps") assert.ok(report.dust > 0);
    if (name === "rubble") {
      assert.equal(report.smoke, 6);
      assert.ok(report.activeSmoke > 0);
    }
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(name, report);
  }
  for (const [name, age, hour, radius] of [["flash", 0.04, 23, 240], ["fireball", 0.35, 23, 240], ["impact-far", 0.7, 14, 1000], ["smoke-far", 2.3, 14, 1000], ["smoke-close", 1.5, 14, 240], ["flames", 4, 23, 240]]) {
    const report = await page.evaluate(async ({ age, hour, radius }) => {
      const { effects, position } = window.polishAttack;
      const api = window.cityjump;
      const slider = document.getElementById("sun-hour");
      slider.value = String(hour);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      api.camera(radius, 1.05, 0.8);
      effects.setEnabled({ fire: true, explosion: false }, 10);
      effects.setEnabled({ fire: true, explosion: true }, 10);
      const impact = { ...position, x: position.x + 45, z: position.z + 35 };
      effects.rebuildFires([[impact.x, impact.z]], 10);
      effects.explode(impact, 10);
      effects.step(10 + age);
      window.polishAttack.kaiju.show({ ...position, x: position.x - 55 }, Math.PI / 2, 10 + age, "walking");
      api._scene.render();
      await api._scene.whenReadyAsync();
      api._scene.render();
      return {
        blast: api._scene.meshes.filter((mesh) => mesh.name === "rubble_blast").at(-1).thinInstanceCount,
        glow: api._scene.lights.filter((light) => light.name === "destruction_glow").at(-1).intensity,
      };
    }, { age, hour, radius });
    if (age < 3.2) assert.equal(report.blast, 15);
    else assert.equal(report.blast, 0);
    assert.ok(report.glow > 0);
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(name, report);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${out}/attack-mobile.png` });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(async () => {
    const api = window.cityjump;
    const scene = api._scene;
    const ruin = scene.meshes.filter((mesh) => mesh.name === "rubble").at(-1);
    const scorch = scene.meshes.filter((mesh) => mesh.name === "rubble_scorch").at(-1);
    // Isolate the fixture to inspect walls and slabs otherwise obscured by the demo city.
    for (const mesh of scene.meshes) mesh.setEnabled(mesh.name === "ground" || mesh === ruin || mesh === scorch);
    scene.activeCamera.target.copyFrom(ruin.thinInstanceGetWorldMatrices()[0].getTranslation());
    api.camera(55, 0.85, 0.8);
    const slider = document.getElementById("sun-hour");
    slider.value = "14";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    await scene.whenReadyAsync();
    scene.render();
  });
  await page.screenshot({ path: `${out}/ruin-detail.png` });
  await page.evaluate(() => {
    window.polishAttack.kaiju.dispose();
    window.polishAttack.effects.dispose();
    window.polishAttack.ruins.dispose();
  });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
