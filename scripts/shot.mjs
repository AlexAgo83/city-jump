// Drives the running app in a real browser: draws a network, screenshots it, and
// reports the frame rate. Verification for the visual acceptance criteria, which no
// headless unit test can speak to.
//
//   node scripts/shot.mjs <url> <out.png> [scenario]
//
// Scenarios: `network` (default) draws a small road network; `city` draws a denser one
// and reports the frame rate at the resulting building count.
import { chromium } from "playwright";

const [url = "http://localhost:5173", out = "shot.png", scenario = "network"] = process.argv.slice(2);

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

const report = await page.evaluate(async (which) => {
  const api = window.cityjump;
  api.reset();
  if (which === "city") {
    api.demoCity();
    api.camera(1400, Math.PI / 3.2);
  } else {
    api.demoNetwork();
    api.camera(360, Math.PI / 5);
  }
  const fps = await api.measureFps(3000);
  const gl = document.createElement("canvas").getContext("webgl2");
  const info = gl && gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
  return { fps, renderer, ...api.stats() };
}, scenario);

await page.waitForTimeout(500);
await page.screenshot({ path: out });
await browser.close();

console.log(JSON.stringify(report, null, 2));
