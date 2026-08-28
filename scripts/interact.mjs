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
const toast = () => page.evaluate(() => document.getElementById("toast").textContent);
const previewVisible = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("preview")?.isEnabled() ?? false);
const nodeHighlighted = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("node-highlight")?.isEnabled() ?? false);
const buildableGridCells = () =>
  page.evaluate(() => (window.cityjump._scene.getMeshByName("buildable-grid")?.getTotalVertices() ?? 0) / 5);
const buildableGridVisible = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("buildable-grid")?.isEnabled() ?? false);
const worldGridVisible = () =>
  page.evaluate(() => (window.cityjump._scene.getMeshByName("world-grid")?.getTotalVertices() ?? 0) > 0);
// Sample water near the coast: the grid stretches outwards and wave amplitude is faded out far
// from the island, so the corner vertices are deliberately flat.
const oceanSampleY = () =>
  page.evaluate(() => {
    const positions = window.cityjump._scene.getMeshByName("ocean")?.getVerticesData("position");
    if (!positions) return 0;
    for (let i = 0; i < positions.length; i += 3) {
      const distance = Math.hypot(positions[i], positions[i + 2]);
      if (distance > 1500 && distance < 2500) return positions[i + 1];
    }
    return 0;
  });
const terrainColorVariation = () =>
  page.evaluate(() => {
    const mesh = window.cityjump._scene.getMeshByName("ground");
    const positions = mesh.getVerticesData("position");
    const colors = mesh.getVerticesData("color");
    const width = Math.round(Math.sqrt(positions.length / 3));
    const luminance = (i) => colors[i * 4] * 0.21 + colors[i * 4 + 1] * 0.72 + colors[i * 4 + 2] * 0.07;
    let variation = 0;
    let samples = 0;
    for (let z = 0; z < width; z += 4) {
      for (let x = 0; x < width - 1; x += 4) {
        const a = z * width + x;
        const b = a + 1;
        if (Math.abs(positions[a * 3 + 1] - positions[b * 3 + 1]) > 0.02) continue;
        variation += Math.abs(luminance(a) - luminance(b));
        samples++;
      }
    }
    return variation / samples;
  });
const tunnelPortalCount = () =>
  page.evaluate(() => window.cityjump._scene.meshes.filter((mesh) => mesh.name.startsWith("tunnel_portal_")).length);
const realStreetlightCount = () =>
  page.evaluate(() => {
    const scene = window.cityjump._scene;
    const cluster = scene.getLightByName("streetlight_lights");
    if (cluster?.lights.length) return cluster.isEnabled() ? cluster.lights.length : 0;
    return scene.lights.filter((light) => light.name.startsWith("streetlight_") && light.isEnabled()).length;
  });
const clusteredStreetlights = () =>
  page.evaluate(() => {
    const cluster = window.cityjump._scene.getLightByName("streetlight_lights");
    return cluster?.getClassName() === "ClusteredLightContainer" && cluster.isSupported;
  });
const streetlightsReachBuildings = () =>
  page.evaluate(() => {
    const scene = window.cityjump._scene;
    const cluster = scene.getLightByName("streetlight_lights");
    const lights = cluster?.isEnabled() ? cluster.lights : [];
    const buildings = scene.meshes.filter((mesh) => mesh.name.startsWith("building_") && mesh.isEnabled());
    const materialMaxLights = (material) =>
      Math.max(material?.maxSimultaneousLights ?? 0, ...(material?.subMaterials ?? []).map(materialMaxLights));
    const hasLitFacadeMaterial = buildings.some((mesh) => materialMaxLights(mesh.material) >= 32);
    const reaches = buildings.some((mesh) =>
      mesh.thinInstanceGetWorldMatrices().some((matrix) =>
        lights.some((light) => Math.hypot(matrix.m[12] - light.position.x, matrix.m[14] - light.position.z) < light.range),
      ),
    );
    return hasLitFacadeMaterial && reaches;
  });
const buildingFacadeEmission = () =>
  page.evaluate(() => {
    const materialEmission = (material) =>
      Math.max(
        material?.emissiveColor ? material.emissiveColor.r + material.emissiveColor.g + material.emissiveColor.b : 0,
        ...(material?.subMaterials ?? []).map(materialEmission),
      );
    return Math.max(
      0,
      ...window.cityjump._scene.meshes
        .filter((mesh) => mesh.name.startsWith("building_") && mesh.isEnabled())
        .map((mesh) => materialEmission(mesh.material)),
    );
  });
