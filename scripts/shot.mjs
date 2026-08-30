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
  api.reset();
  if (which === "city") {
    api.demoCity();
    api.camera(1400, Math.PI / 3.2);
  } else if (which === "rugged") {
    api.reset();
    api.demoNetwork();
    api._scene.getMeshByName("buildable-grid")?.setEnabled(false);
    api.camera(1450, Math.PI / 5, -Math.PI / 2);
  } else {
    api.demoNetwork();
    api._scene.getMeshByName("buildable-grid")?.setEnabled(false);
    api.camera(1450, Math.PI / 5, -Math.PI / 2);
  }
  const fps = await api.measureFps(3000);
  const gl = document.createElement("canvas").getContext("webgl2");
  const info = gl && gl.getExtension("WEBGL_debug_renderer_info");
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
