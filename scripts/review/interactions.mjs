// Preserved review workload; see docs/performance.md before comparing results.
import { fixturePath, launchOptions, output, url } from "./config.mjs";
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const save = JSON.parse(readFileSync(fixturePath, "utf8"));
save.run.rules.kaijuSpawns = false;
const browser = await chromium.launch(launchOptions);
const report = {
	at: new Date().toISOString(),
	interactions: [],
	memory: [],
	speed: [],
};
const record = () =>
	writeFileSync(
		output("review-completion.json"),
		JSON.stringify(report, null, 2),
	);
try {
	const page = await browser.newPage({
		viewport: { width: 1280, height: 800 },
	});
	page.on("dialog", (dialog) => dialog.accept("Review"));
	page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
	await page.addInitScript((save) => {
		localStorage.clear();
		const raw = JSON.stringify(save);
		localStorage.setItem("cityjump.autosave", raw);
		localStorage.setItem("cityjump.save.Review", raw);
		localStorage.setItem("cityjump.saves", '["Review"]');
	}, save);
	const open = async () => {
		await page.goto(url);
		await page.waitForFunction(
			() =>
				window.cityjump?.stats().models === 28 &&
				window.cityjump.stats().buildings > 1000,
		);
		await page.locator("#toolbar-toggle").click();
		await page.selectOption("#frame-cap", "0");
		await page.locator("#toolbar-toggle").click();
		await page.waitForTimeout(1200);
	};
	const start = () =>
		page.evaluate(() => {
			const scene = window.cityjump._scene;
			const r = {
				started: performance.now(),
				frames: [],
				pickMs: [],
				pointerMs: [],
				longTasks: [],
			};
			window.review = r;
			let last = performance.now();
			r.observer = scene.onAfterRenderObservable.add(() => {
				const now = performance.now();
				r.frames.push(now - last);
				last = now;
			});
			r.po = new PerformanceObserver((list) =>
				r.longTasks.push(
					...list
						.getEntries()
						.map((e) => ({ time: e.startTime - r.started, ms: e.duration })),
				),
			);
			r.po.observe({ type: "longtask" });
			const pick = scene.pick;
			r.originalPick = pick;
			scene.pick = function (...args) {
				const t = performance.now();
				try {
					return pick.apply(this, args);
				} finally {
					r.pickMs.push(performance.now() - t);
				}
			};
			r.pointerObservers = [];
			for (const o of scene.onPointerObservable.observers) {
				const original = o.callback;
				r.pointerObservers.push({ o, original });
				o.callback = function (...args) {
					const t = performance.now();
					try {
						return original.apply(this, args);
					} finally {
						r.pointerMs.push(performance.now() - t);
					}
				};
			}
		});
	const stop = () =>
		page.evaluate(() => {
			const r = window.review,
				scene = window.cityjump._scene;
			scene.onAfterRenderObservable.remove(r.observer);
			scene.pick = r.originalPick;
			r.po.disconnect();
			for (const { o, original } of r.pointerObservers) o.callback = original;
			const summary = (values) => {
				const a = values.slice().sort((a, b) => a - b);
				return {
					count: a.length,
					mean: values.reduce((a, b) => a + b, 0) / Math.max(1, a.length),
					p95: a[Math.floor(a.length * 0.95)] ?? 0,
					max: a.at(-1) ?? 0,
				};
			};
			const elapsed = performance.now() - r.started,
				s = window.cityjump.stats();
			return {
				elapsed,
				fps: (r.frames.length * 1000) / elapsed,
				frame: summary(r.frames.slice(1)),
				picking: summary(r.pickMs),
				pointer: summary(r.pointerMs),
				longTasks: r.longTasks,
				stats: {
					buildings: s.buildings,
					states: s.buildingStates,
					segments: s.segments,
					population: s.population,
					rate: s.timeRate,
					zones: s.zones,
				},
			};
		});
	const sample = async (name, work) => {
		await start();
		await work();
		const r = { name, ...(await stop()) };
		report.interactions.push(r);
		record();
		console.log("INTERACTION", JSON.stringify(r));
	};
	const move = async () => {
		for (let i = 0; i < 100; i++) {
			await page.mouse.move(
				620 + Math.sin(i * 0.18) * 260,
				390 + Math.cos(i * 0.13) * 130,
			);
			await page.waitForTimeout(15);
		}
	};
	await open();
	await page.evaluate(() => window.cityjump.setTimeRate(1));
	await sample("running-still", () => page.waitForTimeout(4000));
	await open();
	await page.evaluate(() => window.cityjump.setTimeRate(1));
	await sample("select-pointer", move);
	await open();
	await page.evaluate(() => window.cityjump.setTimeRate(1));
	await page.locator('[data-tool="roads"]').click();
	await page.mouse.click(620, 390);
	await page.mouse.move(720, 390);
	assert.ok(
		await page.evaluate(() =>
			window.cityjump._scene.getMeshByName("preview")?.isEnabled(),
		),
	);
	await sample("road-preview", move);
	await page.keyboard.press("Escape");
	await open();
	await page.evaluate(() => window.cityjump.setTimeRate(1));
	await page.locator('[data-tool="zones"]').click();
	await page.locator('input[name="zone-tool"][value="brush"]').check();
	await page.locator('input[name="zone-kind"][value="commercial"]').check();
	await sample("zone-pointer", move);
	await sample("zone-paint", async () => {
		for (const [x, y] of [
			[680, 350],
			[720, 400],
			[760, 450],
			[820, 390],
		]) {
			await page.mouse.click(x, y);
			await page.waitForTimeout(600);
		}
	});
	await open();
	await page.evaluate(() => {
		window.cityjump.setTimeRate(1);
		window.cityjump.selectVehicle();
	});
	await page.locator("#toolbar-toggle").click();
	await page.locator('input[name="camera-mode"][value="follow"]').check();
	await page.locator("#toolbar-toggle").click();
	await sample("vehicle-follow", () => page.waitForTimeout(4000));
	await open();
	const cdp = await page.context().newCDPSession(page);
	const memory = async (name) => {
		await cdp.send("HeapProfiler.collectGarbage");
		const heap = await cdp.send("Runtime.getHeapUsage");
		const counts = await page.evaluate(() => {
			const s = window.cityjump._scene,
				e = s.getEngine();
			return {
				meshes: s.meshes.length,
				materials: s.materials.length,
				textures: s.textures.length,
				geometries: s.geometries.length,
				lights: s.lights.length,
				beforeRender: s.onBeforeRenderObservable.observers.length,
				internalTextures: e.getLoadedTexturesCache().length,
				buildings: window.cityjump.stats().buildings,
			};
		});
		const entry = { name, usedHeap: heap.usedSize, ...counts };
		report.memory.push(entry);
		record();
		console.log("MEMORY", JSON.stringify(entry));
	};
	await memory("baseline");
	for (let i = 0; i < 10; i++) {
		await page.evaluate(() => window.cityjump.rebuild());
		await page.waitForTimeout(300);
		if (i === 0 || i === 4 || i === 9) await memory(`rebuild-${i + 1}`);
	}
	await page.locator("#toolbar-toggle").click();
	await page.selectOption("#save-slot", "Review");
	for (let i = 0; i < 10; i++) {
		await page.locator("#save-load").click();
		await page.waitForFunction(
			() => window.cityjump.stats().buildings === 1287,
		);
		await page.waitForTimeout(350);
		if (i === 0 || i === 4 || i === 9) await memory(`load-${i + 1}`);
	}
	await page.locator("#toolbar-toggle").click();
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
		await page.waitForTimeout(600);
		const n = await page.evaluate(() => window.cityjump.stats().segments);
		if (n > before) {
			report.roadCommit = { before, after: n, pair };
			break;
		}
	}
	await page.locator('[data-tool="bulldoze"]').click();
	await sample("bulldoze-pointer", move);
	await sample("bulldoze-clicks", async () => {
		for (const [x, y] of [
			[640, 350],
			[720, 400],
			[820, 350],
		]) {
			await page.mouse.click(x, y);
			await page.waitForTimeout(700);
		}
	});
	await memory("after-edits");
	await page.locator("#toolbar-toggle").click();
	await page.locator("#save-load").click();
	await page.waitForTimeout(500);
	await memory("restored-after-edits");
	for (const rate of [1, 4]) {
		await open();
		await start();
		await page.evaluate((rate) => window.cityjump.setTimeRate(rate), rate);
		await page.waitForTimeout(30000);
		const entry = { rate, ...(await stop()) };
		report.speed.push(entry);
		record();
		console.log("SPEED", JSON.stringify(entry));
	}
	await page.screenshot({ path: output("completion.png") });
} finally {
	await browser.close();
}
