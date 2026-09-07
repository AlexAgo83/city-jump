// Retakes the three README captures from the bundled Demo save.
//
//   node scripts/with-dev-server.mjs scripts/readme-shots.mjs
//
// The framing is the one the save carries. `public/default-demo.json` records the camera it was
// exported with, and loading a city applies it (see `applyCamera` in `src/app/cityLoad.ts`), so
// this script must not touch the camera at all -- the three shots then differ only in the view
// selected, which is exactly what the README claims about them. Re-exporting the Demo from the
// game reframes every capture; that is the point, and `tests/default-demo.mjs` pins the radius so
// it cannot happen silently.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:5173";
const save = JSON.parse(readFileSync("public/default-demo.json", "utf8"));

/** One capture per README image, in the order the README shows them. */
const shots = [
  { out: "docs/media/city-jump.png", tool: "select", view: "all", what: "Select mode" },
  { out: "docs/media/city-jump-curves.png", tool: "roads", view: null, what: "Roads mode" },
  { out: "docs/media/city-jump-traffic.png", tool: "select", view: "traffic", what: "Traffic view" },
];

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
// The width the README renders at on GitHub, at the aspect the previous captures used.
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(90_000);
const noise = [];
page.on("pageerror", (error) => noise.push(`exception: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") noise.push(message.text());
});

await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => Boolean(window.cityjump), null, { timeout: 30_000 });

// The app resumes from its autosave, which is how a city gets in without driving the load menu.
await page.evaluate((city) => localStorage.setItem("cityjump.autosave", JSON.stringify(city)), save);
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => Boolean(window.cityjump), null, { timeout: 30_000 });

// Every building model has to be in before the shot, or the city is photographed half-built.
await page.waitForFunction(() => window.cityjump.stats().models === 107, null, { timeout: 60_000 });
await page.waitForFunction(
  (expected) => window.cityjump.stats().buildings >= expected,
  save.buildingStates.length * 0.95,
  { timeout: 60_000 },
);

const stats = await page.evaluate(() => window.cityjump.stats());
const camera = await page.evaluate(() => window.cityjump.cameraState());
const drift = ["targetX", "targetY", "targetZ", "alpha", "beta", "radius"].filter(
  (key) => Math.abs(camera[key] - save.camera[key]) > 0.5,
);
if (drift.length > 0) {
  console.error(`Refusing to shoot: the camera is not the one the save carries (${drift.join(", ")}).`);
  console.error(`  save: ${JSON.stringify(save.camera)}`);
  console.error(`  page: ${JSON.stringify(camera)}`);
  await browser.close();
  process.exit(1);
}

async function openToolbar(open) {
  const toggle = page.locator("#toolbar-toggle");
  if (((await toggle.getAttribute("aria-expanded")) === "true") !== open) await toggle.click();
}

for (const shot of shots) {
  await openToolbar(true);
  await page.locator(`[data-tool="${shot.tool}"]`).click();
  if (shot.view) await page.locator(`input[name="select-view"][value="${shot.view}"]`).check();
  // The toolbar is chrome, not city: every previous capture was taken with it shut.
  await openToolbar(false);
  // Long enough for the traffic to be mid-street rather than mid-spawn, and for the lights to
  // settle at the saved hour.
  await page.waitForTimeout(2500);
  await page.screenshot({ path: shot.out });
  console.log(`${shot.out}  ${shot.what}`);
}

console.log(
  `Demo: ${stats.segments} segments, ${stats.buildings} buildings, ${stats.models} models, hour ${save.hour}, day ${save.day}`,
);
if (noise.length > 0) {
  console.error(`page reported ${noise.length} error(s):`);
  for (const line of noise.slice(0, 10)) console.error(`  ${line}`);
  await browser.close();
  process.exit(1);
}
await browser.close();
