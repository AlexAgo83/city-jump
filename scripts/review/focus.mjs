// Preserved review workload; see docs/performance.md before comparing results.
import { fixturePath, launchOptions, output, url } from "./config.mjs";
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
const save = JSON.parse(readFileSync(fixturePath, "utf8"));
save.run.rules.kaijuSpawns = false;
const b = await chromium.launch(launchOptions);
const result = { at: new Date().toISOString() };
try {
	const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
	p.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
	await p.addInitScript((save) => {
		localStorage.clear();
		localStorage.setItem("cityjump.autosave", JSON.stringify(save));
	}, save);
	const setup = async () => {
		await p.goto(url);
		await p.waitForFunction(
			() =>
				window.cityjump?.stats().models === 28 &&
				window.cityjump.stats().buildings > 1000,
		);
		await p.locator("#toolbar-toggle").click();
		await p.selectOption("#frame-cap", "0");
		await p.waitForTimeout(1000);
	};
	await setup();
	await p.evaluate(async () => {
		const r = {
			callbacks: [],
			sync: { calls: 0, ms: 0, max: 0 },
			sort: { calls: 0, ms: 0 },
			uploads: {},
			hud: { calls: 0, nodes: 0 },
			frames: [],
			cpu: [],
		};
		window.probe = r;
		const { BuildingLifecycle } = await import("/src/sim/buildingLifecycle.ts");
		const originalSync = BuildingLifecycle.prototype.sync;
		BuildingLifecycle.prototype.sync = function (...args) {
			const t = performance.now();
			const out = originalSync.apply(this, args);
			r.sync.calls++;
			r.sync.ms += performance.now() - t;
			r.sync.max = Math.max(r.sync.max, performance.now() - t);
			window.probeStatuses = out;
			return out;
		};
		const sort = Array.prototype.sort;
		Array.prototype.sort = function (...args) {
			if (!this[0]?.parcel || !("demand" in this[0]))
				return sort.apply(this, args);
			const t = performance.now();
			const out = sort.apply(this, args);
			r.sort.calls++;
			r.sort.ms += performance.now() - t;
			return out;
		};
		for (const id of ["needs-panel", "ledger-lines"]) {
			const el = document.getElementById(id);
			const replace = el.replaceChildren;
			el.replaceChildren = function (...nodes) {
				r.hud.calls++;
				r.hud.nodes += nodes.reduce(
					(sum, n) => sum + 1 + n.querySelectorAll("*").length,
					0,
				);
				return replace.apply(this, nodes);
			};
		}
		let proto = window.cityjump._scene.meshes.find(
			(m) => m.thinInstanceSetBuffer,
		);
		while (!Object.hasOwn(proto, "thinInstanceSetBuffer"))
			proto = Object.getPrototypeOf(proto);
		const upload = proto.thinInstanceSetBuffer;
		proto.thinInstanceSetBuffer = function (kind, data, ...args) {
			const name = this.name;
			r.uploads[name] ??= { calls: 0, bytes: 0, ms: 0 };
			const row = r.uploads[name];
			const t = performance.now();
			const out = upload.call(this, kind, data, ...args);
			row.calls++;
			row.bytes += data?.byteLength ?? 0;
			row.ms += performance.now() - t;
			return out;
		};
		for (const o of window.cityjump._scene.onBeforeRenderObservable.observers) {
			const f = o.callback;
			const row = { name: f.toString().slice(0, 150), calls: 0, ms: 0, max: 0 };
			r.callbacks.push(row);
			o.callback = function (...args) {
				const t = performance.now();
				try {
					return f.apply(this, args);
				} finally {
					const ms = performance.now() - t;
					row.calls++;
					row.ms += ms;
					row.max = Math.max(row.max, ms);
				}
			};
		}
	});
	await p.evaluate(() => window.cityjump.setTimeRate(1));
	await p.waitForTimeout(500);
	result.cpu = await p.evaluate(async () => {
		const r = window.probe;
		r.sync = { calls: 0, ms: 0, max: 0 };
		r.sort = { calls: 0, ms: 0 };
		r.hud = { calls: 0, nodes: 0 };
		r.uploads = {};
		for (const c of r.callbacks) {
			c.calls = 0;
			c.ms = 0;
			c.max = 0;
		}
		await new Promise((resolve) => setTimeout(resolve, 12000));
		return {
			sync: r.sync,
			sort: r.sort,
			hud: r.hud,
			uploads: r.uploads,
			callbacks: r.callbacks,
			states: window.cityjump.stats().buildingStates,
		};
	});
	console.log("INSTRUMENTED", JSON.stringify(result.cpu));
	await setup();
	result.longRun = await p.evaluate(async () => {
		const a = window.cityjump,
			scene = a._scene;
		const frames = [],
			tasks = [];
		let last = performance.now();
		const observer = scene.onAfterRenderObservable.add(() => {
			const now = performance.now();
			frames.push(now - last);
			last = now;
		});
		const po = new PerformanceObserver((list) =>
			tasks.push(
				...list
					.getEntries()
					.map((e) => ({ start: e.startTime, duration: e.duration })),
			),
		);
		po.observe({ type: "longtask" });
		a.setTimeRate(1);
		const started = performance.now();
		await new Promise((resolve) => setTimeout(resolve, 30000));
		scene.onAfterRenderObservable.remove(observer);
		po.disconnect();
		const sorted = frames.slice(1).sort((a, b) => a - b);
		return {
			elapsed: performance.now() - started,
			frames: frames.length,
			p95: sorted[Math.floor(sorted.length * 0.95)],
			p99: sorted[Math.floor(sorted.length * 0.99)],
			max: sorted.at(-1),
			tasks: tasks.map((t) => ({ ...t, start: t.start - started })),
			states: a.stats().buildingStates,
			population: a.stats().population,
		};
	});
	console.log("LONG RUN", JSON.stringify(result.longRun));
	await setup();
	result.wave = await p.evaluate(async () => {
		const a = window.cityjump;
		a.setRunRules({ kaijuSpawns: true });
		const start = performance.now();
		const initial = a.measureWaveCost(90);
		const setupMs = performance.now() - start;
		a.setTimeRate(1);
		const scene = a._scene;
		const gaps = [],
			tasks = [];
		let last = performance.now();
		const obs = scene.onAfterRenderObservable.add(() => {
			const now = performance.now();
			gaps.push(now - last);
			last = now;
		});
		const po = new PerformanceObserver((list) =>
			tasks.push(...list.getEntries().map((e) => e.duration)),
		);
		po.observe({ type: "longtask" });
		const before = a.stats();
		const t = performance.now();
		await new Promise((resolve) => setTimeout(resolve, 12000));
		scene.onAfterRenderObservable.remove(obs);
		po.disconnect();
		const sorted = gaps.slice(1).sort((a, b) => a - b);
		const after = a.stats();
		return {
			initial,
			setupMs,
			elapsed: performance.now() - t,
			frames: gaps.length,
			p95: sorted[Math.floor(sorted.length * 0.95)],
			p99: sorted[Math.floor(sorted.length * 0.99)],
			max: sorted.at(-1),
			longTasks: tasks,
			before: {
				wave: before.wave,
				rubble: before.rubble,
				missiles: before.missiles,
			},
			after: {
				wave: after.wave,
				rubble: after.rubble,
				missiles: after.missiles,
			},
		};
	});
	console.log("WAVE", JSON.stringify(result.wave));
	await p.screenshot({ path: output("large-wave.png") });
	writeFileSync(output("large-focus.json"), JSON.stringify(result, null, 2));
} finally {
	await b.close();
}
