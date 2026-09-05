// Preserved review workload; see docs/performance.md before comparing results.
import { fixturePath, launchOptions, output, url } from "./config.mjs";
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
fixture.run.rules.kaijuSpawns = false;
const browser = await chromium.launch(launchOptions);
const results = [];
try {
	const page = await browser.newPage({
		viewport: { width: 1280, height: 800 },
	});
	await page.addInitScript((s) => {
		localStorage.clear();
		localStorage.setItem("cityjump.autosave", JSON.stringify(s));
	}, fixture);
	for (let round = 0; round < 3; round++)
		for (const guard of round % 2 ? [true, false] : [false, true]) {
			await page.goto(url);
			await page.waitForFunction(
				() =>
					window.cityjump?.stats().models === 28 &&
					window.cityjump.stats().buildings > 1000,
			);
			await page.locator("#toolbar-toggle").click();
			await page.selectOption("#frame-cap", "0");
			if (guard)
				await page.evaluate(async () => {
					const { Rubble } = await import("/src/sim/rubble.ts");
					const blocks = Rubble.prototype.blocks;
					Rubble.prototype.blocks = function (parcel) {
						return this.count() === 0 ? false : blocks.call(this, parcel);
					};
				});
			await page.evaluate(() => window.cityjump.setTimeRate(1));
			await page.waitForTimeout(1800);
			const measured = await page.evaluate(async () => {
				const scene = window.cityjump._scene;
				const durations = [];
				const original = scene.render;
				scene.render = function (...args) {
					const start = performance.now();
					try {
						return original.apply(this, args);
					} finally {
						durations.push(performance.now() - start);
					}
				};
				const t = performance.now();
				await new Promise((resolve) => setTimeout(resolve, 4000));
				const elapsed = performance.now() - t;
				scene.render = original;
				const s = window.cityjump.stats();
				return {
					fps: (durations.length * 1000) / elapsed,
					cpuMs: durations.reduce((a, b) => a + b, 0) / durations.length,
					frames: durations.length,
					rubble: s.rubble,
					buildings: s.buildings,
					population: s.population,
				};
			});
			results.push({ round, guard, ...measured });
			console.log(JSON.stringify(results.at(-1)));
		}
	writeFileSync(output("rubble-ab.json"), JSON.stringify(results, null, 2));
} finally {
	await browser.close();
}
