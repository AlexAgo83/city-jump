/**
 * The Extra AA option, checked end to end rather than at the assignment that implements it.
 *
 * The mapping is one line; what can actually break is the wiring between the checkbox, the look
 * handler, the render pipeline and the persisted settings -- so that is what this asserts.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { fixturePath, launchOptions, output, url } from "./config.mjs";
import { waitForModels } from "../model-readiness.mjs";

/** The settings panel shows one section at a time: open the one that owns this control. */
const pane = async (page, selector) => {
	await page.evaluate((sel) => {
		const owner = document.querySelector(sel)?.closest(".pane");
		if (owner?.hidden)
			document.querySelector(`.rail-btn[aria-controls="${owner.id}"]`)?.click();
	}, selector);
};

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

const samples = () =>
	page.evaluate(
		() =>
			window.cityjump._scene.postProcessRenderPipelineManager._renderPipelines
				.look.samples,
	);

const on = await samples();
await pane(page, "#fx-multisample");
await page.locator("#fx-multisample").uncheck();
await page.waitForTimeout(400);
const off = await samples();
await pane(page, "#fx-multisample");
await page.locator("#fx-multisample").check();
await page.waitForTimeout(400);
const back = await samples();

// The choice has to be written down, or it is not an option, only a switch. Read the stored
// settings rather than reloading the page: this probe seeds localStorage on every navigation,
// so a reload here would wipe the very value it is meant to check.
await page.locator("#fx-multisample").uncheck();
await page.waitForTimeout(400);
const stored = await page.evaluate(
	() =>
		JSON.parse(localStorage.getItem("cityjump.settings") ?? "{}").fxMultisample,
);

const result = { on, off, back, stored };
console.log(JSON.stringify(result));
const fail = [];
const check = (ok, why) => {
	if (!ok) fail.push(why);
};
check(on === 4, `default must be four samples, got ${on}`);
check(off === 1, `unchecking must drop to one sample, got ${off}`);
check(back === 4, `re-checking must restore four samples, got ${back}`);
check(
	stored === false,
	`the choice must be persisted, got ${JSON.stringify(stored)}`,
);
check(errors.length === 0, `page errors: ${errors.join("; ")}`);

writeFileSync(output("look.json"), `${JSON.stringify(result, null, "\t")}\n`);
await browser.close();
if (fail.length) {
	for (const why of fail) console.error("FAIL", why);
	process.exit(1);
}
console.log("look: OK");
