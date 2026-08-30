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
await page.addInitScript(() => {
  const nativeMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query) =>
    query === "(pointer: coarse)"
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }
      : nativeMatchMedia(query);
});
// Playwright's 30s default action timeout is sized for a GPU-accelerated browser. This page
// renders through software WebGL (swiftshader), and CI runs it on a shared, CPU-constrained
// runner on top of that -- individual steps routinely take 10-40s there even when nothing is
// wrong, so a click that lands a hair over 30s is the environment, not a stuck element. Two
// separate CI runs hit this timeout on two different controls (a checkbox, then a radio input)
// with the click itself reported as delivered each time -- the same failure mode, not two bugs.
page.setDefaultTimeout(90_000);

const noise = [];
page.on("pageerror", (e) => noise.push(`exception: ${e.message}`));
page.on("console", (m) => {
  const text = m.text();
  if (m.type() === "error" || /needs to be imported/.test(text)) noise.push(text);
});

const nextFrame = async () => {
  const frame = await page.evaluate(() => window.cityjump?._scene?.getFrameId?.() ?? 0);
  await page.waitForFunction((start) => (window.cityjump?._scene?.getFrameId?.() ?? 0) > start, frame, { timeout: 5_000 });
};
const waitForApp = async () => {
  await page.waitForFunction(() => Boolean(window.cityjump), null, { timeout: 20_000 });
  await nextFrame();
};
const waitCameraStill = () =>
  page.waitForFunction(
    () => {
      const camera = window.cityjump._scene.activeCamera;
      const key = `${camera.alpha.toFixed(4)}:${camera.beta.toFixed(4)}:${camera.target.x.toFixed(2)}:${camera.target.z.toFixed(2)}`;
      const stable = window.__cityjumpCameraKey === key;
      window.__cityjumpCameraKey = key;
      return stable;
    },
    null,
    { polling: 80, timeout: 5_000 },
  );
// Only for checks that need real elapsed time: animation, movement, held keys, or debounced autosave.
const realTime = (ms) => page.waitForTimeout(ms);

await page.goto(url, { waitUntil: "load" });
await waitForApp();
check("coarse pointer visitors see the desktop input notice", await page.locator("#touch-notice").isVisible());

const stats = () => page.evaluate(() => window.cityjump.stats());
const toast = () => page.evaluate(() => document.getElementById("toast").textContent);
const previewVisible = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("preview")?.isEnabled() ?? false);
const waitForPreview = () =>
  page.waitForFunction(() => window.cityjump._scene.getMeshByName("preview")?.isEnabled() ?? false, null, { timeout: 5_000 });
const nodeHighlighted = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("node-highlight")?.isEnabled() ?? false);
const buildableGridCells = () =>
  page.evaluate(() => (window.cityjump._scene.getMeshByName("buildable-grid")?.getTotalVertices() ?? 0) / 5);
const buildableGridVisible = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("buildable-grid")?.isEnabled() ?? false);
const brushRingRadius = () =>
  page.evaluate(() => {
    const mesh = window.cityjump._scene.getMeshByName("spray-ring");
    const positions = mesh?.getVerticesData("position");
    if (!mesh?.isEnabled() || !positions?.length) return 0;
    let cx = 0;
    let cz = 0;
    const count = positions.length / 3;
    for (let i = 0; i < positions.length; i += 3) {
      cx += positions[i];
      cz += positions[i + 2];
    }
    cx /= count;
    cz /= count;
    let max = 0;
    for (let i = 0; i < positions.length; i += 3) max = Math.max(max, Math.hypot(positions[i] - cx, positions[i + 2] - cz));
    return max;
  });
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
    const materialIsStandard = (material) =>
      material?.subMaterials ? material.subMaterials.every(materialIsStandard) : material?.getClassName?.() === "StandardMaterial";
    return window.cityjump._scene.meshes
      .filter((mesh) => mesh.name.startsWith("building_") && mesh.isEnabled())
      .every((mesh) => materialIsStandard(mesh.material));
  });
const buildingModelCounts = () =>
  page.evaluate(() =>
    Object.fromEntries(
      window.cityjump._scene.meshes
        .filter((mesh) => mesh.name.startsWith("building_lot_"))
        .map((mesh) => [mesh.name, mesh.thinInstanceCount ?? 0]),
    ),
  );
const zonesOverlayVisible = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("zones-overlay")?.isEnabled() ?? false);
const trafficOverlayCounts = () =>
  page.evaluate(() => {
    const visible = (prefix) => window.cityjump._scene.meshes.filter((mesh) => mesh.name.startsWith(prefix) && mesh.isEnabled()).length;
    return {
      lanes: visible("traffic_lane_"),
      turns: visible("traffic_turn_") + visible("traffic_ring_turn_") + visible("traffic_walk_turn_"),
    };
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
      .getMeshByName("tree_trunks_fir")
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
check("startup does not wait for all parcel models", fresh.startupModels < 16, `${fresh.startupModels} models ready at renderer return`);
await page.waitForFunction(() => window.cityjump.stats().models === 16, null, { timeout: 20_000 });
check("all sixteen parcel models load", (await stats()).models === 16, `${(await stats()).models} models`);
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
check(
  "zones sits between Roads and Power",
  (await page.locator("#action-palette [data-tool]").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("data-tool")).join(","))).startsWith(
    "select,roads,zones,power",
  ),
);
await page.locator('[data-tool="zones"]').click();
check("zone mode switches to the Zones view", await page.locator('input[name="select-view"][value="no-buildings"]').isChecked());
check("zone mode exposes a brush size slider", await page.locator("#zone-radius").isVisible());
await page.locator('[data-tool="roads"]').click();
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
await nextFrame();
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
await nextFrame();
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
await realTime(350);
const autoMinute = Number((await page.locator("#sun-time").textContent()).split(":")[1]);
// The cycle advances by real elapsed time between rendered frames, not by this wait's length --
// a single slow/stalled frame (a loaded CI runner, a GC pause) can jump it far more than a fast
// local machine ever would. The invariant worth asserting is "it moved forward on its own",
// not a tight rate that only holds when every frame lands close to on time.
check("the automatic sun cycle advances on its own", autoMinute > 0, `${autoMinute} minutes`);
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "21.95";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await realTime(350);
check("the automatic sun cycle skips from 22:00 to 05:00", (await page.locator("#sun-time").textContent()).startsWith("05:"));

