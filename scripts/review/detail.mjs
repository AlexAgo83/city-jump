/**
 * Automatic building detail, checked by eye and by assertion in one pass.
 *
 * The camera walks near -> far -> back near, which is exactly the path that can leave a city
 * stuck: boxes that never turned back into models, or models that never became boxes. Each stop
 * captures a frame into docs/media and asserts what the frame should be showing.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fixturePath, launchOptions, root, url } from "./config.mjs";
import { waitForModels } from "../model-readiness.mjs";

const save = JSON.parse(readFileSync(fixturePath, "utf8"));
const media = (name) => resolve(root, "docs/media", `detail-${name}.png`);
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

/** What the scene actually shows right now, named the way the acceptance criteria are. */
const look = () =>
  page.evaluate(() => {
    const scene = window.cityjump._scene;
    const boxes = scene.meshes.find((m) => m.name === "building_distant");
    const models = scene.meshes.filter((m) => m.name.startsWith("building_") && m.name !== "building_distant" && m.thinInstanceCount > 0);
    const colors = boxes?.thinInstanceGetWorldMatrices ? boxes.thinInstanceCount : 0;
    return {
      radius: window.cityjump.cameraState().radius,
      boxesOn: Boolean(boxes?.isEnabled()),
      boxInstances: colors,
      modelsOn: models.filter((m) => m.isEnabled()).length,
      modelKinds: models.length,
      shadowCasters: scene.lights.flatMap((l) => l.getShadowGenerator?.()?.getShadowMap()?.renderList ?? []).length,
    };
  });

const at = async (radius, name) => {
  await page.evaluate((r) => window.cityjump.camera(r, Math.PI / 3), radius);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: media(name) });
  const state = await look();
  console.log(name, JSON.stringify(state));
  return state;
};

const near = await at(300, "near-models");
const far = await at(1600, "far-boxes");
const back = await at(300, "back-to-models");
// Between the thresholds, coming down from far: still boxes, because 1050 is above TO_MODELS.
await page.evaluate(() => window.cityjump.camera(1600, Math.PI / 3));
await page.waitForTimeout(800);
const between = await at(1050, "between-thresholds");

const fail = [];
const check = (ok, why) => { if (!ok) fail.push(why); };
check(near.boxesOn === false && near.modelsOn > 0, "near view must draw models, not boxes");
check(far.boxesOn === true && far.modelsOn === 0, "far view must draw boxes, not models");
check(far.boxInstances > 0, "far view must have distant boxes to draw");
check(back.boxesOn === false && back.modelsOn === near.modelsOn, "zooming back must restore every model and leave no stale boxes");
check(between.boxesOn === true, "coming down from far, boxes must survive between the thresholds");
check(near.shadowCasters > 0 && far.shadowCasters > 0, "both details must keep casting shadows");

// The manual override still wins at any height, and releasing it hands the city back to the camera.
await page.evaluate(() => window.cityjump.camera(300, Math.PI / 3));
await page.locator("#show-boxes").check();
await page.waitForTimeout(800);
await page.screenshot({ path: media("forced-boxes-near") });
const forced = await look();
console.log("forced-boxes-near", JSON.stringify(forced));
check(forced.boxesOn === true && forced.modelsOn === 0, "the override must draw boxes even close in");
await page.locator("#show-boxes").uncheck();
await page.waitForTimeout(800);
const released = await look();
console.log("released", JSON.stringify(released));
check(released.boxesOn === false && released.modelsOn === near.modelsOn, "releasing the override close in must restore the models");

// A rebuild replaces every mesh: the detail must survive it rather than come back stale.
await page.evaluate(() => window.cityjump.camera(1600, Math.PI / 3));
await page.waitForTimeout(800);
await page.evaluate(() => window.cityjump.rebuild());
await page.waitForTimeout(1500);
const rebuilt = await look();
console.log("after-rebuild-far", JSON.stringify(rebuilt));
check(rebuilt.boxesOn === true && rebuilt.modelsOn === 0, "a rebuild far out must still be boxes");

check(errors.length === 0, `page errors: ${errors.join("; ")}`);
await browser.close();
if (fail.length) {
  for (const why of fail) console.error("FAIL", why);
  process.exit(1);
}
console.log("detail: OK");
