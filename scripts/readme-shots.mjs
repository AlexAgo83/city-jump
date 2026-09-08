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

/**
 * One capture per README image, in the order the README shows them: the three select views the
 * `Read it` bullet describes, on one framing. The filename `city-jump-curves` predates this and is
 * kept anyway -- `docs/media/README.md` warns that a capture may be cited from published release
 * notes this repository cannot see, and a rename would break exactly such a citation.
 */
const shots = [
  { out: "docs/media/city-jump.png", tool: "select", view: "all", what: "Select mode" },
  { out: "docs/media/city-jump-curves.png", tool: "select", view: "no-buildings", what: "Zones view" },
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

async function openToolbar(open) {
  const toggle = page.locator("#toolbar-toggle");
  if (((await toggle.getAttribute("aria-expanded")) === "true") !== open) await toggle.click();
}

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

// The city boots paused, and a paused city has its traffic standing on the spawn points -- the
// first version of these captures shipped with empty streets because of exactly that. Play, then
// let the cars spread along the roads before shooting.
await openToolbar(false);
await page.locator('[data-time-rate="1"]').click();
await page.waitForFunction(() => window.cityjump.stats().cars > 0, null, { timeout: 30_000 });
// Moving, not merely present: two different position keys a beat apart is the only proof that the
// clock is actually running.
const moving = await page.evaluate(async () => {
  const before = window.cityjump.stats().moverPositions;
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { before, after: window.cityjump.stats().moverPositions };
});
if (moving.before === moving.after) {
  console.error("Refusing to shoot: the traffic is not moving, so the city is still paused.");
  await browser.close();
  process.exit(1);
}
// Long enough for the cars to be mid-street and queued at the lights rather than bunched where
// they were placed.
await page.waitForTimeout(6000);

// Then stop the clock again. A screenshot cannot show motion, only where the traffic is, and the
// cars stay spread out once they are moving -- while running on costs an hour of daylight per
// eight seconds of wall clock, which reshot the city in a different light than the save records.
await page.locator('[data-time-rate="0"]').click();
// Put the hour back to the one the save carries, for the same reason the camera is not touched:
// the fixture decides what the captures look like. The slider is bound to an `input` event and is
// reachable whether or not its panel is open.
await page.evaluate((hour) => {
  const slider = document.getElementById("sun-hour");
  slider.value = String(hour);
  slider.dispatchEvent(new Event("input", { bubbles: true }));
}, save.hour);
await page.waitForTimeout(400);

const settled = await page.evaluate(() => window.cityjump.stats());
if (Math.abs(settled.simHour - save.hour) > 0.05) {
  console.error(`Refusing to shoot: the hour is ${settled.simHour}, not the ${save.hour} the save records.`);
  await browser.close();
  process.exit(1);
}
if (settled.moverPositions === 0) {
  console.error("Refusing to shoot: no traffic on the roads.");
  await browser.close();
  process.exit(1);
}

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

for (const shot of shots) {
  await openToolbar(true);
  if (await page.locator("#action-toggle").getAttribute("aria-expanded") !== "true") await page.locator("#action-toggle").click();
  await page.locator(`[data-tool="${shot.tool}"]`).click();
  if (shot.view) await page.locator(`input[name="select-view"][value="${shot.view}"]`).check();
  // The toolbar is chrome, not city: every previous capture was taken with it shut.
  await openToolbar(false);
  // The traffic is already running; this is only the view switch settling.
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shot.out });
  console.log(`${shot.out}  ${shot.what}`);
}

console.log(
  `Demo: ${stats.segments} segments, ${stats.buildings} buildings, ${stats.cars} cars, ${stats.models} models, traffic spread then held at day ${save.day} ${save.hour}h`,
);
if (noise.length > 0) {
  console.error(`page reported ${noise.length} error(s):`);
  for (const line of noise.slice(0, 10)) console.error(`  ${line}`);
  await browser.close();
  process.exit(1);
}
await browser.close();
