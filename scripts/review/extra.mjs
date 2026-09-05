// Preserved review workload; see docs/performance.md before comparing results.
import {
	fixturePath,
	launchOptions,
	output,
	url,
	previewUrl,
} from "./config.mjs";
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const save = JSON.parse(readFileSync(fixturePath, "utf8"));
save.run.rules.kaijuSpawns = false;
const report = {
	at: new Date().toISOString(),
	memory: [],
	picking: [],
	display: [],
	loading: [],
	uploads: [],
};
const record = (kind, value) => {
	report[kind].push(value);
	writeFileSync(output("review-extra.json"), JSON.stringify(report, null, 2));
	console.log(kind, JSON.stringify(value));
};
const browser = await chromium.launch(launchOptions);
const init = async (page) => {
	await page.addInitScript((save) => {
		localStorage.clear();
		const raw = JSON.stringify(save);
		localStorage.setItem("cityjump.autosave", raw);
		localStorage.setItem("cityjump.save.Review", raw);
		localStorage.setItem("cityjump.saves", '["Review"]');
	}, save);
	page.on("dialog", (d) => d.accept("Review"));
};
const open = async (page, address = url) => {
	await page.goto(address);
	await page.waitForFunction(
		() =>
			window.cityjump?.stats().models === 28 &&
			window.cityjump.stats().buildings === 1287,
	);
};
const uncap = async (page) => {
	await page.locator("#toolbar-toggle").click();
	await page.selectOption("#frame-cap", "0");
	await page.locator("#toolbar-toggle").click();
};
const measure = (page) =>
	page.evaluate(async () => {
		const s = window.cityjump._scene,
			t = performance.now(),
			frames = [];
		let last = t;
		const o = s.onAfterRenderObservable.add(() => {
			const n = performance.now();
			frames.push(n - last);
			last = n;
		});
		await new Promise((r) => setTimeout(r, 3500));
		s.onAfterRenderObservable.remove(o);
		const elapsed = performance.now() - t;
		const a = frames.slice(1).sort((a, b) => a - b);
		return {
			fps: (frames.length * 1000) / elapsed,
			p95: a[Math.floor(a.length * 0.95)],
			max: a.at(-1),
			frames: frames.length,
			elapsed,
			canvas: [s.getEngine().getRenderWidth(), s.getEngine().getRenderHeight()],
			radius: s.activeCamera.radius,
		};
	});
