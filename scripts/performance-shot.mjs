import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const [url = "http://127.0.0.1:5173"] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.setDefaultTimeout(30_000);
const ready = () => page.waitForFunction(() => window.cityjump?.stats().models === 235);
const settings = async (open, selector = "#show-performance") => {
  if ((await page.locator("#toolbar-toggle").getAttribute("aria-expanded") === "true") !== open) await page.locator("#toolbar-toggle").click();
  if (open) await page.evaluate((selector) => {
    const pane = document.querySelector(selector).closest(".pane");
    document.querySelector(`[aria-controls="${pane.id}"]`).click();
  }, selector);
};
const graph = async (enabled) => {
  await settings(true);
  await page.locator("#show-performance").setChecked(enabled);
  await settings(false);
};
try {
  await page.goto(url);
  await ready();
  assert.equal(await page.locator("#performance-panel").isHidden(), true);
  assert.equal(await page.evaluate(() => window.cityjump.performanceStats().enabled), false);
  await graph(true);
  await page.waitForFunction(() => window.cityjump.performanceStats().samples >= 3);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("cityjump.settings")).performanceGraph), true);
  await page.reload();
  await ready();
  assert.equal(await page.locator("#performance-panel").isVisible(), true);
  await settings(true);
  assert.equal(await page.locator("#show-performance").isChecked(), true);
  // The graph and FPS counter can each be used on their own.
  await page.locator("#show-fps").check();
  await settings(true, "#frame-cap");
  await page.selectOption("#frame-cap", "30");
  await settings(false);
  await page.waitForFunction(() => window.cityjump.performanceStats().latest?.frame >= 28);
  assert.equal(await page.locator("#fps-counter").isVisible(), true);
  const capped = await page.evaluate(() => window.cityjump.performanceStats().latest);
  assert.ok(capped.frame > capped.cpu, JSON.stringify(capped));
  await page.evaluate(() => {
    window.cityjump.setRunRules({ kaijuSpawns: false });
    window.cityjump.setPaused(false);
  });
  await page.waitForFunction(() => {
    const sample = window.cityjump.performanceStats().latest;
    return sample?.costs.simulation > 0 && sample.costs.traffic > 0 && sample.costs.render > 0 && sample.costs.ui > 0;
  });
  const measuredRebuild = await page.evaluate(() => {
    const start = performance.now();
    window.cityjump.rebuild();
    return performance.now() - start;
  });
  await page.waitForFunction((duration) => window.cityjump.performanceStats().latest?.cpuPeak >= duration * 0.8, measuredRebuild);
  const rebuilt = await page.evaluate(() => window.cityjump.performanceStats().latest);
  assert.ok(rebuilt.costs.rebuild > 0, JSON.stringify(rebuilt));
  assert.ok(Math.abs(Object.values(rebuilt.costs).reduce((a, b) => a + b, 0) - rebuilt.cpu) < 0.001);
  assert.ok(rebuilt.gpu === null || rebuilt.gpu >= 0);
  console.log("ok: persisted toggle, independent FPS, 30 FPS interval, live scopes, exclusive totals, event rebuild peak");

  // Matched uncapped, paused scene; alternate settings to reduce warm-up/order bias.
  await settings(true);
  await settings(true, "#frame-cap");
  await page.selectOption("#frame-cap", "0");
  await settings(false);
  await page.evaluate(() => window.cityjump.setPaused(true));
  const rates = { off: [], on: [] };
  for (const enabled of [false, true, true, false]) {
    await graph(enabled);
    const fps = await page.evaluate(() => window.cityjump.measureFps(2000));
    rates[enabled ? "on" : "off"].push(fps);
  }
  await graph(false);
  await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(() => window.cityjump.performanceStats()), { enabled: false, samples: 0, latest: null });
  assert.equal(await page.locator("#fps-counter").isVisible(), true);
  console.log(`ok: capture clears and stops when disabled; software WebGL FPS ${JSON.stringify(rates)}`);
  await graph(true);
  await settings(true);
  await settings(true, "#frame-cap");
  await page.selectOption("#frame-cap", "60");
  await settings(false);
  await page.evaluate(() => {
    window.cityjump.setPaused(false);
    window.cityjump._scene.activeCamera.radius = 900;
    window.cityjump.selectVehicle();
  });
  // Fill most of the visible time axis; preserve a genuine rebuild spike in the final picture.
  await page.waitForTimeout(20_000);
  await page.evaluate(() => window.cityjump.rebuild());
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.cityjump.selectVehicle());
  await mkdir("docs/media", { recursive: true });
  const overlap = await page.evaluate(() => {
    const graph = document.getElementById("performance-panel").getBoundingClientRect();
    const selection = document.getElementById("selection-panel").getBoundingClientRect();
    const fps = document.getElementById("fps-counter").getBoundingClientRect();
    return graph.bottom > selection.top || fps.bottom > graph.top;
  });
  assert.equal(overlap, false);
  await page.screenshot({ path: "docs/media/performance-graph-desktop.png" });
  await page.locator("#performance-panel").screenshot({ path: "docs/media/performance-graph-panel.png" });
  await page.locator("#performance-chart").focus();
  const cameraBefore = await page.evaluate(() => window.cityjump.cameraState());
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.locator("#performance-tooltip").isVisible(), true);
  assert.match(await page.locator("#performance-tooltip").textContent(), /Traffic:.*ms/);
  assert.deepEqual(await page.evaluate(() => window.cityjump.cameraState()), cameraBefore);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#performance-tooltip").isHidden(), true);
  assert.equal(await page.locator("#selection-panel").isVisible(), true);
  await page.locator("#performance-chart").blur();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const bounds = await page.locator("#performance-panel").boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  await page.screenshot({ path: "docs/media/performance-graph-mobile.png" });
  // The graph must not cover the settings needed to turn it off on a narrow screen.
  await settings(true);
  await page.locator("#show-performance").uncheck();
  assert.equal(await page.locator("#performance-panel").isHidden(), true);
  await page.locator("#show-performance").check();
  await settings(false);
  await page.waitForFunction(() => window.cityjump.performanceStats().samples > 1);
  const unsupported = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await unsupported.addInitScript(() => {
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const getExtension = type.prototype.getExtension;
      type.prototype.getExtension = function (name) {
        return /disjoint_timer_query/.test(name) ? null : getExtension.call(this, name);
      };
    }
    localStorage.setItem("cityjump.settings", JSON.stringify({ performanceGraph: true }));
  });
  await unsupported.goto(url);
  await unsupported.waitForFunction(() => window.cityjump?.performanceStats().samples > 3);
  assert.equal(await unsupported.evaluate(() => window.cityjump.performanceStats().latest.gpu), null);
  assert.match(await unsupported.locator("#performance-summary").innerText(), /GPU unavailable/);
  await unsupported.close();
  console.log("ok: browser without GPU timer queries displays unavailable");
  await page.locator("#performance-close").click();
  assert.equal(await page.locator("#performance-panel").isHidden(), true);
  assert.equal(await page.locator("#show-performance").isChecked(), false);
  assert.equal(await page.locator("#fps-counter").isVisible(), true);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("cityjump.settings")).performanceGraph), false);
  assert.deepEqual(await page.evaluate(() => window.cityjump.performanceStats()), { enabled: false, samples: 0, latest: null });
  console.log("ok: close button disables capture, unchecks the saved setting and preserves FPS");
  assert.deepEqual(errors, []);
  const report = { capped, rebuilt, measuredRebuild, rates, latest: await page.evaluate(() => window.cityjump.performanceStats().latest) };
  await writeFile("/tmp/city-jump-performance-proof.json", JSON.stringify(report, null, 2));
  console.log("ok: desktop/mobile graph, selection spacing, keyboard inspection without camera movement, no browser errors");
} finally {
  await browser.close();
}
