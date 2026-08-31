// Which part of the scene costs the frame rate. Switches one thing off at a time and measures,
// re-measuring the full scene between every ablation so the answer is a ratio taken minutes apart
// at most -- this machine's absolute fps wanders far more than most changes do.
//
//   npm run ablate                                          # the demo city
//   npm run ablate -- --city perf/cities/ma-ville.json --rounds 3 --gpu
//
// Prints, per ablation and framing, the median of "fps with it off / fps with everything on".
import { chromium } from "playwright";
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
    window.cityjump.rebuild();
  });
}
await page.waitForTimeout(6000);

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

// The game caps itself to spare a laptop; a measurement wants the machine flat out.
await page.selectOption("#frame-cap", "0");
await page.waitForTimeout(500);

const results = new Map();
const record = (key, value) => results.set(key, [...(results.get(key) ?? []), value]);

for (let round = 0; round < rounds; round++) {
  for (const framing of FRAMINGS) {
    await setBoxes([]);
    const base = await measure(framing);
    record(`everything on|${framing.name}`, base);
    for (const ablation of ABLATIONS) {
      await setBoxes(ablation.off);
      const fps = await measure(framing);
      record(`${ablation.name}|${framing.name}`, fps / base);
      // Straight back to the full scene, so the next ratio is against a fresh baseline.
      await setBoxes([]);
      record(`everything on|${framing.name}`, await measure(framing));
    }
  }
  process.stdout.write(`round ${round + 1}/${rounds} done\n`);
}
await browser.close();

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
console.log(`\n${city ?? "demo"}${onGpu ? "  (gpu)" : "  (software rasteriser)"}, ${rounds} rounds\n`);
for (const framing of FRAMINGS) {
  const base = median(results.get(`everything on|${framing.name}`));
  console.log(`  ${framing.name}: everything on = ${Math.round(base)} fps`);
  for (const ablation of ABLATIONS) {
    const ratio = median(results.get(`${ablation.name}|${framing.name}`));
    console.log(`    ${ablation.name.padEnd(16)} x${ratio.toFixed(2)}  (${Math.round(base * ratio)} fps)`);
  }
}
