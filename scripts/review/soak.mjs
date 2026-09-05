// Preserved review workload; see docs/performance.md before comparing results.
import { fixturePath, launchOptions, output, url } from "./config.mjs";
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const save = JSON.parse(readFileSync(fixturePath, "utf8"));
save.run.rules.kaijuSpawns = false;
const report = { snapshots: [], edits: [] };
const record = () =>
	writeFileSync(output("review-soak.json"), JSON.stringify(report, null, 2));
const browser = await chromium.launch(launchOptions);
try {
	const page = await browser.newPage({
		viewport: { width: 1280, height: 800 },
	});
	page.on("dialog", (d) => d.accept());
	await page.addInitScript((save) => {
		localStorage.clear();
		const raw = JSON.stringify(save);
		localStorage.setItem("cityjump.autosave", raw);
		localStorage.setItem("cityjump.save.Review", raw);
		localStorage.setItem("cityjump.saves", '["Review"]');
	}, save);
	await page.goto(url);
	await page.waitForFunction(
		() =>
			window.cityjump?.stats().buildings === 1287 &&
			window.cityjump.stats().models === 28,
	);
	await page.locator("#toolbar-toggle").click();
	await page.selectOption("#frame-cap", "0");
	await page.selectOption("#save-slot", "Review");
	await page.locator("#toolbar-toggle").click();
	const cdp = await page.context().newCDPSession(page);
	const snap = async (name) => {
		await cdp.send("HeapProfiler.collectGarbage");
		const heap = await cdp.send("Runtime.getHeapUsage");
		const r = await page.evaluate(() => {
			const s = window.cityjump._scene;
			const city = JSON.parse(localStorage.getItem("cityjump.autosave"));
			return {
				meshes: s.meshes.length,
				materials: s.materials.length,
				geometries: s.geometries.length,
				textures: s.textures.length,
				internalTextures: s.getEngine().getLoadedTexturesCache().length,
				observers: s.onBeforeRenderObservable.observers.length,
				stats: window.cityjump.stats(),
				savedElapsed: city.elapsed,
				savedHour: city.hour,
				saves: window.soak?.saves ?? 0,
			};
		});
		report.snapshots.push({ name, heap: heap.usedSize, ...r });
		record();
		console.log(
			"snapshot",
			name,
			heap.usedSize,
			r.meshes,
			r.materials,
			r.saves,
			r.savedElapsed,
		);
	};
	await snap("baseline");
	for (let i = 0; i < 5; i++) {
		await page.locator('[data-tool="roads"]').click();
		const before = await page.evaluate(() => window.cityjump.stats().segments);
		for (const pair of [
			[
				[640, 350],
				[820, 350],
			],
			[
				[600, 450],
				[800, 480],
			],
			[
				[650, 260],
				[850, 260],
			],
		]) {
			await page.keyboard.press("Escape");
			await page.mouse.click(...pair[0]);
			await page.mouse.move(...pair[1]);
			await page.mouse.click(...pair[1]);
			await page.waitForTimeout(500);
			if (
				(await page.evaluate(() => window.cityjump.stats().segments)) > before
			)
				break;
		}
		const after = await page.evaluate(() => window.cityjump.stats().segments);
		await page.locator('[data-tool="bulldoze"]').click();
		await page.mouse.click(720, 350);
		await page.waitForTimeout(600);
		const deleted = await page.evaluate(() => window.cityjump.stats().segments);
		report.edits.push({ before, after, deleted });
		record();
		await page.locator("#toolbar-toggle").click();
		await page.locator("#save-load").click();
		await page.waitForTimeout(500);
		await page.locator("#toolbar-toggle").click();
		await snap(`restored-${i + 1}`);
	}
	assert.ok(
		report.edits.every((e) => e.after > e.before),
		"Actual roads must have been added",
	);
	await page.locator('[data-tool="select"]').click();
	await page.evaluate(() => {
		window.soak = { saves: 0 };
		const set = Storage.prototype.setItem;
		Storage.prototype.setItem = function (k, v) {
			if (k === "cityjump.autosave") window.soak.saves++;
			return set.call(this, k, v);
		};
		window.cityjump.setTimeRate(4);
	});
	for (let minute = 1; minute <= 3; minute++) {
		const r = await page.evaluate(async () => {
			const scene = window.cityjump._scene,
				frames = [],
				t = performance.now();
			let last = t;
			const o = scene.onAfterRenderObservable.add(() => {
				const now = performance.now();
				frames.push(now - last);
				last = now;
			});
			await new Promise((r) => setTimeout(r, 60000));
			scene.onAfterRenderObservable.remove(o);
			const elapsed = performance.now() - t;
			frames.shift();
			frames.sort((a, b) => a - b);
			return {
				elapsed,
				fps: ((frames.length + 1) * 1000) / elapsed,
				p95: frames[Math.floor(frames.length * 0.95)],
				p99: frames[Math.floor(frames.length * 0.99)],
				max: frames.at(-1),
			};
		});
		report.windows ??= [];
		report.windows.push(r);
		record();
		await snap(`minute-${minute}`);
	}
	await page.evaluate(() => window.cityjump.setTimeRate(0));
	await page.waitForTimeout(2500);
	await snap("paused-flush");
} finally {
	await browser.close();
}
