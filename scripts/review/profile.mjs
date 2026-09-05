// Preserved review workload; see docs/performance.md before comparing results.
import { fixturePath, launchOptions, output, url } from "./config.mjs";
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const raw = readFileSync(fixturePath, "utf8");
const fixture = JSON.parse(raw);
const controlled = structuredClone(fixture);
controlled.run.rules.kaijuSpawns = false;
const browser = await chromium.launch(launchOptions);
const report = {
	fixtureSha256: createHash("sha256").update(raw).digest("hex"),
	at: new Date().toISOString(),
	viewport: { width: 1280, height: 800 },
	scenario:
		"Saved camera, reload before each sample, waves disabled, otherwise original resources and rules",
	samples: [],
};
try {
	const page = await browser.newPage({ viewport: report.viewport });
	page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
	await page.addInitScript((save) => {
		localStorage.clear();
		localStorage.setItem("cityjump.autosave", JSON.stringify(save));
	}, controlled);
	const setup = async (mode) => {
		await page.goto(url);
		await page.waitForFunction(
			() =>
				window.cityjump?.stats().models === 28 &&
				window.cityjump.stats().buildings > 1000,
		);
		await page.locator("#toolbar-toggle").click();
		await page.selectOption("#frame-cap", "0");
		await page.locator("#sun-hour").evaluate(
			(el, hour) => {
				el.value = String(hour);
				el.dispatchEvent(new Event("input", { bubbles: true }));
			},
			mode.night ? 22 : 10,
		);
		if (mode.off) await page.locator(`#${mode.off}`).uncheck();
		await page.evaluate((mode) => {
			const a = window.cityjump;
			if (mode.radius) a.camera(mode.radius, Math.PI / 3);
			a.setTimeRate(mode.paused ? 0 : 1);
		}, mode);
		await page.waitForTimeout(1800);
	};
	const measure = async (ms, moving = false) =>
		page.evaluate(
			async ({ ms, moving }) => {
				const scene = window.cityjump._scene;
				const engine = scene.getEngine();
				const gl = engine._gl;
				const ext = gl.getExtension("WEBGL_debug_renderer_info");
				const renderer = ext
					? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
					: gl.getParameter(gl.RENDERER);
				const stats = () => {
					const s = window.cityjump.stats();
					return {
						buildings: s.buildings,
						population: s.population,
						states: s.buildingStates,
						cars: s.cars,
						pedestrians: s.pedestrians,
						lights: s.realStreetlights,
						hour: s.simHour,
						rate: s.timeRate,
						wave: s.wave,
						rubble: s.rubble,
						activeMeshes: s.activeMeshes,
						totalMeshes: scene.meshes.length,
					};
				};
				const before = stats();
				const cpu = [],
					intervals = [],
					longTasks = [];
				const original = scene.render;
				let last = performance.now();
				scene.render = function (...args) {
					const start = performance.now();
					intervals.push(start - last);
					last = start;
					if (moving) scene.activeCamera.alpha += 0.003;
					try {
						return original.apply(this, args);
					} finally {
						cpu.push(performance.now() - start);
					}
				};
				const observer = new PerformanceObserver((list) =>
					longTasks.push(...list.getEntries().map((e) => e.duration)),
				);
				observer.observe({ type: "longtask" });
				const start = performance.now();
				await new Promise((resolve) => setTimeout(resolve, ms));
				const elapsed = performance.now() - start;
				scene.render = original;
				observer.disconnect();
				const summary = (values) => {
					const a = [...values].sort((a, b) => a - b);
					const pct = (p) =>
						a[Math.min(a.length - 1, Math.floor(a.length * p))] ?? 0;
					return {
						mean: values.reduce((a, b) => a + b, 0) / Math.max(1, a.length),
						p50: pct(0.5),
						p95: pct(0.95),
						p99: pct(0.99),
						max: pct(1),
					};
				};
				return {
					renderer,
					elapsed,
					frames: cpu.length,
					fps: (cpu.length * 1000) / elapsed,
					cpuMs: summary(cpu),
					frameMs: summary(intervals.slice(1)),
					longTasks,
					before,
					after: stats(),
					camera: window.cityjump.cameraState(),
					vehicle: window.cityjump.vehiclePoint(),
				};
			},
			{ ms, moving },
		);
	const modes = [
		{ name: "day-paused", paused: true },
		{ name: "day-running" },
		{ name: "day-no-traffic", off: "show-traffic" },
		{ name: "night-running", night: true },
		{ name: "night-no-lights", night: true, off: "show-lights" },
		{ name: "night-no-shadows", night: true, off: "show-shadows" },
		{ name: "night-no-buildings", night: true, off: "show-buildings" },
		{ name: "night-no-bloom", night: true, off: "fx-bloom" },
		{ name: "day-moving-camera", moving: true },
	];
	for (let round = 0; round < 3; round++) {
		for (const mode of round % 2 ? [...modes].reverse() : modes) {
			await setup(mode);
			const sample = {
				round,
				mode: mode.name,
				...(await measure(3500, mode.moving)),
			};
			report.samples.push(sample);
			writeFileSync(
				output("large-profile.json"),
				JSON.stringify(report, null, 2),
			);
			console.log(
				JSON.stringify({
					round,
					mode: mode.name,
					renderer: sample.renderer,
					fps: Math.round(sample.fps),
					cpu: sample.cpuMs,
					frame: sample.frameMs,
					longTasks: sample.longTasks.length,
					buildings: sample.before.buildings,
					lights: sample.before.lights,
				}),
			);
		}
	}
	await setup({ name: "cpu-profile" });
	const cdp = await page.context().newCDPSession(page);
	await cdp.send("Profiler.enable");
	await cdp.send("Profiler.setSamplingInterval", { interval: 500 });
	await cdp.send("Profiler.start");
	await page.waitForTimeout(8000);
	const { profile } = await cdp.send("Profiler.stop");
	writeFileSync(output("large.cpuprofile"), JSON.stringify(profile));
	const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
	const counts = new Map();
	for (let i = 0; i < profile.samples.length; i++)
		counts.set(
			profile.samples[i],
			(counts.get(profile.samples[i]) ?? 0) + (profile.timeDeltas[i] ?? 500),
		);
	report.cpuProfileTop = [...counts]
		.map(([id, us]) => ({ us, ...nodes.get(id).callFrame }))
		.sort((a, b) => b.us - a.us)
		.slice(0, 40);
	console.log("CPU TOP", JSON.stringify(report.cpuProfileTop.slice(0, 20)));
	await setup({ name: "rebuild", paused: true });
	report.rebuilds = await page.evaluate(() => {
		const out = [];
		for (let round = 0; round < 3; round++)
			for (const dirty of [
				undefined,
				{ minX: -1200, maxX: -1000, minZ: -400, maxZ: -200 },
			]) {
				const timings = {};
				const start = performance.now();
				window.cityjump.rebuild(dirty, timings);
				out.push({
					round,
					dirty: !!dirty,
					ms: performance.now() - start,
					timings,
				});
			}
		return out;
	});
	console.log("REBUILDS", JSON.stringify(report.rebuilds));
	writeFileSync(output("large-profile.json"), JSON.stringify(report, null, 2));
} finally {
	await browser.close();
}