const buildingLightPipeline = () =>
  page.evaluate(() => {
    return window.cityjump._scene.meshes
      .filter((mesh) => mesh.name.startsWith("building_") && mesh.isEnabled())
      .every((mesh) => mesh.material?.getClassName?.() === "StandardMaterial");
  });
const streetlightFacadeLights = () =>
  page.evaluate(() => {
    const cluster = window.cityjump._scene.getLightByName("streetlight_lights");
    return cluster?.lights.some((light) => light.name.startsWith("streetlight_facade_") && light.range >= 40) ?? false;
  });
const shadowState = () =>
  page.evaluate(() => {
    const scene = window.cityjump._scene;
    const sun = scene.getLightByName("sun");
    const generator = sun?.getShadowGenerator();
    const renderList = generator?.getShadowMap()?.renderList ?? [];
    return {
      groundReceives: scene.getMeshByName("ground")?.receiveShadows ?? false,
      buildingsReceive: scene.meshes
        .filter((mesh) => mesh.name.startsWith("building_"))
        .every((mesh) => mesh.receiveShadows),
      casters: renderList.length,
      names: renderList.map((mesh) => mesh.name),
      generator: generator?.getClassName(),
      stabilized: generator?.stabilizeCascades ?? false,
      bias: generator?.bias ?? 0,
      normalBias: generator?.normalBias ?? 0,
      pcf: generator?.usePercentageCloserFiltering ?? false,
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
    const ambient = window.cityjump._scene.getLightByName("ambient");
    return { direction: [sun.direction.x, sun.direction.y, sun.direction.z], intensity: sun.intensity, ambient: ambient.intensity };
  });
const skyState = () =>
  page.evaluate(() => {
    const scene = window.cityjump._scene;
    const sky = scene.getMeshByName("skybox");
    const colors = sky?.getVerticesData("color") ?? [];
    const brightness = colors.length ? colors[0] * 0.21 + colors[1] * 0.72 + colors[2] * 0.07 : 0;
    return {
      sky: Boolean(sky),
      far: Boolean(sky && sky.scaling.x >= 10000 && sky.material?.disableDepthWrite),
      brightness,
      sun: scene.getMeshByName("sun_disc")?.isEnabled() ?? false,
      moon: scene.getMeshByName("moon_disc")?.isEnabled() ?? false,
    };
  });
const firstTreeShadowX = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("tree_ground_shadows")?.thinInstanceGetWorldMatrices()[0]?.m[12] ?? 0);
const densestTreeCluster = () =>
  page.evaluate(() => {
    const trees = window.cityjump._scene
      .getMeshByName("tree_trunks")
      .thinInstanceGetWorldMatrices()
      .map((matrix) => [matrix.m[12], matrix.m[14]]);
    let densest = 0;
    for (const [x, z] of trees) {
      let nearby = 0;
      for (const [otherX, otherZ] of trees) if ((x - otherX) ** 2 + (z - otherZ) ** 2 < 120 ** 2) nearby++;
      densest = Math.max(densest, nearby);
    }
    return densest;
  });

// Nothing has been drawn, so generated scenery is allowed but authored city state is not.
const fresh = await stats();
check(
  "a fresh map draws terrain and trees only",
  fresh.activeMeshes >= 4 && fresh.trees > 0 && fresh.segments === 0 && fresh.buildings === 0,
  `${JSON.stringify(fresh)}`,
);
const localTerrainVariation = await terrainColorVariation();
check("terrain colors have natural local variation", localTerrainVariation > 0.002, localTerrainVariation.toFixed(4));
const forestDensity = await densestTreeCluster();
check("some areas grow as dense forest", forestDensity >= 20, `${forestDensity} trees within 120 m`);
check("all sixteen parcel models load", fresh.models === 16, `${fresh.models} models`);
check("select is the default tool", (await page.locator('[data-tool="select"]').getAttribute("aria-pressed")) === "true");
check("the old lower-left HUD is removed", (await page.locator("#hud").count()) === 0);
const paletteBox = await page.locator("#action-palette").boundingBox();
check("the action palette is centered at the bottom", Math.abs(paletteBox.x + paletteBox.width / 2 - 500) < 2 && paletteBox.y > 620);
check("road actions are absent from the top toolbar", (await page.locator("#toolbar #road-type").count()) === 0);
const expandedToolbarWidth = (await page.locator("#toolbar").boundingBox()).width;
await page.locator("#toolbar-toggle").click();
const collapsedToolbarWidth = (await page.locator("#toolbar").boundingBox()).width;
check("the settings toolbar collapses into its right chevron", collapsedToolbarWidth < 50 && collapsedToolbarWidth < expandedToolbarWidth);
await page.locator("#toolbar-toggle").click();
check("the settings toolbar expands again", await page.locator("#toolbar-content").isVisible());

