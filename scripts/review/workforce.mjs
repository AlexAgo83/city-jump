/**
 * Whether the workforce allocation is actually reused between frames, or just claims to be.
 *
 * Counting allocations against frames is the whole check: a cache that misses every frame is
 * indistinguishable from no cache in a frame-time graph this noisy, but not here.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fixturePath, launchOptions, output, url } from "./config.mjs";
import { waitForModels } from "../model-readiness.mjs";
import { writeFileSync } from "node:fs";

const save = JSON.parse(readFileSync(fixturePath, "utf8"));
const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(90_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript((city) => {
	localStorage.clear();
	localStorage.setItem("cityjump.autosave", JSON.stringify(city));
}, save);
await page.goto(url);
await waitForModels(page, save.buildingStates.length);
await page.locator("#toolbar-toggle").click();

const counts = () =>
	page.evaluate(() => window.cityjump.stats().workforceAllocations);
const frames = (ms) =>
	page.evaluate(async (wait) => {
		const scene = window.cityjump._scene;
		let n = 0;
		const observer = scene.onAfterRenderObservable.add(() => n++);
		await new Promise((r) => setTimeout(r, wait));
		scene.onAfterRenderObservable.remove(observer);
		return n;
	}, ms);

const measure = async (label, rate) => {
	await page.evaluate((r) => window.cityjump.setTimeRate(r), rate);
	const before = await counts();
	const drawn = await frames(6000);
	const after = await counts();
	const row = {
		label,
		frames: drawn,
		lifecycle: after.lifecycle - before.lifecycle,
		needs: after.needs - before.needs,
	};
	console.log(label, JSON.stringify(row));
	return row;
};

// Paused: nothing the allocation depends on can move, so it must not be recomputed at all.
const paused = await measure("paused", 0);
// Running: the population creeps, so recomputes are expected -- but far fewer than frames.
const running = await measure("running", 1);
// x4 moves the population four times as fast, so it is the honest upper bound on recomputes.
const fast = await measure("x4", 4);

const fail = [];
const check = (ok, why) => {
	if (!ok) fail.push(why);
};
check(
	paused.frames > 60,
	"the paused sample must have drawn frames to be worth anything",
);
check(
	paused.lifecycle === 0 && paused.needs === 0,
	`paused must recompute nothing, got ${paused.lifecycle}/${paused.needs}`,
);
check(
	running.needs < running.frames / 2,
	`the panel must reuse across frames, got ${running.needs} for ${running.frames} frames`,
);
check(
	running.lifecycle < running.frames / 2,
	`the building cycle must reuse across frames, got ${running.lifecycle} for ${running.frames} frames`,
);
check(
	fast.needs < fast.frames / 2,
	`x4 must still reuse across frames, got ${fast.needs} for ${fast.frames} frames`,
);
check(
	fast.lifecycle < fast.frames / 2,
	`x4 must still reuse in the building cycle, got ${fast.lifecycle} for ${fast.frames} frames`,
);
check(errors.length === 0, `page errors: ${errors.join("; ")}`);

writeFileSync(
	output("workforce.json"),
	`${JSON.stringify({ paused, running, fast }, null, "\t")}\n`,
);
await browser.close();
if (fail.length) {
	for (const why of fail) console.error("FAIL", why);
	process.exit(1);
}
console.log("workforce: OK");