// With short night off the clock wraps through 24 instead, so the whole night is playable.
await page.locator("#short-night").uncheck();
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "21.95";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await realTime(350);
const throughNight = await page.locator("#sun-time").textContent();
check("with short night off the cycle runs past 22:00 into the night", throughNight.startsWith("22:"), throughNight);
await page.locator("#short-night").check();
await page.locator("#sun-auto").uncheck();
// Auto freezes the hour wherever the real-time cycle last landed -- fine for the checks above,
// which only assert it stayed within a broad window, but the streetlight checks right after the
// next road is drawn need a hour that is reliably night. Pin it explicitly rather than trust the
// frozen value, which is exactly as timing-sensitive as the cycle that produced it.
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "22";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});

const click = async (x, y) => {
  await page.mouse.move(x, y);
  await nextFrame();
  await page.mouse.click(x, y);
  await nextFrame();
};

await click(260, 320);
check("select mode leaves left-click to the camera", (await stats()).segments === 0);
const oceanBefore = await oceanSampleY();
await realTime(250);
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
  input.value = "19.5";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
check("streetlights stay off at 19:30", (await realStreetlightCount()) === 0);
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "20";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
check("streetlights switch on at 20:00", (await realStreetlightCount()) > 0);
check(
  "cars carry headlights that light the road, and red lamps at the back",
  await page.evaluate(() => {
    const scene = window.cityjump._scene;
    const beams = () => scene.lights.find((l) => l.name === "car_headlights");
    const lamps = scene.meshes.filter((m) => m.name.startsWith("car_head_") || m.name.startsWith("car_tail_"));
    const slider = document.querySelector('input[type="range"]');
    const setHour = (hour) => {
      slider.value = String(hour);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setHour(14);
    const byDay = beams()?.isEnabled();
    setHour(22);
    const byNight = beams()?.isEnabled();
    // Lamps on every shape, front and back, and beams that burn only after dark.
    return lamps.length >= 6 && byDay === false && byNight === true;
  }),
);
check("streetlights include facade fill lights", await streetlightFacadeLights());
check("streetlights reach nearby buildings", await streetlightsReachBuildings());
check("buildings do not use fake emissive lighting by night", (await buildingFacadeEmission()) === 0);
check("buildings use the same night lighting pipeline as scenery", await buildingLightPipeline());
await page.locator("#show-buildings").uncheck();
check("generated buildings can be hidden", (await stats()).buildings === 0);
await page.locator("#show-buildings").check();
check("generated buildings can be restored", (await stats()).buildings === drawn.buildings);
const unzonedModels = await buildingModelCounts();
await page.locator('[data-tool="zones"]').click();
await page.locator("#zone-radius").evaluate((input) => {
  input.value = "56";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.locator('input[name="zone-kind"][value="dense"]').check();
await click(500, 350);
await page.waitForFunction(() => window.cityjump.stats().zones > 0, null, { timeout: 5_000 });
const zoned = await stats();
const denseModels = await buildingModelCounts();
check("a zone can be painted from the toolbar", zoned.zones > 0, `${zoned.zones} cells`);
check("zoning changes what gets built", JSON.stringify(denseModels) !== JSON.stringify(unzonedModels));
await page.locator('[data-tool="select"]').click();
await page.locator('input[name="select-view"][value="no-buildings"]').check();
check("the Zones view shows the player's zones", await zonesOverlayVisible());
check("the buildable grid stays readable under zones", await buildableGridVisible());
await page.locator('[data-tool="zones"]').click();
await page.locator('input[name="zone-kind"][value="clear"]').check();
await click(500, 350);
await page.waitForFunction(() => window.cityjump.stats().zones === 0, null, { timeout: 5_000 });
check("a zone can be cleared from the toolbar", (await stats()).zones === 0);
check("clearing a zone restores the unzoned building mix", JSON.stringify(await buildingModelCounts()) === JSON.stringify(unzonedModels));
await page.locator('[data-tool="select"]').click();
await page.locator('input[name="select-view"][value="all"]').check();
await page.locator('[data-tool="roads"]').click();
check("roads spawn test traffic", drawn.cars > 0, `${drawn.cars} cars`);
const beforeTraffic = await trafficPositions();
await realTime(250);
const afterTraffic = await trafficPositions();
check("test traffic moves along roads", beforeTraffic.some((p, i) => Math.hypot(p[0] - afterTraffic[i][0], p[1] - afterTraffic[i][1]) > 0.5));
await page.locator('[data-tool="select"]').click();
await page.locator('input[name="select-view"][value="traffic"]').check();
await nextFrame();
const trafficView = await trafficOverlayCounts();
check("the Traffic view draws lane overlays", trafficView.lanes > 0, JSON.stringify(trafficView));
await page.locator('input[name="select-view"][value="all"]').check();
await page.locator('[data-tool="roads"]').click();
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
  shadows.groundReceives &&
    shadows.names.includes("tree_trunks_fir") &&
    shadows.names.includes("tree_canopies_fir") &&
    shadows.names.includes("tree_canopies_palm"),
  `${JSON.stringify(shadows)}`,
);

await page.mouse.move(702, 360);
await nextFrame();
check("an existing node is highlighted inside its snap radius", await nodeHighlighted());

// A second road ending on the first has to split it and make a junction.
await click(500, 480);
await click(500, 420);
await click(500, 318);
const branched = await stats();
check("a road drawn onto another splits it into a junction", branched.junctions >= 1, `${branched.junctions} junctions`);
await page.locator('[data-tool="select"]').click();
await page.locator('input[name="select-view"][value="traffic"]').check();
await nextFrame();
const trafficJunctionView = await trafficOverlayCounts();
check("the Traffic view draws junction overlays", trafficJunctionView.turns > 0, JSON.stringify(trafficJunctionView));
await page.locator('input[name="select-view"][value="all"]').check();
await page.locator('[data-tool="roads"]').click();

await page.locator('input[name="road-shape"][value="straight"]').check();
await page.locator('input[name="road-type"][value="avenue"]').check();
await click(760, 500);
await click(850, 430);
const straight = await stats();
check("straight mode draws a road in two clicks", straight.segments === branched.segments + 1, `${straight.segments} segments`);
check("the road type selector draws avenues", straight.avenues >= 1, `${straight.avenues} avenues`);
await page.locator('input[name="road-type"][value="tunnel"]').check();
await click(220, 500);
await click(300, 430);
const tunneled = await stats();
check("the road type selector draws tunnels", tunneled.tunnels >= 1, `${tunneled.tunnels} tunnels`);
check("tunnels render an entrance and exit", (await tunnelPortalCount()) >= 2);
check("tunnels do not grow surface buildings or traffic", tunneled.buildings === straight.buildings && tunneled.cars === straight.cars);

// A pedestrian path carries people on foot and no cars at all.
await page.locator('input[name="road-type"][value="pedestrian"]').check();
await click(180, 300);
await click(560, 250);
const walked = await stats();
check("the road type selector draws pedestrian paths", walked.segments === tunneled.segments + 1, `${walked.segments} segments`);
check("a pedestrian path is populated on foot", walked.pedestrians > tunneled.pedestrians, `${walked.pedestrians} pedestrians`);
check("a pedestrian path puts no cars on the road", walked.cars === tunneled.cars, `${walked.cars} vs ${tunneled.cars}`);
const walkerPositions = () =>
  page.evaluate(() =>
    window.cityjump._scene.meshes
      .filter((mesh) => mesh.name.startsWith("pedestrian_"))
      .map((mesh) => [mesh.position.x, mesh.position.z]),
  );
const walkersBefore = await walkerPositions();
await realTime(900);
const walkersAfter = await walkerPositions();
check(
  "pedestrians walk along the path",
  walkersBefore.length > 0 &&
    walkersBefore.every(([x, z], i) => Math.hypot(x - walkersAfter[i][0], z - walkersAfter[i][1]) > 0.3),
  `${walkersBefore.length} walking`,
);
check(
  "a pedestrian path grows buildings of its own",
  walked.buildings > tunneled.buildings,
  `${walked.buildings} vs ${tunneled.buildings}`,
);
check(
  "a crossing is painted where someone on foot has to walk over a road",
  await page.evaluate(() => window.cityjump._scene.meshes.filter((m) => m.name.startsWith("crossing_")).length > 0),
);
// The other half of that rule: a road that merely bends at a node is not a place anyone crosses,
// so it gets no paint. This used to be painted on principle, one zebra per arm. Built well clear
// of the city under test and taken away again, so nothing else here sees it.
check(
  "a road that only bends at a node gets no crossing",
  await page.evaluate(() => {
    const api = window.cityjump;
    const graph = api._graph;
    const before = new Set(graph.allSegments().map((s) => s.id));
    api.road(-2400, 1800, -2250, 1820, -2100, 1800, "street");
    api.road(-2100, 1800, -1950, 1780, -1800, 1800, "street");
    api.rebuild();
    const added = graph.allSegments().filter((s) => !before.has(s.id));
    const painted = api._scene.meshes.filter(
      (m) => m.name.startsWith("crossing_") && added.some((s) => m.name.startsWith(`crossing_${s.id}_`)),
    ).length;
    for (const s of added) graph.removeSegment(s.id);
    api.rebuild();
    return painted === 0 && added.length === 2;
  }),
);
check(
  "the footway closes around a junction instead of stopping at it",
  await page.evaluate(() => window.cityjump._scene.meshes.some((m) => m.name.startsWith("sidewalk_corner_"))),
);
check(
  "a junction stays about as wide as the roads crossing it",
  await page.evaluate(() => {
    const graph = window.cityjump._graph;
    const node = graph.allNodes().find((n) => n.segments.size >= 3 && !n.roundabout);
    if (!node) return false;
    const mesh = window.cityjump._scene.meshes.find((m) => m.name === `junction_${node.id}`);
    if (!mesh) return true;
    const positions = mesh.getVerticesData("position");
    let reach = 0;
    for (let i = 0; i < positions.length; i += 3) {
      reach = Math.max(reach, Math.hypot(positions[i] - node.pos.x, positions[i + 2] - node.pos.z));
    }
    const widest = Math.max(
      ...[...node.segments].map((id) => (graph.segment(id).type === "avenue" ? 14 : 8)),
    );
    return reach < widest * 1.6;
  }),
);
check(
  "ordinary roads get a footway either side",
  await page.evaluate(() => {
    const meshes = window.cityjump._scene.meshes.filter((m) => m.name.startsWith("sidewalk_"));
    return meshes.some((m) => m.name.startsWith("sidewalk_l_")) && meshes.some((m) => m.name.startsWith("sidewalk_r_"));
  }),
);
check(
  "walkers on a street keep to the footway, clear of the carriageway",
  await page.evaluate(() => {
    const graph = window.cityjump._graph;
    const scene = window.cityjump._scene;
    // Pick a surface road and measure how far its walkers sit from its centre line.
    const seg = graph.allSegments().find((s) => s.type === "street" || s.type === "avenue");
    if (!seg) return false;
    const half = (s) => (s.type === "avenue" ? 14 : 8) / 2;
    const walkers = scene.meshes.filter((m) => m.name.startsWith(`pedestrian_${seg.id}_`));
    if (walkers.length === 0) return false;
    return walkers.every((walker) => {
      let nearest = Infinity;
      for (const point of seg.samples) {
        nearest = Math.min(nearest, Math.hypot(walker.position.x - point.x, walker.position.z - point.z));
      }
      return nearest > half(seg);
    });
  }),
);
check(
  "a pedestrian path is paved rather than surfaced like a street",
  await page.evaluate(() => {
    const paved = window.cityjump._scene.meshes.filter((mesh) => mesh.material?.name === "paving");
    return paved.length > 0;
  }),
);

await page.locator('input[name="road-type"][value="street"]').check();
await page.locator('input[name="road-shape"][value="curve"]').check();

// A roundabout sits on a node and pulls every road back to its ring.
await page.locator('input[name="road-shape"][value="roundabout"]').check();
await nextFrame();
check("the buildable grid stays visible in roundabout mode", await buildableGridVisible());
// Nodes are not meshes, so project the junction's world position to a screen point to click it.
const junctionScreen = await page.evaluate(() => {
  const scene = window.cityjump._scene;
  const node = window.cityjump._graph.allNodes().find((candidate) => candidate.segments.size >= 3);
  if (!node) return null;
  const t = scene.getTransformMatrix().m;
  const { x, y, z } = node.pos;
  const w = x * t[3] + y * t[7] + z * t[11] + t[15];
  const engine = scene.getEngine();
  return {
    id: node.id,
    x: (((x * t[0] + y * t[4] + z * t[8] + t[12]) / w) * 0.5 + 0.5) * engine.getRenderWidth(),
    y: (0.5 - ((x * t[1] + y * t[5] + z * t[9] + t[13]) / w) * 0.5) * engine.getRenderHeight(),
  };
});
check("there is a junction to put a roundabout on", junctionScreen !== null);
await click(Math.round(junctionScreen.x), Math.round(junctionScreen.y));
const withRoundabout = await stats();
check("clicking a junction places a roundabout", withRoundabout.roundabouts === 1, `${withRoundabout.roundabouts}`);
check(
  "the roundabout is drawn as a ring",
  await page.evaluate((id) => Boolean(window.cityjump._scene.getMeshByName(`roundabout_${id}`)), junctionScreen.id),
);
// The drawn surface stops at the ring, while the road geometry still reaches the node.
const trims = await page.evaluate((id) => {
  const graph = window.cityjump._graph;
  const node = graph.node(id);
  return [...node.segments].map((segId) => {
    const seg = graph.segment(segId);
    const near = seg.a === id ? seg.samples[0] : seg.samples[seg.samples.length - 1];
    return Math.hypot(near.x - node.pos.x, near.z - node.pos.z);
  });
}, junctionScreen.id);
check("roads still meet the roundabout node", trims.every((d) => d < 1), `${trims.map((d) => d.toFixed(2))}`);

// Clicking again takes it away.
await click(Math.round(junctionScreen.x), Math.round(junctionScreen.y));
check("clicking it again removes the roundabout", (await stats()).roundabouts === 0);
await click(Math.round(junctionScreen.x), Math.round(junctionScreen.y));

// It has to survive a save.
await realTime(2400);
await page.reload({ waitUntil: "load" });
await waitForApp();
check("a roundabout survives a reload", (await stats()).roundabouts === 1, `${(await stats()).roundabouts}`);
await page.locator('[data-tool="roads"]').click();
await page.locator('input[name="road-shape"][value="straight"]').check();
await nextFrame();

// Left-drag also orbits the camera, so a drag in a build mode must not be taken for a click.
const drag = async (x0, y0, x1, y1) => {
  await page.mouse.move(x0, y0);
  await nextFrame();
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6);
    await nextFrame();
  }
  await page.mouse.up();
  await nextFrame();
};
const beforeDrags = await stats();
const cameraBeforeDrag = await page.evaluate(() => {
  const camera = window.cityjump._scene.activeCamera;
  return [camera.alpha, camera.beta];
});
// Two drags: if the first were taken as a click it would start a segment, and the second finish it.
await drag(500, 400, 760, 330);
await drag(760, 330, 520, 420);
await waitCameraStill();
const cameraAfterDrag = await page.evaluate(() => {
  const camera = window.cityjump._scene.activeCamera;
  return [camera.alpha, camera.beta];
});
check(
  "dragging in a build mode orbits the camera",
  cameraBeforeDrag[0] !== cameraAfterDrag[0] || cameraBeforeDrag[1] !== cameraAfterDrag[1],
);
check(
  "dragging in a build mode draws no road",
  (await stats()).segments === beforeDrags.segments,
  `${(await stats()).segments}/${beforeDrags.segments}`,
);