try {
	const page = await browser.newPage({
		viewport: { width: 1280, height: 800 },
	});
	await init(page);
	await open(page);
	await uncap(page);
	const cdp = await page.context().newCDPSession(page);
	const memory = async (name) => {
		await cdp.send("HeapProfiler.collectGarbage");
		const heap = await cdp.send("Runtime.getHeapUsage");
		const counts = await page.evaluate(() => {
			const s = window.cityjump._scene;
			return {
				meshes: s.meshes.length,
				materials: s.materials.length,
				geometries: s.geometries.length,
				textures: s.textures.length,
				internalTextures: s.getEngine().getLoadedTexturesCache().length,
				observers: s.onBeforeRenderObservable.observers.length,
				buildings: window.cityjump.stats().buildings,
				segments: window.cityjump.stats().segments,
			};
		});
		assert.equal(counts.buildings, 1287);
		record("memory", { name, heap: heap.usedSize, ...counts });
	};
	await memory("baseline");
	await page.locator("#toolbar-toggle").click();
	await page.selectOption("#save-slot", "Review");
	for (let i = 0; i < 10; i++) {
		await page.locator("#save-load").click();
		await page.waitForTimeout(500);
		if ([0, 4, 9].includes(i)) await memory(`load-${i + 1}`);
	}
	await page.locator("#toolbar-toggle").click();
	for (let round = 0; round < 2; round++) {
		await open(page);
		await uncap(page);
		await page.evaluate(() => window.cityjump.setTimeRate(1));
		await page.locator('[data-tool="roads"]').click();
		await page.mouse.click(620, 390);
		await page.mouse.move(720, 390);
		await page.evaluate(() => {
			const s = window.cityjump._scene,
				g = s.getMeshByName("ground");
			window.pickReport = {
				times: [],
				vertices: g.getTotalVertices(),
				triangles: g.getTotalIndices() / 3,
				subMeshes: g.subMeshes.length,
			};
			const original = s.pick;
			s.pick = function (...args) {
				const t = performance.now();
				try {
					return original.apply(this, args);
				} finally {
					window.pickReport.times.push(performance.now() - t);
				}
			};
		});
		const frames = measure(page);
		for (let i = 0; i < 100; i++) {
			await page.mouse.move(
				620 + Math.sin(i * 0.18) * 260,
				390 + Math.cos(i * 0.13) * 130,
			);
			await page.waitForTimeout(15);
		}
		const frame = await frames;
		const pick = await page.evaluate(() => {
			const { times, ...r } = window.pickReport;
			times.sort((a, b) => a - b);
			return {
				...r,
				count: times.length,
				mean: times.reduce((a, b) => a + b, 0) / times.length,
				p95: times[Math.floor(times.length * 0.95)],
			};
		});
		record("picking", { round, frame, pick });
	}
	for (const rate of [1, 4]) {
		await open(page);
		await uncap(page);
		await page.evaluate((rate) => {
			window.cityjump.setTimeRate(rate);
			const r = { uploads: {}, saves: [] };
			window.uploadReview = r;
			let p = window.cityjump._scene.meshes.find(
				(m) => m.thinInstanceSetBuffer,
			);
			while (!Object.hasOwn(p, "thinInstanceSetBuffer"))
				p = Object.getPrototypeOf(p);
			const original = p.thinInstanceSetBuffer;
			p.thinInstanceSetBuffer = function (kind, data, ...args) {
				r.uploads[this.name] ??= { calls: 0, bytes: 0, ms: 0 };
				const row = r.uploads[this.name];
				const t = performance.now();
				try {
					return original.call(this, kind, data, ...args);
				} finally {
					row.calls++;
					row.bytes += data?.byteLength ?? 0;
					row.ms += performance.now() - t;
				}
			};
			const set = Storage.prototype.setItem;
			Storage.prototype.setItem = function (k, v) {
				const t = performance.now();
				try {
					return set.call(this, k, v);
				} finally {
					r.saves.push({ key: k, bytes: v.length, ms: performance.now() - t });
				}
			};
		}, rate);
		await page.waitForTimeout(12000);
		record("uploads", {
			rate,
			...(await page.evaluate(() => window.uploadReview)),
		});
	}
	await page.close();
	for (let round = 0; round < 2; round++)
		for (const config of [
			{
				name: "standard-saved",
				width: 1280,
				height: 800,
				dpr: 1,
				radius: null,
			},
			{
				name: "standard-street",
				width: 1280,
				height: 800,
				dpr: 1,
				radius: 140,
			},
			{
				name: "standard-overview",
				width: 1280,
				height: 800,
				dpr: 1,
				radius: 1200,
			},
			{ name: "retina-saved", width: 1920, height: 1080, dpr: 2, radius: null },
		]) {
			const p = await browser.newPage({
				viewport: { width: config.width, height: config.height },
				deviceScaleFactor: config.dpr,
			});
			await init(p);
			await open(p);
			await uncap(p);
			await p.evaluate((radius) => {
				window.cityjump.setTimeRate(1);
				if (radius) window.cityjump._scene.activeCamera.radius = radius;
			}, config.radius);
			await p.waitForTimeout(1800);
			record("display", { round, ...config, ...(await measure(p)) });
			if (round === 0)
				await p.screenshot({ path: output(`${config.name}.png`) });
			await p.close();
		}
	if (!previewUrl) {
		report.loadingSkipped =
			"Pass --preview-url for production startup measurements";
		writeFileSync(output("review-extra.json"), JSON.stringify(report, null, 2));
	}
	for (const mode of previewUrl
		? ["cold", "cold", "warm", "throttled-cold"]
		: []) {
		const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
		await init(p);
		await p.addInitScript(() => {
			const original = HTMLCanvasElement.prototype.getContext;
			HTMLCanvasElement.prototype.getContext = function (...args) {
				const c = original.apply(this, args);
				if (c && args[0].startsWith("webgl") && !c.__review) {
					c.__review = true;
					for (const key of [
						"drawElements",
						"drawArrays",
						"drawElementsInstanced",
						"drawArraysInstanced",
					]) {
						const draw = c[key];
						if (draw)
							c[key] = function (...a) {
								window.firstDraw ??= performance.now();
								return draw.apply(this, a);
							};
					}
				}
				return c;
			};
		});
		const session = await p.context().newCDPSession(p);
		await session.send("Network.enable");
		if (mode !== "warm") await session.send("Network.clearBrowserCache");
		if (mode === "throttled-cold") {
			await session.send("Network.emulateNetworkConditions", {
				offline: false,
				latency: 40,
				downloadThroughput: 1250000,
				uploadThroughput: 1250000,
			});
			await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
		}
		if (mode === "warm") await open(p, previewUrl);
		const t = performance.now();
		await open(p, previewUrl);
		record("loading", {
			mode,
			readyWallMs: performance.now() - t,
			...(await p.evaluate(() => {
				const r = performance.getEntriesByType("resource");
				return {
					firstDrawMs: window.firstDraw,
					now: performance.now(),
					navigation: performance.getEntriesByType("navigation")[0].toJSON(),
					resources: r.map((x) => ({
						name: x.name.split("/").pop(),
						duration: x.duration,
						transfer: x.transferSize,
						encoded: x.encodedBodySize,
						type: x.initiatorType,
					})),
					buildings: window.cityjump.stats().buildings,
					models: window.cityjump.stats().models,
				};
			})),
		});
		await p.close();
	}
} finally {
	await browser.close();
}
