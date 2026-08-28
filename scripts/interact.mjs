// Drives the app through the pointer, the way a player does, and fails loudly.
//
//   node scripts/interact.mjs [url] [shot.png]
//
// This exists because scripts/shot.mjs builds its roads through the debug API, which
// never touches picking -- so a broken drawing tool passed every check. Whatever else
// changes, a click has to still draw a road.
import { chromium } from "playwright";

const [url = "http://localhost:5173", shot = null] = process.argv.slice(2);
const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  -- ${detail}` : ""}`);
  if (!ok) failures.push(name);
};

const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });

const noise = [];
page.on("pageerror", (e) => noise.push(`exception: ${e.message}`));
page.on("console", (m) => {
  const text = m.text();
  if (m.type() === "error" || /needs to be imported/.test(text)) noise.push(text);
});

await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => Boolean(window.cityjump), null, { timeout: 20_000 });
await page.waitForTimeout(600);

const stats = () => page.evaluate(() => window.cityjump.stats());
const hud = () => page.evaluate(() => document.getElementById("hud").textContent);
const toast = () => page.evaluate(() => document.getElementById("toast").textContent);
const nodeHighlighted = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("node-highlight")?.isEnabled() ?? false);
const buildableGridCells = () =>
  page.evaluate(() => (window.cityjump._scene.getMeshByName("buildable-grid")?.getTotalVertices() ?? 0) / 5);
const buildableGridVisible = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("buildable-grid")?.isEnabled() ?? false);
const worldGridVisible = () =>
  page.evaluate(() => (window.cityjump._scene.getMeshByName("world-grid")?.getTotalVertices() ?? 0) > 0);
const oceanSampleY = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("ocean")?.getVerticesData("position")?.[1] ?? 0);
const tunnelPortalCount = () =>
  page.evaluate(() => window.cityjump._scene.meshes.filter((mesh) => mesh.name.startsWith("tunnel_portal_")).length);
const realStreetlightCount = () =>
  page.evaluate(() => {
    const scene = window.cityjump._scene;
    const cluster = scene.getLightByName("streetlight_lights");
    if (cluster?.lights.length) return cluster.isEnabled() ? cluster.lights.length : 0;
    return scene.lights.filter((light) => light.name.startsWith("streetlight_light_") && light.isEnabled()).length;
  });
const clusteredStreetlights = () =>
  page.evaluate(() => {
    const cluster = window.cityjump._scene.getLightByName("streetlight_lights");
    return cluster?.getClassName() === "ClusteredLightContainer" && cluster.isSupported;
  });
const shadowState = () =>
  page.evaluate(() => {
    const scene = window.cityjump._scene;
    const sun = scene.getLightByName("sun");
    const generator = sun?.getShadowGenerator();
    const renderList = generator?.getShadowMap()?.renderList ?? [];
    return {
      groundReceives: scene.getMeshByName("ground")?.receiveShadows ?? false,
      casters: renderList.length,
      names: renderList.map((mesh) => mesh.name),
      generator: generator?.getClassName(),
      stabilized: generator?.stabilizeCascades ?? false,
    };
  });
const trafficPositions = () =>
  page.evaluate(() =>
    window.cityjump._scene.meshes
      .filter((mesh) => mesh.name.startsWith("traffic_"))
      .map((mesh) => [mesh.position.x, mesh.position.z]),
  );
const sunState = () =>
  page.evaluate(() => {
    const sun = window.cityjump._scene.getLightByName("sun");
    return { direction: [sun.direction.x, sun.direction.y, sun.direction.z], intensity: sun.intensity };
  });
const firstTreeShadowX = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("tree_ground_shadows")?.thinInstanceGetWorldMatrices()[0]?.m[12] ?? 0);

// Nothing has been drawn, so generated scenery is allowed but authored city state is not.
const fresh = await stats();
check(
  "a fresh map draws terrain and trees only",
  fresh.activeMeshes >= 4 && fresh.trees > 0 && fresh.segments === 0 && fresh.buildings === 0,
  `${JSON.stringify(fresh)}`,
);
check("view mode is selected by default", (await hud()).includes("camera only"));

