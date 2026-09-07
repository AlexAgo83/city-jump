// Which part of the scene costs the frame rate. Switches one thing off at a time and measures,
// re-measuring the full scene between every ablation so the answer is a ratio taken minutes apart
// at most -- this machine's absolute fps wanders far more than most changes do.
//
//   npm run ablate                                          # the demo city
//   npm run ablate -- --city perf/cities/ma-ville.json --rounds 3 --gpu
//   npm run ablate -- --paused                              # the still scene, on purpose
//
// Prints, per ablation and framing, the median of "fps with it off / fps with everything on".
import { chromium } from "playwright";
import { ablationRatio, pauseGameplay, rendererOf, runGameplay } from "./measurement.mjs";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const url = args.find((arg) => arg.startsWith("http")) ?? "http://localhost:5173";
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};
const city = flag("city");
const rounds = Number(flag("rounds", "3"));
const onGpu = args.includes("--gpu");
const sampleMs = Number(flag("ms", "2500"));
const paused = args.includes("--paused");
const simRate = Number(flag("sim-rate", "1"));

const FRAMINGS = [
  { name: "overview", radius: 1600, beta: Math.PI / 3.4 },
  { name: "street", radius: 140, beta: Math.PI / 2.4 },
];

// Each ablation is a set of checkboxes to clear. They are the app's own switches, so nothing here
// measures a code path the game does not actually have.
const ABLATIONS = [
  { name: "buildings off", off: ["show-buildings"] },
  { name: "traffic off", off: ["show-traffic"] },
  { name: "shadows off", off: ["show-shadows"] },
  { name: "lights off", off: ["show-lights"] },
  { name: "all three off", off: ["show-buildings", "show-traffic", "show-shadows"] },
];

const browser = await chromium.launch({
  headless: !onGpu,
  args: onGpu ? ["--ignore-gpu-blocklist"] : ["--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (error) => console.log("[page exception]", error.message));
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => Boolean(window.cityjump), null, { timeout: 20_000 });
if (city) {
  await page.evaluate((save) => localStorage.setItem("cityjump.autosave", JSON.stringify(save)), JSON.parse(readFileSync(city, "utf8")));
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.cityjump), null, { timeout: 20_000 });
} else {
  await page.evaluate(() => {
    window.cityjump.reset();
    window.cityjump.demoCity();
    window.cityjump.setRunRules({ instantConstruction: true, freeBuilding: true });
    window.cityjump.zone(0, 0, 1200, "residential");
    window.cityjump.growCity(2000, 3000);
    window.cityjump.rebuild();
  });
}
// An empty city has to fail here and say so: it renders fast for the wrong reason, and a number
// taken from it looks like a win.
try {
  await page.waitForFunction(
    () => {
      const { buildings, models } = window.cityjump.stats();
      const settled = window.__ablateBuildings === buildings;
      window.__ablateBuildings = buildings;
      return settled && buildings > 0 && models > 0;
    },
    null,
    { timeout: 30_000, polling: 1000 },
  );
} catch {
  const { buildings, models } = await page.evaluate(() => window.cityjump.stats());
  console.error(`Refusing to measure a city with ${buildings} buildings and ${models} models: nothing standing, nothing to measure.`);
  await browser.close();
  process.exit(1);
}

const setBoxes = async (off) => {
  for (const id of ["show-buildings", "show-traffic", "show-shadows", "show-lights"]) {
    const box = page.locator(`#${id}`);
    const wanted = !off.includes(id);
    if ((await box.isChecked()) !== wanted) await box.setChecked(wanted);
  }
  await page.waitForTimeout(500);
};

const measure = async (framing) => {
  await page.evaluate(({ radius, beta }) => window.cityjump.camera(radius, beta), framing);
  await page.waitForTimeout(500);
  return page.evaluate((ms) => window.cityjump.measureFps(ms), sampleMs);
};

// The toolbar ships collapsed and its content is display:none, so #frame-cap and every show-*
// checkbox this script drives are invisible to a click until it is opened. Same break as perf.mjs
// had: the settings menu started closed and neither harness was told.
if ((await page.locator("#toolbar-toggle").getAttribute("aria-expanded")) !== "true") {
  await page.locator("#toolbar-toggle").click();
}

// The game caps itself to spare a laptop; a measurement wants the machine flat out.
await page.selectOption("#frame-cap", "0");
await page.waitForTimeout(500);

const workload = paused ? await pauseGameplay(page) : await runGameplay(page, { rate: simRate });

const results = new Map();
const record = (key, value) => results.set(key, [...(results.get(key) ?? []), value]);

for (let round = 0; round < rounds; round++) {
  for (const framing of FRAMINGS) {
    await setBoxes([]);
    const base = await measure(framing);
    record(`everything on|${framing.name}`, base);
    let before = base;
    for (const ablation of ABLATIONS) {
      await setBoxes(ablation.off);
      const fps = await measure(framing);
      // Straight back to the full scene: the ablation is divided by the two baselines that
      // bracket it, not by the one taken at the top of the round, which by the last ablation is
      // minutes and a thermal state away and lands its own drift in the answer.
      await setBoxes([]);
      const after = await measure(framing);
      record(`everything on|${framing.name}`, after);
      record(`${ablation.name}|${framing.name}`, ablationRatio(fps, before, after));
      before = after;
    }
  }
  process.stdout.write(`round ${round + 1}/${rounds} done\n`);
}
// One page, one camera: these have to be read one after the other, not raced.
const cameras = {};
for (const framing of FRAMINGS) {
  await page.evaluate(({ radius, beta }) => window.cityjump.camera(radius, beta), framing);
  cameras[framing.name] = await page.evaluate(() => window.cityjump.cameraState());
}
await browser.close();

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
console.log(`\n${city ?? "demo"}, ${rounds} rounds`);
console.log(`workload ${workload.workload}, sim rate ${workload.simRate}, ${rendererOf(onGpu)}\n`);
for (const framing of FRAMINGS) {
  const base = median(results.get(`everything on|${framing.name}`));
  const { radius, beta, alpha } = cameras[framing.name];
  console.log(`  ${framing.name}: everything on = ${Math.round(base)} fps  (camera r=${Math.round(radius)} beta=${beta.toFixed(2)} alpha=${alpha.toFixed(2)})`);
  for (const ablation of ABLATIONS) {
    const ratio = median(results.get(`${ablation.name}|${framing.name}`));
    console.log(`    ${ablation.name.padEnd(16)} x${ratio.toFixed(2)}  (${Math.round(base * ratio)} fps)`);
  }
}
