// Run with scripts/with-dev-server.mjs; checks the shipped terrain mesh against road surfaces.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const [url = "http://127.0.0.1:5173", out = "/tmp/city-jump-terrain"] =
	process.argv.slice(2);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
	args: ["--use-gl=angle", "--enable-unsafe-swiftshader"],
});
try {
	const page = await browser.newPage({
		viewport: { width: 1440, height: 1000 },
	});
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto(url);
	await page.waitForFunction(
		() => window.cityjump?.stats().models === 107,
		null,
		{ timeout: 60000 },
	);
	await page.evaluate(() => {
		const api = window.cityjump;
		api.demoCity();
		api.setRunRules({ kaijuSpawns: false });
		api.zone(0, 0, 1400, "residential");
		api.zone(0, 0, 240, "commercial");
		api.growCity(40000, 40000);
		api.growCity(40060, 40000);
		api.setPaused(true);
	});
	const inspect = async () => {
		const { pickHeightmap } = await import("/src/render/terrainPick.ts");
		const scene = window.cityjump._scene;
		const points = scene.getMeshByName("ground").getVerticesData("position");
		const count = Math.round(Math.sqrt(points.length / 3));
		const ground = {
			count,
			cell: points[3] - points[0],
			worldX: (i) => points[i * 3],
			worldZ: (i) => points[i * count * 3 + 2],
			at: (x, z) => points[(z * count + x) * 3 + 1],
		};
		const failures = [];
		let probes = 0;
		let worst = { excess: -Infinity };
		for (const mesh of scene.meshes.filter((m) =>
			/^(road|sidewalk(?:_corner)?|junction|roundabout(?:_gap|_walk|_corner)?)_\d+(?:_\d+)*(?:_-1)?$/.test(m.name),
		)) {
			const pos = mesh.getVerticesData("position"),
				norm = mesh.getVerticesData("normal"),
				indices = mesh.getIndices();
			for (let i = 0; i < indices.length; i += 3) {
				const ids = Array.from(indices.slice(i, i + 3));
				if (ids.some((j) => norm[j * 3 + 1] < 0.5)) continue;
				const p = { x: 0, y: 0, z: 0 };
				for (const j of ids) {
					p.x += pos[j * 3] / 3;
					p.y += pos[j * 3 + 1] / 3;
					p.z += pos[j * 3 + 2] / 3;
				}
				const hit = pickHeightmap(ground, {
					origin: { x: p.x, y: 1000, z: p.z },
					direction: { x: 0, y: -1, z: 0 },
				});
				if (!hit) continue;
				const excess = hit.y - p.y;
				probes++;
				if (excess > worst.excess) worst = { excess, ...p, mesh: mesh.name };
				if (excess > 0.01) failures.push({ excess, ...p, mesh: mesh.name });
			}
		}
		// A fixed sloping central street keeps before/after captures comparable.
		scene.activeCamera.target.set(300, 110, -10);
		window.cityjump.camera(190, 1.02, -Math.PI / 2);
		return {
			probes,
			worst,
			failures: failures.sort((a, b) => b.excess - a.excess).slice(0, 10),
			count: failures.length,
		};
	};
	const report = await page.evaluate(inspect);
	console.log(JSON.stringify(report, null, 2));
	for (const [name, view, hour] of [
		["day", "all", 14],
		["night", "all", 22],
		["zones", "no-buildings", 14],
	]) {
		await page.locator(`input[name="select-view"][value="${view}"]`).check();
		await page.evaluate((hour) => {
			const input = document.getElementById("sun-hour");
			input.value = String(hour);
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}, hour);
		await page.waitForTimeout(600);
		await page.screenshot({ path: `${out}/${name}.png` });
	}
	assert.ok(report.probes > 1000);
	assert.equal(report.count, 0, JSON.stringify(report.worst));
	const beforeReload = await page.evaluate(() => window.cityjump.stats());
	// The final sun edit restarts the autosave debounce; screenshots alone need not outlast it.
	await page.waitForFunction((population) => {
		const saved = JSON.parse(localStorage.getItem("cityjump.autosave") ?? "null");
		return saved?.resources.population === population && saved?.hour === 14;
	}, beforeReload.population, { timeout: 20000 });
	await page.reload();
	await page.waitForFunction(
		() => window.cityjump?.stats().models === 107,
		null,
		{ timeout: 60000 },
	);
	const restored = await page.evaluate(inspect);
	const afterReload = await page.evaluate(() => window.cityjump.stats());
	// Demo omits the offshore scenery bridge; startup adds that one segment on reload.
	assert.equal(afterReload.segments, beforeReload.segments + 1);
	assert.equal(afterReload.population, beforeReload.population);
	console.log("reloaded", JSON.stringify(restored));
	assert.ok(restored.probes > 1000);
	assert.equal(restored.count, 0, JSON.stringify(restored.worst));
	assert.deepEqual(errors, []);
} finally {
	await browser.close();
}
