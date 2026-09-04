// Drives the running app in a real browser: draws a network, screenshots it, and
// reports the frame rate. Verification for the visual acceptance criteria, which no
// headless unit test can speak to.
//
//   node scripts/shot.mjs <url> <out.png> [scenario]
//
// Scenarios: `network` (default) draws a small road network; `city` draws a denser one;
// `rugged` switches to the steep terrain first.
import { chromium } from "playwright";

const [url = "http://localhost:5173", out = "shot.png", scenario = "network"] = process.argv.slice(2);
const minimums = {
  network: { segments: 24, avenues: 7, tunnels: 1, junctions: 4, buildings: 120, activeMeshes: 20 },
  rugged: { segments: 24, avenues: 7, tunnels: 1, junctions: 4, buildings: 80, activeMeshes: 20 },
  city: { segments: 200, avenues: 20, junctions: 100, buildings: 1000, cars: 200, pedestrians: 400, activeMeshes: 20 },
};

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("console", (m) => {
  if (m.type() === "error") console.log("[page error]", m.text());
});
page.on("pageerror", (e) => console.log("[page exception]", e.message));

await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => Boolean(window.cityjump), null, { timeout: 20_000 });
if (scenario === "rugged") {
  await page.evaluate(() => {
    localStorage.setItem("cityjump.autosave", JSON.stringify({ v: 7, terrain: "rugged", hour: 14, nodes: [], segments: [], planted: [], cleared: [], zones: [] }));
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.cityjump), null, { timeout: 20_000 });
}

const report = await page.evaluate(async (which) => {
  const api = window.cityjump;
  // `camera` only sets radius and angles, and the app opens framed on the starter kit -- half the
  // shot was the empty ground south of the demo network. The demo lays itself out around 0,0.
  const frameOrigin = () => api._scene.activeCamera.target.set(0, 0, 0);
  // A road no longer builds its own frontage: a lot has to be zoned, and the demand rules then
  // admit it on elapsed time and population. A scripted city has to do both, or the shot is of
  // empty streets.
  const populate = (radius, seconds, population) => {
    // A city this size summons a kaiju on the spot, and the camera then follows the monster out to
    // sea. The shot is of the city, so the scenario runs pacifist.
    api.setRunRules({ kaijuSpawns: false });
    api.zone(0, 0, radius, "residential");
    api.zone(-radius / 2, -radius / 2, radius / 3, "commercial");
    api.zone(radius / 2, radius / 2, radius / 3, "industrial");
    api.growCity(seconds, population);
    // Twice: the first call raises the lots, the second lets their construction stage run out, so
    // the shot is of a finished city rather than of a field of scaffolding.
    api.growCity(seconds + 60, population);
  };
  api.reset();
  if (which === "city") {
    api.demoCity();
    populate(1400, 40_000, 40_000);
    api.camera(1400, Math.PI / 3.2);
    frameOrigin();
  } else if (which === "rugged") {
    api.reset();
    api.demoNetwork();
    populate(1500, 8_000, 8_000);
    api._scene.getMeshByName("buildable-grid")?.setEnabled(false);
    api.camera(1450, Math.PI / 5, -Math.PI / 2);
    frameOrigin();
  } else {
    api.demoNetwork();
    populate(1500, 8_000, 8_000);
    api._scene.getMeshByName("buildable-grid")?.setEnabled(false);
    api.camera(1450, Math.PI / 5, -Math.PI / 2);
    frameOrigin();
  }
  const fps = await api.measureFps(3000);
  const gl = document.createElement("canvas").getContext("webgl2");
  const info = gl?.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
  return { fps, renderer, ...api.stats() };
}, scenario);

const required = minimums[scenario] ?? minimums.network;
const missing = Object.entries(required).filter(([key, value]) => (report[key] ?? 0) < value);
if (missing.length) throw new Error(`scenario ${scenario} below minimums: ${missing.map(([key, value]) => `${key} ${report[key] ?? 0}/${value}`).join(", ")}`);

await page.waitForTimeout(500);
await page.screenshot({ path: out });
await browser.close();

console.log(JSON.stringify(report, null, 2));