// The bulldozer aims at what the pointer is actually over.
const screenPoint = (worldish) =>
  page.evaluate((expr) => {
    const scene = window.cityjump._scene;
    const pos = new Function("return " + expr)();
    if (!pos) return null;
    const t = scene.getTransformMatrix().m;
    const { x, z } = pos;
    const y = pos.y ?? 0;
    const w = x * t[3] + y * t[7] + z * t[11] + t[15];
    const engine = scene.getEngine();
    const point = {
      x: (((x * t[0] + y * t[4] + z * t[8] + t[12]) / w) * 0.5 + 0.5) * engine.getRenderWidth(),
      y: (0.5 - ((x * t[1] + y * t[5] + z * t[9] + t[13]) / w) * 0.5) * engine.getRenderHeight(),
    };
    return Number.isFinite(point.x) && Number.isFinite(point.y) ? point : null;
  }, worldish);
const highlightRadius = () =>
  page.evaluate(() => {
    const mesh = window.cityjump._scene.getMeshByName("bulldoze-highlight");
    return mesh?.isEnabled() ? mesh.scaling.x : null;
  });
const waitForHighlight = () =>
  page.waitForFunction(() => window.cityjump._scene.getMeshByName("bulldoze-highlight")?.isEnabled() ?? false, null, {
    timeout: 5_000,
  });

