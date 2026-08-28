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
const worldGridVisible = () =>
  page.evaluate(() => (window.cityjump._scene.getMeshByName("world-grid")?.getTotalVertices() ?? 0) > 0);
const shadowState = () =>
  page.evaluate(() => {
    const scene = window.cityjump._scene;
    const sun = scene.getLightByName("sun");
    return {
      groundReceives: scene.getMeshByName("ground")?.receiveShadows ?? false,
      casters: sun?.getShadowGenerator()?.getShadowMap()?.renderList?.length ?? 0,
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

// Nothing has been drawn, so nothing but the ground and ocean may be on screen. A building model
// with no instance buffer still draws itself at the origin if it is left enabled.
const fresh = await stats();
check("a fresh map draws only the ground and ocean", fresh.activeMeshes === 2, `${fresh.activeMeshes} active meshes`);
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
await page.locator("#sun-auto").check();
await page.waitForTimeout(1100);
check("the automatic sun cycle advances by 15 minutes", (await page.locator("#sun-time").textContent()).startsWith("20:15"));
await page.locator("#sun-auto").uncheck();

const click = async (x, y) => {
  await page.mouse.move(x, y);
  await page.waitForTimeout(90);
  await page.mouse.click(x, y);
  await page.waitForTimeout(160);
};

await click(260, 320);
check("view mode leaves left-click to the camera", (await hud()).includes("camera only") && (await stats()).segments === 0);
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
check("roads spawn test traffic", drawn.cars > 0, `${drawn.cars} cars`);
const beforeTraffic = await trafficPositions();
await page.waitForTimeout(250);
const afterTraffic = await trafficPositions();
check("test traffic moves along roads", beforeTraffic.some((p, i) => Math.hypot(p[0] - afterTraffic[i][0], p[1] - afterTraffic[i][1]) > 0.5));
const gridCells = await buildableGridCells();
check("the buildable grid reaches up to five cells from the road", gridCells > 0 && gridCells <= drawn.buildings * 10, `${gridCells} cells`);
const shadows = await shadowState();
check("buildings cast shadows onto the ground", shadows.groundReceives && shadows.casters >= drawn.models, `${JSON.stringify(shadows)}`);

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
await page.locator("#road-type").selectOption("street");
await page.locator('input[name="road-mode"][value="curve"]').check();

// A road shorter than the minimum has to be refused, with a reason the player can read.
await click(200, 600);
await click(203, 602);
await click(206, 604);
const refusedText = await toast();
check("a refused road says why", refusedText.length > 0, JSON.stringify(refusedText));
check("a refused road is not added", (await stats()).segments === straight.segments);

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
check("roads still render on rugged terrain", (await stats()).segments > 0);

check("no errors or missing side-effect imports", noise.length === 0, noise.join(" / "));

if (shot) await page.screenshot({ path: shot });
await browser.close();

console.log(failures.length === 0 ? "\nall interaction checks passed" : `\n${failures.length} FAILED`);
process.exit(failures.length === 0 ? 0 : 1);