await page.locator("#show-grid").check();
check("the global reference grid can be shown", await worldGridVisible());
await page.locator("#grid-snap").uncheck();
check("grid snapping can be disabled", !(await page.locator("#grid-snap").isChecked()));
await page.locator("#grid-snap").check();

const afternoonSun = await sunState();
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "20";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const eveningSun = await sunState();
check(
  "the sun control changes angle and intensity",
  afternoonSun.direction.some((value, i) => Math.abs(value - eveningSun.direction[i]) > 0.1) && eveningSun.intensity < afternoonSun.intensity,
);
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "8";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const morningTreeShadowX = await firstTreeShadowX();
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "16";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
check("tree ground shadows follow the sun direction", Math.abs((await firstTreeShadowX()) - morningTreeShadowX) > 2);
await page.locator("#sun-auto").check();
await page.waitForTimeout(350);
const autoMinute = Number((await page.locator("#sun-time").textContent()).split(":")[1]);
check("the automatic sun cycle advances smoothly", autoMinute > 0 && autoMinute < 15, `${autoMinute} minutes`);
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "20.95";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(350);
check("the automatic sun cycle skips from 21:00 to 05:00", (await page.locator("#sun-time").textContent()).startsWith("05:"));
await page.locator("#sun-auto").uncheck();

const click = async (x, y) => {
  await page.mouse.move(x, y);
  await page.waitForTimeout(90);
  await page.mouse.click(x, y);
  await page.waitForTimeout(160);
};

await click(260, 320);
check("view mode leaves left-click to the camera", (await hud()).includes("camera only") && (await stats()).segments === 0);
const oceanBefore = await oceanSampleY();
await page.waitForTimeout(250);
check("the ocean surface is animated", Math.abs((await oceanSampleY()) - oceanBefore) > 0.01);
await page.locator('input[name="road-mode"][value="curve"]').check();

await page.mouse.click(360, 360, { button: "right" });
check("right-click is camera-only, not drawing input", (await hud()).includes("start a road") && (await stats()).segments === 0);

await click(300, 340);
check("the first click arms the tool", (await hud()).includes("place the bend"));
await page.mouse.click(360, 360, { button: "right" });
check("right-click does not cancel an armed road", (await hud()).includes("place the bend"));
await click(500, 280);
check("the second click takes the bend", (await hud()).includes("finish the road"));
await click(700, 360);

const drawn = await stats();
check("three clicks draw a road", drawn.segments === 1, `${drawn.segments} segments`);
check("the road grows buildings", drawn.buildings > 0, `${drawn.buildings} buildings`);
check("roads grow streetlights", drawn.streetlights > 0, `${drawn.streetlights} streetlights`);
check("streetlights are real downward lights", (await realStreetlightCount()) > 0);
check("streetlights use clustered lighting", await clusteredStreetlights());
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "8";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
check("streetlights switch off at 08:00", (await realStreetlightCount()) === 0);
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "17";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
check("streetlights switch on at 17:00", (await realStreetlightCount()) > 0);
await page.locator("#show-buildings").uncheck();
check("generated buildings can be hidden", (await stats()).buildings === 0);
await page.locator("#show-buildings").check();
check("generated buildings can be restored", (await stats()).buildings === drawn.buildings);
check("roads spawn test traffic", drawn.cars > 0, `${drawn.cars} cars`);
const beforeTraffic = await trafficPositions();
await page.waitForTimeout(250);
const afterTraffic = await trafficPositions();
check("test traffic moves along roads", beforeTraffic.some((p, i) => Math.hypot(p[0] - afterTraffic[i][0], p[1] - afterTraffic[i][1]) > 0.5));
const gridCells = await buildableGridCells();
check("the buildable grid reaches up to five cells from the road", gridCells > 0 && gridCells <= drawn.buildings * 10, `${gridCells} cells`);
check("the buildable grid is visible while drawing roads", await buildableGridVisible());
await page.locator('input[name="road-mode"][value="view"]').check();
check("view mode hides the buildable grid", !(await buildableGridVisible()));
await page.locator('input[name="road-mode"][value="curve"]').check();
check("road mode restores the buildable grid", await buildableGridVisible());
const shadows = await shadowState();
check("buildings cast shadows onto the ground", shadows.groundReceives && shadows.casters >= drawn.models, `${JSON.stringify(shadows)}`);
check("building shadows use stabilized cascades", shadows.generator === "CascadedShadowGenerator" && shadows.stabilized);
check(
  "trees cast shadows onto the ground",
  shadows.groundReceives && shadows.names.includes("tree_trunks") && shadows.names.includes("tree_canopies"),
  `${JSON.stringify(shadows)}`,
);