await page.locator('[data-tool="bulldoze"]').click();
await nextFrame();
// A tree standing on a road: the tree is what the pointer is on, so the tree is what goes.
// Planted at a screen point the suite already knows has road under it, so this does not depend
// on where the camera happens to be looking.
const OVER_ROAD = { x: 805, y: 465 };
await page.locator('[data-tool="nature"]').click();
await page.locator('input[name="plant-mode"][value="plant"]').check();
await nextFrame();
const beforePlant = await stats();
await click(OVER_ROAD.x, OVER_ROAD.y);
check("a tree can be planted over a road", (await stats()).trees === beforePlant.trees + 1);

await page.locator('[data-tool="bulldoze"]').click();
await nextFrame();
await page.mouse.move(20, 20);
await nextFrame();
await page.mouse.move(OVER_ROAD.x, OVER_ROAD.y);
await waitForHighlight();
check("hovering a tree with the bulldozer highlights it", (await highlightRadius()) !== null);
const beforeFell = await stats();
await page.mouse.click(OVER_ROAD.x, OVER_ROAD.y);
await page.waitForFunction((trees) => window.cityjump.stats().trees === trees - 1, beforeFell.trees, { timeout: 5_000 });
const afterFell = await stats();
check(
  "the tree goes before the road it stands on",
  afterFell.trees === beforeFell.trees - 1 && afterFell.segments === beforeFell.segments,
  `${afterFell.trees}/${beforeFell.trees} trees, ${afterFell.segments}/${beforeFell.segments} segments`,
);