await page.locator("#show-grid").check();
check("the global reference grid can be shown", await worldGridVisible());
await page.locator('[data-tool="roads"]').click();
check("the road category opens its options", await page.locator("#road-options").isVisible());
await page.locator("#grid-snap").uncheck();
check("grid snapping can be disabled", !(await page.locator("#grid-snap").isChecked()));
await page.locator("#grid-snap").check();
await page.locator('[data-tool="power"]').click();
check("empty categories do not show road options", !(await page.locator("#road-options").isVisible()));
await page.locator('[data-tool="select"]').click();

const afternoonSun = await sunState();
const afternoonSky = await skyState();
check("the skybox shows the daytime sun", afternoonSky.sky && afternoonSky.sun && !afternoonSky.moon);
check("the skybox stays behind the playable island", afternoonSky.far);
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "20";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(60);
const eveningSun = await sunState();
const eveningSky = await skyState();
check(
  "the sun control changes angle and intensity",
  afternoonSun.direction.some((value, i) => Math.abs(value - eveningSun.direction[i]) > 0.1) &&
    eveningSun.intensity < afternoonSun.intensity &&
    eveningSun.ambient > 0.44,
);
check("the skybox shifts to evening", eveningSky.sun && eveningSky.moon && eveningSky.brightness < afternoonSky.brightness);
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "23";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(60);
const nightSky = await skyState();
check("the skybox shows the night moon", nightSky.moon && !nightSky.sun && nightSky.brightness < eveningSky.brightness);
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
  input.value = "21.95";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(350);
check("the automatic sun cycle skips from 22:00 to 05:00", (await page.locator("#sun-time").textContent()).startsWith("05:"));
await page.locator("#sun-auto").uncheck();

const click = async (x, y) => {
  await page.mouse.move(x, y);
  await page.waitForTimeout(90);
  await page.mouse.click(x, y);
  await page.waitForTimeout(160);
};

await click(260, 320);
check("select mode leaves left-click to the camera", (await stats()).segments === 0);
const oceanBefore = await oceanSampleY();
await page.waitForTimeout(250);
check("the ocean surface is animated", Math.abs((await oceanSampleY()) - oceanBefore) > 0.01);
await page.locator('[data-tool="roads"]').click();
await page.locator('input[name="road-shape"][value="curve"]').check();

await page.mouse.click(360, 360, { button: "right" });
check("right-click is camera-only, not drawing input", !(await previewVisible()) && (await stats()).segments === 0);

