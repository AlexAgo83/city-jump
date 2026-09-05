// Preserved review workload; see docs/performance.md before comparing results.
import { fixturePath, launchOptions, output, url } from "./config.mjs";
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
const save = JSON.parse(readFileSync(fixturePath, "utf8"));
const b = await chromium.launch(launchOptions);
try {
	const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
	await p.addInitScript((s) => {
		localStorage.clear();
		localStorage.setItem("cityjump.autosave", JSON.stringify(s));
	}, save);
	await p.goto(url);
	await p.waitForFunction(
		() =>
			window.cityjump?.stats().models === 28 &&
			window.cityjump.stats().buildings > 1000,
	);
	await p.locator("#toolbar-toggle").click();
	await p.selectOption("#frame-cap", "0");
	await p.waitForTimeout(1000);
	const result = await p.evaluate(async () => {
		const a = window.cityjump;
		const initial = a.measureWaveCost(600);
		const scene = a._scene,
			gaps = [],
			tasks = [],
			events = [];
		let last = performance.now(),
			lastRubble = a.stats().rubble;
		const start = performance.now();
		const po = new PerformanceObserver((list) =>
			tasks.push(
				...list
					.getEntries()
					.map((e) => ({ time: e.startTime - start, ms: e.duration })),
			),
		);
		po.observe({ type: "longtask" });
		const obs = scene.onAfterRenderObservable.add(() => {
			const now = performance.now();
			gaps.push(now - last);
			last = now;
		});
		const timer = setInterval(() => {
			const s = a.stats();
			if (s.rubble !== lastRubble) {
				events.push({
					time: performance.now() - start,
					rubble: s.rubble,
					wave: s.wave,
				});
				lastRubble = s.rubble;
			}
		}, 250);
		a.setTimeRate(1);
		await new Promise((resolve) => setTimeout(resolve, 20000));
		clearInterval(timer);
		scene.onAfterRenderObservable.remove(obs);
		po.disconnect();
		const elapsed = performance.now() - start,
			sorted = gaps.slice(1).sort((a, b) => a - b),
			s = a.stats();
		return {
			initial,
			elapsed,
			fps: (gaps.length * 1000) / elapsed,
			p95: sorted[Math.floor(sorted.length * 0.95)],
			p99: sorted[Math.floor(sorted.length * 0.99)],
			max: sorted.at(-1),
			tasks,
			events,
			after: { wave: s.wave, rubble: s.rubble, buildings: s.buildings },
		};
	});
	console.log(JSON.stringify(result));
	writeFileSync(output("wave-profile.json"), JSON.stringify(result, null, 2));
} finally {
	await b.close();
}
