// Inspect the shipped lots after the game's material and handedness conversion.
// node scripts/with-dev-server.mjs scripts/buildings-shot.mjs /tmp/city-jump-buildings
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const [url = "http://127.0.0.1:5173", out = "/tmp/city-jump-buildings", family = "lots"] =
	process.argv.slice(2);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
	args: ["--use-gl=angle", "--enable-unsafe-swiftshader"],
});
try {
	const page = await browser.newPage({
		viewport: { width: 1200, height: 900 },
	});
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});
	await page.goto(url);
	await page.waitForFunction(
		() => window.cityjump?._scene.getMeshByName("building_lot_4x4"),
		null,
		{ timeout: 60000 },
	);
	if (family === "urban") {
    await page.waitForFunction(() => window.cityjump.stats().models === 107, null, { timeout: 60000 });
    await page.evaluate(() => {
      const api = window.cityjump;
      api.demoCity();
      api.setRunRules({ kaijuSpawns: false });
      api.zone(0, 0, 1400, "residential");
      api.zone(0, 0, 240, "commercial");
      api.growCity(40000, 40000);
      api.growCity(40060, 40000);
      api.setPaused(true);
      api._scene.activeCamera.target.set(0, 25, 0);
    });
    const counts = await page.evaluate(() => Object.fromEntries(window.cityjump._scene.meshes
      .filter((mesh) => /^building_(residential|commercial)_/.test(mesh.name) && mesh.thinInstanceCount > 0)
      .map((mesh) => [mesh.name, mesh.thinInstanceCount])));
    assert.ok(Object.keys(counts).some((id) => id.startsWith("building_residential_")));
    assert.ok(Object.keys(counts).some((id) => id.startsWith("building_commercial_")));
    assert.ok(Object.keys(counts).some((id) => id.includes("_tower")), JSON.stringify(counts));
    for (const [view, width, height, radius] of [["district", 1440, 1000, 650], ["distant", 1440, 1000, 1300], ["mobile", 390, 844, 800]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate((r) => window.cityjump.camera(r, 1.05, -Math.PI/3), radius);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/urban-${view}.png` });
    }
    console.log("urban neighbourhood", counts);
    await page.setViewportSize({ width: 1200, height: 900 });
  }
  if (family === "industrial-small") {
    await page.waitForFunction(() => window.cityjump.stats().models === 107, null, { timeout: 60000 });
    await page.evaluate(() => {
      const api = window.cityjump;
      api.demoCity();
      api.setRunRules({ kaijuSpawns: false });
      api.zone(0, 0, 1400, "industrial");
      api.growCity(40000, 40000);
      api.growCity(40060, 40000);
      api.setPaused(true);
      api._scene.activeCamera.target.set(0, 5, 0);
      api.camera(450, 1.05, -Math.PI/3);
    });
    const counts = await page.evaluate(() => ["a", "b", "c"].map((v) => window.cityjump._scene.getMeshByName(`building_industrial_1x1_${v}`).thinInstanceCount));
    assert.ok(counts.every((count) => count > 0), `small industrial instances: ${counts}`);
    console.log("industrial 1x1 in city", counts);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/industrial-small-district.png` });
  }
  await page.evaluate(() => {
		window.cityjump.setPaused(true);
		for (const mesh of window.cityjump._scene.meshes) mesh.setEnabled(false);
	});
	for (const id of (family === "industrial-small" ? ["industrial_1x1_a", "industrial_1x1_b", "industrial_1x1_c"] : family === "urban" ? ["residential_1x1_a", "residential_3x3_a", "residential_3x3_b", "commercial_3x4_a", "commercial_3x4_b", ...["residential_3x3", "residential_4x4", "commercial_3x4", "commercial_4x3"].flatMap((id) => ["tower", "tower_steps", "tower_offset"].map((variant) => `${id}_${variant}`))] : ["industrial", "farm"].includes(family) ? [1, 2, 3, 4].map((width) => `${family}_${width}x4`) : ["lot_1x1", "lot_2x2", "lot_3x4", "lot_4x4"])) {
		await page.waitForFunction(
			(model) => window.cityjump._scene.getMeshByName(`building_${model}`),
			id,
		);
		const report = await page.evaluate(async (model) => {
			const scene = window.cityjump._scene;
			for (const mesh of scene.meshes) mesh.setEnabled(false);
			const mesh = scene.getMeshByName(`building_${model}`);
			mesh.thinInstanceSetBuffer(
				"matrix",
				new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
				16,
			);
			mesh.thinInstanceSetBuffer("color", new Float32Array([1, 1, 1, 1]), 4);
			mesh.setEnabled(true);
			mesh.refreshBoundingInfo();
			const box = mesh.getBoundingInfo().boundingBox;
			const camera = scene.activeCamera;
			camera.target.copyFrom(box.centerWorld);
			camera.lowerRadiusLimit = 5;
			camera.radius = Math.max(24, box.extendSizeWorld.length() * 3.5);
			camera.alpha = Math.PI / 3;
			camera.beta = 1.05;
			await scene.whenReadyAsync();
			for (const other of scene.meshes) other.setEnabled(other === mesh);
			scene.render();
			return {
				vertices: mesh.getTotalVertices(),
				submeshes: mesh.subMeshes.length,
				ready: mesh.isReady(true),
			};
		}, id);
		assert.ok(
			report.ready && report.vertices > 0 && report.submeshes >= 3,
			JSON.stringify(report),
		);
		await page.screenshot({ path: `${out}/${id}.png` });
		console.log(id, report);
	}
	assert.deepEqual(errors, []);
} finally {
	await browser.close();
}