await click(300, 340);
await page.mouse.move(400, 330);
check("the first click arms the tool", await previewVisible());
await page.mouse.click(360, 360, { button: "right" });
await page.mouse.move(420, 330);
check("right-click does not cancel an armed road", await previewVisible());
await click(500, 280);
await page.mouse.move(600, 330);
check("the second click takes the bend", await previewVisible());
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
check("streetlights stay off at 17:00", (await realStreetlightCount()) === 0);
check("buildings do not use fake emissive lighting by day", (await buildingFacadeEmission()) === 0);
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "21";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
check("streetlights stay off at 21:00", (await realStreetlightCount()) === 0);
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "22";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
check("streetlights switch on at 22:00", (await realStreetlightCount()) > 0);
check("streetlights include facade fill lights", await streetlightFacadeLights());
check("streetlights reach nearby buildings", await streetlightsReachBuildings());
check("buildings do not use fake emissive lighting by night", (await buildingFacadeEmission()) === 0);
check("buildings use the same night lighting pipeline as scenery", await buildingLightPipeline());
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
check("the buildable grid reaches up to four cells from the road", gridCells > 0 && gridCells <= drawn.buildings * 16, `${gridCells} cells`);
check("the buildable grid is visible while drawing roads", await buildableGridVisible());
await page.locator('[data-tool="select"]').click();
check("view mode hides the buildable grid", !(await buildableGridVisible()));
await page.locator('[data-tool="roads"]').click();
check("road mode restores the buildable grid", await buildableGridVisible());
const shadows = await shadowState();
check("buildings cast shadows onto the ground", shadows.groundReceives && shadows.casters >= drawn.models, `${JSON.stringify(shadows)}`);
check("buildings receive shadows from neighbouring buildings", shadows.buildingsReceive);
check("building shadows use stabilized cascades", shadows.generator === "CascadedShadowGenerator" && shadows.stabilized);
check("building shadows avoid acne", shadows.bias >= 0.002 && shadows.normalBias >= 0.08 && shadows.pcf);
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

await page.locator('input[name="road-shape"][value="straight"]').check();
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
await page.locator('input[name="road-shape"][value="curve"]').check();

// A road shorter than the minimum has to be refused, with a reason the player can read.
await click(200, 600);
await click(203, 602);
await click(206, 604);
const refusedText = await toast();
check("a refused road says why", refusedText.length > 0, JSON.stringify(refusedText));
check("a refused road is not added", (await stats()).segments === tunneled.segments);

await page.locator('[data-tool="bulldoze"]').click();
await page.mouse.move(805, 465);
await page.waitForTimeout(100);
check("the bulldozer highlights a road under the pointer", await previewVisible());
const beforeBulldoze = await stats();
await click(805, 465);
const afterBulldoze = await stats();
check("the bulldozer removes the clicked road", afterBulldoze.segments === beforeBulldoze.segments - 1);

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
  ruggedNetwork.streetlights > 0 && ruggedNetwork.realStreetlights >= ruggedNetwork.streetlights,
  `${ruggedNetwork.realStreetlights}/${ruggedNetwork.streetlights}`,
);

const cameraTarget = () =>
  page.evaluate(() => {
    const camera = window.cityjump._scene.activeCamera;
    return { x: camera.target.x, z: camera.target.z, alpha: camera.alpha };
  });
const holdKey = async (key) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(400);
  await page.keyboard.up(key);
  await page.waitForTimeout(100);
};

// alpha = -PI/2 puts the camera at -Z looking towards +Z, so "forward" has to be +Z.
await page.evaluate(() => window.cityjump.camera(400, Math.PI / 3, -Math.PI / 2));
await page.waitForTimeout(300);
const panStart = await cameraTarget();
await holdKey("ArrowUp");
const panForward = await cameraTarget();
check("arrow up moves the camera forward, not around", panForward.z > panStart.z + 50, `z ${panForward.z.toFixed(0)}`);
check("arrow keys no longer orbit", panForward.alpha === panStart.alpha);
await holdKey("ArrowRight");
const panStrafe = await cameraTarget();
check("arrow right strafes sideways", panStrafe.x > panForward.x + 50, `x ${panStrafe.x.toFixed(0)}`);

// Turn the camera a quarter turn: "forward" must follow it onto another world axis.
await page.evaluate(() => window.cityjump.camera(400, Math.PI / 3, 0));
await page.waitForTimeout(300);
const turnedStart = await cameraTarget();
await holdKey("ArrowUp");
const turnedForward = await cameraTarget();
check(
  "forward follows the live camera direction",
  turnedForward.x < turnedStart.x - 50 && Math.abs(turnedForward.z - turnedStart.z) < 20,
  `x ${turnedForward.x.toFixed(0)} z ${turnedForward.z.toFixed(0)}`,
);

check("no errors or missing side-effect imports", noise.length === 0, noise.join(" / "));

if (shot) await page.screenshot({ path: shot });
await browser.close();

console.log(failures.length === 0 ? "\nall interaction checks passed" : `\n${failures.length} FAILED`);
process.exit(failures.length === 0 ? 0 : 1);