await page.mouse.move(702, 360);
await page.waitForTimeout(100);
check("an existing node is highlighted inside its snap radius", await nodeHighlighted());

// A second road ending on the first has to split it and make a junction.
await click(500, 480);
await click(500, 420);
await click(500, 318);
const branched = await stats();
check("a road drawn onto another splits it into a junction", branched.junctions >= 1, `${branched.junctions} junctions`);

await page.locator('input[name="road-mode"][value="straight"]').check();
await page.locator("#road-type").selectOption("avenue");
await click(760, 500);
await click(850, 430);
const straight = await stats();
check("straight mode draws a road in two clicks", straight.segments === branched.segments + 1, `${straight.segments} segments`);
check("the road type selector draws avenues", straight.avenues >= 1, `${straight.avenues} avenues`);
await page.locator("#road-type").selectOption("tunnel");
await click(220, 500);
await click(300, 430);
const tunneled = await stats();
check("the road type selector draws tunnels", tunneled.tunnels >= 1, `${tunneled.tunnels} tunnels`);
check("tunnels render an entrance and exit", (await tunnelPortalCount()) >= 2);
check("tunnels do not grow surface buildings or traffic", tunneled.buildings === straight.buildings && tunneled.cars === straight.cars);
await page.locator("#road-type").selectOption("street");
await page.locator('input[name="road-mode"][value="curve"]').check();

// A road shorter than the minimum has to be refused, with a reason the player can read.
await click(200, 600);
await click(203, 602);
await click(206, 604);
const refusedText = await toast();
check("a refused road says why", refusedText.length > 0, JSON.stringify(refusedText));
check("a refused road is not added", (await stats()).segments === tunneled.segments);

page.once("dialog", (dialog) => dialog.accept());
await page.locator("#terrain").selectOption("rugged");
await page.waitForTimeout(250);
const rugged = await stats();
const terrainRelief = await page.evaluate(() => {
  const bounds = window.cityjump._scene.getMeshByName("ground").getBoundingInfo().boundingBox;
  return bounds.maximumWorld.y - bounds.minimumWorld.y;
});
check("changing terrain resets the fixed-elevation road graph", rugged.segments === 0);
check("the rugged terrain has substantial relief", terrainRelief > 20, `${terrainRelief.toFixed(1)} m`);
await page.evaluate(() => window.cityjump.demoNetwork());
await page.waitForTimeout(200);
const ruggedNetwork = await stats();
check("roads still render on rugged terrain", ruggedNetwork.segments > 0);
check(
  "every streetlight has a real light",
  ruggedNetwork.streetlights > 0 && ruggedNetwork.realStreetlights === ruggedNetwork.streetlights,
  `${ruggedNetwork.realStreetlights}/${ruggedNetwork.streetlights}`,
);

check("no errors or missing side-effect imports", noise.length === 0, noise.join(" / "));

if (shot) await page.screenshot({ path: shot });
await browser.close();

console.log(failures.length === 0 ? "\nall interaction checks passed" : `\n${failures.length} FAILED`);
process.exit(failures.length === 0 ? 0 : 1);
