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
  const angle = () => page.evaluate(() => window.cityjump._scene.getTransformNodeByName("kaiju_left_leg").rotationQuaternion.asArray());
  const before = await angle();
  await page.waitForTimeout(1100);
  assert.notDeepEqual(await angle(), before, "the complete leg must animate");
  await page.evaluate(() => window.cityjump.setPaused(true));
  for (const [name, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]]) {
    await page.setViewportSize({ width, height });
    const report = await page.evaluate(async (mobile) => {
      const scene = window.cityjump._scene;
      const root = scene.getTransformNodeByName("kaiju");
      const camera = scene.activeCamera;
      camera.target.copyFrom(root.position);
      camera.target.y += 45;
      camera.radius = mobile ? 310 : 205;
      camera.beta = 1.18;
      camera.alpha = Math.PI / 2 - root.rotationQuaternion.toEulerAngles().y - 0.65;
      camera.lowerRadiusLimit = 100;
      const meshes = root.getChildMeshes().filter((mesh) => mesh.getTotalVertices() > 0);
      await scene.whenReadyAsync();
      scene.render();
      const pixels = await scene.getEngine().readPixels(0, 0, scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight());
      const colors = new Set();
      for (let i = 0; i < pixels.length; i += 256) colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
      return { meshes: meshes.length, colors: colors.size, visible: root.isEnabled(), textures: meshes.every((mesh) => mesh.material.isReady(mesh)), parented: scene.getTransformNodeByName("kaiju_left_leg").getChildMeshes().length };
    }, name === "mobile");
    assert.ok(report.visible && report.meshes >= 20 && report.colors > 100 && report.textures && report.parented >= 2, JSON.stringify(report));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/kaiju-${name}.png` });
    console.log(name, report);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