// Selecting a road shows it in the panel and picks up its type like an eyedropper -- and
// neither one cancels the other, which a prior regression did (setRoadType's own reset used to
// clear the very selection that triggered it).
await page.locator('[data-tool="select"]').click();
await nextFrame();
await click(OVER_ROAD.x, OVER_ROAD.y);
const selected = await page.evaluate(() => ({
  hidden: document.getElementById("selection-panel").hidden,
  kind: document.querySelector("#selection-panel .selection-kind").textContent,
  typeLabel: document.querySelector("#selection-panel dl dd")?.textContent ?? "",
  rows: Object.fromEntries(
    [...document.querySelectorAll("#selection-panel dt")].map((dt) => [dt.textContent, dt.nextElementSibling?.textContent ?? ""]),
  ),
}));
check("selecting a road shows it in the panel", !selected.hidden && selected.kind === "Road", JSON.stringify(selected));
check("a road panel shows its street name", selected.rows.Street?.endsWith("Street") || selected.rows.Street?.endsWith("Avenue"), JSON.stringify(selected.rows));
const pickedType = await page.evaluate(() => document.querySelector('input[name="road-type"]:checked').value);
check(
  "picking a road sets the Roads tab to match it (eyedropper)",
  selected.typeLabel.toLowerCase().startsWith(pickedType),
  `panel says "${selected.typeLabel}", Roads tab picked "${pickedType}"`,
);
const buildingPoint = await screenPoint("window.cityjump.buildingPoint()");
check("there is a building to select", buildingPoint !== null);
await click(buildingPoint.x, buildingPoint.y);
const selectedBuilding = await page.evaluate(() => ({
  hidden: document.getElementById("selection-panel").hidden,
  kind: document.querySelector("#selection-panel .selection-kind").textContent,
  rows: Object.fromEntries(
    [...document.querySelectorAll("#selection-panel dt")].map((dt) => [dt.textContent, dt.nextElementSibling?.textContent ?? ""]),
  ),
}));
check("clicking a building opens its address", !selectedBuilding.hidden && /^\d+ .+/.test(selectedBuilding.rows.Address ?? ""), JSON.stringify(selectedBuilding));
const vehiclePoint = await screenPoint("window.cityjump.vehiclePoint()");
check("there is a vehicle to select", vehiclePoint !== null);
await click(vehiclePoint.x, vehiclePoint.y);
const selectedVehicle = await page.evaluate(() => ({
  hidden: document.getElementById("selection-panel").hidden,
  kind: document.querySelector("#selection-panel .selection-kind").textContent,
  rows: Object.fromEntries(
    [...document.querySelectorAll("#selection-panel dt")].map((dt) => [dt.textContent, dt.nextElementSibling?.textContent ?? ""]),
  ),
}));
check("clicking a car opens its street", !selectedVehicle.hidden && selectedVehicle.kind === "Car" && Boolean(selectedVehicle.rows.Street), JSON.stringify(selectedVehicle));
const cameraBeforeOrbit = await page.evaluate(() => window.cityjump.cameraState());
await page.locator('input[name="camera-mode"][value="orbit"]').check();
await realTime(500);
const cameraAfterOrbit = await page.evaluate(() => window.cityjump.cameraState());
check("orbit mode turns the camera around the target", Math.abs(cameraAfterOrbit.alpha - cameraBeforeOrbit.alpha) > 0.02);
check(
  "camera mode is persisted in settings",
  await page.evaluate(() => JSON.parse(window.localStorage.getItem("cityjump.settings") ?? "{}").cameraMode === "orbit"),
);
await page.keyboard.press("ArrowUp");
await nextFrame();
check("panning returns the camera to Free", await page.locator('input[name="camera-mode"][value="free"]').isChecked());
await click(vehiclePoint.x, vehiclePoint.y);
const cameraBeforeFollow = await page.evaluate(() => window.cityjump.cameraState());
await page.locator('input[name="camera-mode"][value="follow"]').check();
await realTime(650);
const cameraAfterFollow = await page.evaluate(() => window.cityjump.cameraState());
check("follow mode keeps the selected car framed", Math.hypot(cameraAfterFollow.targetX - cameraBeforeFollow.targetX, cameraAfterFollow.targetZ - cameraBeforeFollow.targetZ) > 0.2);
await page.evaluate(() => window.cityjump.rebuild());
await realTime(100);
check("follow mode ends cleanly when the car is rebuilt away", await page.locator('input[name="camera-mode"][value="free"]').isChecked());
await page.evaluate((state) => {
  const camera = window.cityjump._scene.activeCamera;
  camera.target.set(state.targetX, state.targetY, state.targetZ);
  camera.alpha = state.alpha;
  camera.beta = state.beta;
  camera.radius = state.radius;
}, cameraBeforeOrbit);
// Back to bulldoze mode: everything from here on still expects that, same as before this check.
await page.locator('[data-tool="bulldoze"]').click();
await nextFrame();

