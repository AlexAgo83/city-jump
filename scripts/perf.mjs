// Measures how a city actually runs, and keeps the numbers so a change can be compared with the
// run before it. Verification for the performance side of the acceptance criteria, which no unit
// test can speak to.
//
//   npm run perf                       -- the built-in demo city
//   npm run perf -- --city save.json   -- a city exported from the app (Share -> Save link JSON)
//   npm run perf -- --city '#city=H4s' -- a share link, or the whole URL it came in
//   npm run perf -- --label before     -- names the run, so runs are compared like with like
//
// Every run appends one line to perf/history.jsonl and prints the delta against the last run
// with the same label.
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const HISTORY = join(ROOT, "perf", "history.jsonl");

const args = process.argv.slice(2);
const url = args.find((arg) => arg.startsWith("http")) ?? "http://localhost:5173";
const flag = (name) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};
const city = flag("city");
const label = flag("label") ?? (city ? city.replace(/.*\//, "").replace(/\.json$/, "") : "demo");

// Three framings, because a city is slow in different ways depending on how much of it is on
// screen: the whole map at once, a district, and street level with the models at full size.
const FRAMINGS = [
  { name: "overview", radius: 1600, beta: Math.PI / 3.4 },
  { name: "district", radius: 600, beta: Math.PI / 3 },
  { name: "street", radius: 140, beta: Math.PI / 2.4 },
];

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (error) => console.log("[page exception]", error.message));

// A share link is handled by the app itself, which asks before importing; a JSON city is put
// straight into the autosave the app resumes from.
const shareHash = city && (city.startsWith("#city=") || city.includes("#city=")) ? city.slice(city.indexOf("#city=")) : null;
if (shareHash) page.on("dialog", (dialog) => dialog.accept());
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => Boolean(window.cityjump), null, { timeout: 20_000 });

if (shareHash) {
  await page.goto(`${url}/${shareHash}`, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.cityjump), null, { timeout: 20_000 });
} else if (city) {
  const save = JSON.parse(readFileSync(city, "utf8"));
  await page.evaluate((value) => localStorage.setItem("cityjump.autosave", JSON.stringify(value)), save);
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.cityjump), null, { timeout: 20_000 });
} else {
  await page.evaluate(() => {
    window.cityjump.reset();
    window.cityjump.demoCity();
    window.cityjump.rebuild();
  });
}

// Every model has to be in before the numbers mean anything: a city half-loaded draws half the
// buildings, and reads as fast for the wrong reason. They arrive over a few frames, so this waits
// for the count to stop climbing rather than for a number written down here.
await page.waitForFunction(
  () => {
    const models = window.cityjump.stats().models;
    const settled = window.__perfModels === models;
    window.__perfModels = models;
    return settled && models > 0;
  },
  null,
  { timeout: 30_000, polling: 1000 },
);
await page.waitForTimeout(2000);

const stats = await page.evaluate(() => window.cityjump.stats());
// What the scene is actually made of: a city is slow in draw calls, and a draw call is a mesh.
// Grouped by name prefix, because that is one renderer's output each.
const meshes = await page.evaluate(() => {
  const counts = {};
  for (const mesh of window.cityjump._scene.meshes) {
    if (!mesh.isEnabled() || !mesh.isVisible) continue;
    const group = mesh.name.replace(/[_\d].*$/, "") || mesh.name;
    counts[group] = (counts[group] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8));
});
const rebuildMs = await page.evaluate(() => {
  const started = performance.now();
  window.cityjump.rebuild();
  return Math.round(performance.now() - started);
});
const fps = {};
for (const framing of FRAMINGS) {
  await page.evaluate(({ radius, beta }) => window.cityjump.camera(radius, beta), framing);
  await page.waitForTimeout(600);
  fps[framing.name] = await page.evaluate(() => window.cityjump.measureFps(3000));
}
await browser.close();

const run = {
  at: new Date().toISOString(),
  label,
  commit: execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(),
  dirty: execSync("git status --porcelain", { cwd: ROOT }).toString().trim().length > 0,
  fps,
  rebuildMs,
  meshes,
  city: {
    segments: stats.segments,
    buildings: stats.buildings,
    cars: stats.cars,
    pedestrians: stats.pedestrians,
    trees: stats.trees,
    activeMeshes: stats.activeMeshes,
  },
};

const previous = existsSync(HISTORY)
  ? readFileSync(HISTORY, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((entry) => entry.label === label)
      .at(-1)
  : undefined;

mkdirSync(dirname(HISTORY), { recursive: true });
appendFileSync(HISTORY, `${JSON.stringify(run)}\n`);

const delta = (now, before) => (before === undefined ? "" : `  (${now - before >= 0 ? "+" : ""}${Math.round(now - before)})`);
console.log(`\n${label}  ${run.commit}${run.dirty ? "+dirty" : ""}`);
console.log(`  city        ${run.city.segments} segments, ${run.city.buildings} buildings, ${run.city.cars} cars, ${run.city.activeMeshes} active meshes`);
for (const framing of FRAMINGS) {
  console.log(`  ${framing.name.padEnd(11)} ${fps[framing.name]} fps${delta(fps[framing.name], previous?.fps?.[framing.name])}`);
}
console.log(`  rebuild     ${rebuildMs} ms${delta(rebuildMs, previous?.rebuildMs)}`);
console.log(`  meshes      ${Object.entries(meshes).map(([group, count]) => `${group} ${count}${delta(count, previous?.meshes?.[group]).trim()}`).join(", ")}`);
console.log(previous ? `  compared with ${previous.at.slice(0, 16).replace("T", " ")} (${previous.commit})\n` : "  first run for this label\n");