// And a roundabout can be taken off without touching the roads that meet it.
const ringNode = await page.evaluate(() => {
  const graph = window.cityjump._graph;
  const node = graph
    .allNodes()
    .filter((candidate) => candidate.segments.size >= 3)
    .sort((a, b) => Math.hypot(a.pos.x, a.pos.z) - Math.hypot(b.pos.x, b.pos.z))[0];
  graph.setRoundabout(node.id, true);
  window.cityjump.rebuild();
  return node.id;
});
await nextFrame();
const ringPoint = await screenPoint(`window.cityjump._graph.node(${ringNode}).pos`);
await page.mouse.move(Math.round(ringPoint.x), Math.round(ringPoint.y));
await waitForHighlight();
const ringHighlight = await highlightRadius();
check("hovering a roundabout highlights the whole ring", ringHighlight > 8, `${ringHighlight?.toFixed(1)} m`);
const beforeRing = await stats();
await page.mouse.click(Math.round(ringPoint.x), Math.round(ringPoint.y));
await page.waitForFunction(() => window.cityjump.stats().roundabouts === 0, null, { timeout: 5_000 });
const afterRing = await stats();
check(
  "the bulldozer removes the roundabout, leaving its roads",
  afterRing.roundabouts === 0 && afterRing.segments === beforeRing.segments,
  `${afterRing.roundabouts} roundabouts, ${afterRing.segments}/${beforeRing.segments} segments`,
);
await page.locator('[data-tool="roads"]').click();
await nextFrame();

// A road shorter than the minimum has to be refused, with a reason the player can read.
await click(200, 600);
await click(203, 602);
await click(206, 604);
const refusedText = await toast();
check("a refused road says why", refusedText.length > 0, JSON.stringify(refusedText));
check("a refused road is not added", (await stats()).segments === walked.segments);

await page.locator('[data-tool="bulldoze"]').click();
await page.mouse.move(20, 20);
await nextFrame();
await page.mouse.move(805, 465);
await waitForPreview();
check("the bulldozer highlights a road under the pointer", await previewVisible());
const beforeBulldoze = await stats();
await click(805, 465);
await page.waitForFunction((segments) => window.cityjump.stats().segments === segments - 1, beforeBulldoze.segments, {
  timeout: 5_000,
});
const afterBulldoze = await stats();
check("the bulldozer removes the clicked road", afterBulldoze.segments === beforeBulldoze.segments - 1);

// The rugged map is no longer offered in the toolbar, but a city saved on it still has to come
// back on it. Loading is the only way in now, so that is how it gets tested.
await page.evaluate(() => {
  window.localStorage.setItem(
    "cityjump.save.Rugged",
    // 22:00, so the streetlight checks below still run at night, and the hour a save carries is
    // proven to be applied on load.
    JSON.stringify({ v: 3, terrain: "rugged", hour: 22, nodes: [], segments: [], planted: [], cleared: [] }),
  );
  window.localStorage.setItem("cityjump.saves", JSON.stringify(["Rugged"]));
});
await page.reload({ waitUntil: "load" });
await waitForApp();
await page.locator("#save-slot").selectOption("Rugged");
await page.locator("#save-load").click();
await nextFrame();
const terrainRelief = await page.evaluate(() => {
  const bounds = window.cityjump._scene.getMeshByName("ground").getBoundingInfo().boundingBox;
  return bounds.maximumWorld.y - bounds.minimumWorld.y;
});
check("a city saved on the rugged map loads back onto it", terrainRelief > 20, `${terrainRelief.toFixed(1)} m of relief`);
check("a save restores its hour of day", (await page.locator("#sun-time").textContent()).startsWith("22:"));
await page.evaluate(() => window.cityjump.demoNetwork());
await nextFrame();
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
  await realTime(400);
  await page.keyboard.up(key);
  await nextFrame();
};

// alpha = -PI/2 puts the camera at -Z looking towards +Z, so "forward" has to be +Z.
await page.evaluate(() => window.cityjump.camera(400, Math.PI / 3, -Math.PI / 2));
await nextFrame();
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
await nextFrame();
const turnedStart = await cameraTarget();
await holdKey("ArrowUp");
const turnedForward = await cameraTarget();
check(
  "forward follows the live camera direction",
  turnedForward.x < turnedStart.x - 50 && Math.abs(turnedForward.z - turnedStart.z) < 20,
  `x ${turnedForward.x.toFixed(0)} z ${turnedForward.z.toFixed(0)}`,
);

// Nature tool: plant, spray, and clear with the bulldozer.
await page.evaluate(() => { window.cityjump.reset(); window.cityjump.camera(600, Math.PI / 4, -Math.PI / 2); });
await nextFrame();
await page.locator('[data-tool="nature"]').click();
check("the nature tool shows its planting options", !(await page.locator("#nature-options").isHidden()));
check("the nature tool hides the road options", await page.locator("#road-options").isHidden());

const treeCount = async () => (await stats()).trees;
const wildTrees = await treeCount();
await click(500, 350);
const oneMore = await treeCount();
check("a click plants a single tree", oneMore === wildTrees + 1, `${wildTrees} -> ${oneMore}`);

// Each species plants its own mesh, so the picker really changes what grows.
const speciesCounts = () =>
  page.evaluate(() =>
    Object.fromEntries(
      ["fir", "oak", "apple", "palm"].map((id) => {
        const mesh = window.cityjump._scene.getMeshByName(`tree_trunks_${id}`);
        return [id, mesh?.isEnabled() ? mesh.thinInstanceCount : 0];
      }),
    ),
  );
const beforeSpecies = await speciesCounts();
for (const [index, species] of ["oak", "apple", "palm"].entries()) {
  await page.locator("#tree-species").selectOption(species);
  await nextFrame();
  await click(560 + index * 90, 350);
}
const afterSpecies = await speciesCounts();
check(
  "each species plants its own kind of tree",
  ["oak", "apple", "palm"].every((id) => afterSpecies[id] === beforeSpecies[id] + 1),
  JSON.stringify(afterSpecies),
);
await page.locator("#tree-species").selectOption("fir");
await nextFrame();

await page.locator('input[name="plant-mode"][value="spray"]').check();
check("spray mode exposes a brush size slider", await page.locator("#spray-radius").isVisible());
await page.locator("#spray-radius").evaluate((input) => {
  input.value = "88";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await nextFrame();
await page.mouse.move(420, 430);
await nextFrame();
const brush = await page.evaluate(() => {
  const mesh = window.cityjump._scene.getMeshByName("spray-ring");
  if (!mesh?.isEnabled()) return null;
  const positions = mesh.getVerticesData("position");
  const ys = [];
  for (let i = 1; i < positions.length; i += 3) ys.push(positions[i]);
  return +(Math.max(...ys) - Math.min(...ys)).toFixed(2);
});
check("the spray brush ring is shown", brush !== null);
check("the brush ring follows the terrain instead of sitting flat", brush > 0.05, `${brush} m of relief`);
const sprayRadius = await brushRingRadius();
check("the spray brush ring follows the size slider", Math.abs(sprayRadius - 88) < 2, `${sprayRadius} m`);

const beforeStroke = await page.evaluate(() => {
  const camera = window.cityjump._scene.activeCamera;
  return [camera.alpha, camera.beta];
});
await page.mouse.down();
for (let x = 420; x <= 700; x += 20) {
  await page.mouse.move(x, 430);
  await nextFrame();
}
await page.mouse.up();
await nextFrame();
const afterStroke = await page.evaluate(() => {
  const camera = window.cityjump._scene.activeCamera;
  return [camera.alpha, camera.beta];
});
// A held left drag normally orbits; spray takes that button so the view stays put while painting.
check("spraying does not swing the camera", beforeStroke[0] === afterStroke[0] && beforeStroke[1] === afterStroke[1]);
const sprayed = await treeCount();
check("a spray stroke scatters trees across the brush", sprayed > oneMore + 10, `${oneMore} -> ${sprayed}`);

await page.locator('[data-tool="bulldoze"]').click();
await nextFrame();
check(
  "the brush ring is hidden outside spray mode",
  !(await page.evaluate(() => window.cityjump._scene.getMeshByName("spray-ring")?.isEnabled())),
);
await click(500, 350);
const cleared = await treeCount();
check("the bulldozer clears a tree where there is no road", cleared === sprayed - 1, `${sprayed} -> ${cleared}`);
await page.locator('[data-tool="select"]').click();
await nextFrame();

await page.evaluate(() => window.cityjump.demoNetwork());
await nextFrame();
const built = await stats();
page.once("dialog", (dialog) => dialog.accept("Testville"));
await page.locator("#save-store").click();
await nextFrame();
const slotNames = await page.locator("#save-slot option").allTextContents();
check("a saved city appears in the picker", slotNames.includes("Testville"));
await page.evaluate(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: async (text) => (window.__shareLink = text) },
  });
});
page.once("dialog", (dialog) => dialog.accept("Sharedville"));
await page.locator("#save-share").click();
await nextFrame();
const shareLink = await page.evaluate(() => window.__shareLink ?? "");
check("a share link is copied", shareLink.includes("#city="), shareLink.slice(0, 80));
page.on("dialog", (dialog) => dialog.accept());
await page.evaluate(() => {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("cityjump.")) localStorage.removeItem(key);
  }
});
await page.goto("about:blank");
await page.goto(shareLink, { waitUntil: "load" });
await waitForApp();
await page.waitForFunction((segments) => window.cityjump.stats().segments === segments, built.segments, { timeout: 5_000 });
check("arriving on a share link imports and loads the city", (await stats()).segments === built.segments, `${(await stats()).segments}/${built.segments}`);
await page.waitForFunction(() => location.hash === "", null, { timeout: 5_000 });
check("the share fragment is removed after handling", await page.evaluate(() => location.hash === ""));
check("the imported city appears in the picker", (await page.locator("#save-slot option").allTextContents()).includes("Sharedville"));

await page.evaluate(() => window.cityjump.reset());
await nextFrame();
await page.locator("#save-load").click();
await nextFrame();
const loaded = await stats();
check("loading restores every segment", loaded.segments === built.segments, `${loaded.segments}/${built.segments}`);
// Replaying onto pristine terrain shifts road heights slightly, so parcel counts move a little.
// What must hold is that they stop moving: loading is a fixed point.
const drift = Math.abs(loaded.buildings - built.buildings) / built.buildings;
check("loading lands within 2% of the original building count", drift < 0.02, `${(drift * 100).toFixed(2)}%`);
await page.evaluate(() => window.cityjump.reset());
await nextFrame();
await page.locator("#save-load").click();
await nextFrame();
const reloaded = await stats();
check(
  "loading twice gives exactly the same city",
  reloaded.segments === loaded.segments && reloaded.buildings === loaded.buildings,
  `${reloaded.buildings} vs ${loaded.buildings}`,
);

await realTime(2400); // let the debounced autosave land
const beforeReload = await stats();
await page.reload({ waitUntil: "load" });
await waitForApp();
check(
  "a page reload resumes the autosaved city",
  (await stats()).segments === beforeReload.segments,
  `${(await stats()).segments}/${beforeReload.segments}`,
);

// A city saved by an older build has to keep loading. Take the current autosave, strip the
// fields added since, stamp it version 1, and it must come back exactly as it went in.
await page.evaluate(() => {
  const raw = JSON.parse(window.localStorage.getItem("cityjump.autosave"));
  delete raw.planted;
  delete raw.cleared;
  delete raw.zones;
  raw.segments = raw.segments.map((segment) => segment.slice(0, 6));
  raw.v = 1;
  window.localStorage.setItem("cityjump.autosave", JSON.stringify(raw));
});
await page.reload({ waitUntil: "load" });
await waitForApp();
check(
  "a city saved by an older build still loads",
  (await stats()).segments === beforeReload.segments,
  `${(await stats()).segments}/${beforeReload.segments}`,
);

await page.evaluate(() => window.localStorage.setItem("cityjump.autosave", "{not json"));
await page.reload({ waitUntil: "load" });
await waitForApp();
check("a corrupted autosave is ignored rather than fatal", (await stats()).segments === 0);
const costs = await page.evaluate(() => window.cityjump.measureCosts());
check(
  "debug performance measurement reports startup and placement cost",
  costs.startupMs > 0 && costs.demoBuildMs > 0 && costs.placementMs > 0 && costs.segments > 0,
  JSON.stringify(costs),
);

check("no errors or missing side-effect imports", noise.length === 0, noise.join(" / "));

if (shot) await page.screenshot({ path: shot });
await browser.close();

console.log(failures.length === 0 ? "\nall interaction checks passed" : `\n${failures.length} FAILED`);
process.exit(failures.length === 0 ? 0 : 1);
