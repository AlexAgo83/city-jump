// Drives the app through the pointer, the way a player does, and fails loudly.
//
//   node scripts/interact.mjs [url] [shot.png]
//
// This exists because scripts/shot.mjs builds its roads through the debug API, which
// never touches picking -- so a broken drawing tool passed every check. Whatever else
// changes, a click has to still draw a road.
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

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
const setSettingsOpen = async (open) => {
  if (((await page.locator("#toolbar-toggle").getAttribute("aria-expanded")) === "true") !== open) await page.locator("#toolbar-toggle").click();
};
// Only for checks that need real elapsed time: animation, movement, held keys, or debounced autosave.
const realTime = (ms) => page.waitForTimeout(ms);

await page.goto(url, { waitUntil: "load" });
await waitForApp();
// The game caps itself at 60 to spare a laptop; these checks step frame by frame and want the
// machine flat out. The cap has its own check further down, which puts this back afterwards.
const uncapFrames = () => page.selectOption("#frame-cap", "0");
await uncapFrames();
check("coarse pointer visitors see the desktop input notice", await page.locator("#touch-notice").isVisible());

const stats = () => page.evaluate(() => window.cityjump.stats());
const cityHudText = () =>
  page.evaluate(() => ({
    population: document.getElementById("population")?.textContent ?? "",
    money: document.getElementById("money")?.textContent ?? "",
    needs: document.getElementById("needs-panel")?.textContent ?? "",
  }));
const toast = () => page.evaluate(() => document.getElementById("toast").textContent);
const waveBanner = () => page.evaluate(() => document.getElementById("wave-banner")?.textContent ?? "");
const previewVisible = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("preview")?.isEnabled() ?? false);
const waitForPreview = () =>
  page.waitForFunction(() => window.cityjump._scene.getMeshByName("preview")?.isEnabled() ?? false, null, { timeout: 5_000 });
const nodeHighlighted = () =>
  page.evaluate(() => window.cityjump._scene.getMeshByName("node-highlight")?.isEnabled() ?? false);
const waveMarkersVisible = () =>
  page.evaluate(() => ({
    edge: window.cityjump._scene.getMeshByName("wave-edge-marker")?.isEnabled() ?? false,
    target: window.cityjump._scene.getMeshByName("wave-target-highlight")?.isEnabled() ?? false,
  }));
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
// A works stands up its own model, not a tinted lot.
const industrialBuildingCount = () =>
  page.evaluate(() =>
    window.cityjump._scene.meshes
      .filter((mesh) => /^building_industrial_\dx4$/.test(mesh.name))
      .reduce((sum, mesh) => sum + (mesh.thinInstanceCount ?? 0), 0),
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
      sunShadowEnabled: sun?.shadowEnabled ?? false,
    };
  });
const cityLightState = () =>
  page.evaluate(() => {
    const scene = window.cityjump._scene;
    const count = (name) => {
      const cluster = scene.getLightByName(name);
      return cluster?.isEnabled() ? cluster.lights.filter((light) => light.isEnabled()).length : 0;
    };
    return {
      streetlights: count("streetlight_lights"),
      headlights: count("car_headlights"),
      sun: scene.getLightByName("sun")?.intensity ?? 0,
      ambient: scene.getLightByName("ambient")?.intensity ?? 0,
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

// Nothing has been drawn, so generated scenery and the fixed offshore bridge are allowed,
// but authored city growth is not.
const fresh = await stats();
check(
  "a fresh map draws terrain, trees and the offshore bridge only",
  fresh.activeMeshes >= 4 && fresh.trees > 0 && fresh.segments === 1 && fresh.buildings === 0 && fresh.cars > 0,
  `${JSON.stringify(fresh)}`,
);
const localTerrainVariation = await terrainColorVariation();
check("terrain colors have natural local variation", localTerrainVariation > 0.002, localTerrainVariation.toFixed(4));
const forestDensity = await densestTreeCluster();
check("some areas grow as dense forest", forestDensity >= 20, `${forestDensity} trees within 120 m`);
const offshoreIsland = await page.evaluate(() => {
  const mesh = window.cityjump._scene.getMeshByName("offshore-island");
  const bounds = mesh?.getBoundingInfo().boundingBox;
  return mesh && bounds ? { pickable: mesh.isPickable, centerZ: mesh.getBoundingInfo().boundingSphere.centerWorld.z, width: bounds.maximumWorld.x - bounds.minimumWorld.x } : null;
});
check(
  "the offshore island is scenery beyond the playable map",
  offshoreIsland && !offshoreIsland.pickable && offshoreIsland.centerZ > 2700 && offshoreIsland.width > 4000,
  JSON.stringify(offshoreIsland),
);
const offshoreBridge = await page.evaluate(() => {
  const segment = window.cityjump._graph.allSegments().find((s) => s.type === "highway_2lane" && Math.max(window.cityjump._graph.node(s.a).pos.z, window.cityjump._graph.node(s.b).pos.z) > 2700);
  const pylons = window.cityjump._scene.meshes.filter((mesh) => mesh.name.startsWith("bridge_pylon_")).length;
  if (!segment) return null;
  const graph = window.cityjump._graph;
  const a = graph.node(segment.a).pos;
  const b = graph.node(segment.b).pos;
  const middle = graph.pointAt(segment.id, segment.length / 2).position;
  const piers = window.cityjump._scene.meshes.filter((mesh) => mesh.name.startsWith("bridge_pier_")).length;
  return { type: segment.type, length: segment.length, pylons, piers, bend: Math.abs(middle.x - (a.x + b.x) / 2) };
});
check(
  "the offshore bridge is a curved two-way two-lane highway with pylons",
  offshoreBridge && offshoreBridge.length > 2000 && offshoreBridge.pylons >= 6 && offshoreBridge.piers >= 6 && offshoreBridge.bend > 200,
  JSON.stringify(offshoreBridge),
);
check("startup does not wait for all parcel models", fresh.startupModels < 28, `${fresh.startupModels} models ready at renderer return`);
await page.waitForFunction(() => window.cityjump.stats().models === 28, null, { timeout: 20_000 });
// 16 lot models plus a farm, a works and a compound for each of the four deep lot sizes.
check("all parcel models load", (await stats()).models === 28, `${(await stats()).models} models`);
await page.evaluate(() => window.cityjump.forceWave());
await page.waitForFunction(() => window.cityjump.stats().kaiju === true, null, { timeout: 5_000 });
check("a forced wave shows the kaiju mesh", await page.evaluate(() => window.cityjump._scene.meshes.some((mesh) => mesh.name.startsWith("kaiju_") && mesh.isEnabled())));
check("an active wave shows the kaiju HP banner", /Kaiju \d+\/600 HP/.test(await waveBanner()), await waveBanner());
await page.evaluate(() => window.cityjump.forceHeldWave());
check("a held wave shows the held banner", /Wave held/.test(await waveBanner()), await waveBanner());
await page.evaluate(() => window.cityjump.reset());
check("select is the default tool", (await page.locator('[data-tool="select"]').getAttribute("aria-pressed")) === "true");
check("the old lower-left HUD is removed", (await page.locator("#hud").count()) === 0);
const paletteBox = await page.locator("#action-palette").boundingBox();
check("the action palette is bottom right", paletteBox.x + paletteBox.width > 980 && paletteBox.y > 620);
check("road actions are absent from the top toolbar", (await page.locator("#toolbar #road-type").count()) === 0);
const expandedToolbarHeight = (await page.locator("#toolbar").boundingBox()).height;
await page.locator("#toolbar-toggle").click();
const collapsedToolbarHeight = (await page.locator("#toolbar").boundingBox()).height;
check("the settings toolbar collapses but keeps needs visible", collapsedToolbarHeight < expandedToolbarHeight && await page.locator("#needs-panel").isVisible());
await page.reload({ waitUntil: "load" });
await waitForApp();
check("the settings toolbar remembers being collapsed", (await page.locator("#toolbar-toggle").getAttribute("aria-expanded")) === "false" && await page.locator("#needs-panel").isVisible());
await page.locator("#toolbar-toggle").click();
check("the settings toolbar expands again", (await page.locator("#toolbar-toggle").getAttribute("aria-expanded")) === "true" && await page.locator("#show-fps").isVisible());
check(
  "the look settings offer the screen-space effects",
  (await page.locator("#fx-antialias").count()) === 1 && (await page.locator("#fx-bloom").count()) === 1 && (await page.locator("#fx-ao").count()) === 1 && (await page.locator("#fx-tilt").count()) === 1,
);
// Each one attaches or drops a real post-process, which is the part that can throw.
for (const id of ["fx-ao", "fx-tilt"]) {
  await page.locator(`#${id}`).setChecked(true);
  await nextFrame();
  await nextFrame();
}
check("the heavier effects can be switched on", (await stats()).segments > 0 && noise.length === 0, noise.join(" | "));
await page.locator("#fx-ao").setChecked(false);
await page.locator("#fx-tilt").setChecked(false);
await nextFrame();
await page.locator("#fx-antialias").setChecked(false);
await page.reload({ waitUntil: "load" });
await waitForApp();
check("the look settings are remembered across reload", !(await page.locator("#fx-antialias").isChecked()));
await page.locator("#fx-antialias").setChecked(true);
// Reset puts every kind of control back: a checkbox, a select, a range and a radio.
await page.locator("#show-grid").setChecked(true);
await page.locator("#show-shadows").setChecked(false);
await page.selectOption("#frame-cap", "30");
await page.locator("#sun-hour").evaluate((input) => {
  input.value = "22";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.locator('input[name="camera-mode"][value="orbit"]').check();
await nextFrame();
await page.locator("#settings-reset").click();
await nextFrame();
const afterReset = await page.evaluate(() => ({
  grid: document.getElementById("show-grid").checked,
  shadows: document.getElementById("show-shadows").checked,
  cap: document.getElementById("frame-cap").value,
  hour: document.getElementById("sun-hour").value,
  camera: document.querySelector('input[name="camera-mode"]:checked').value,
}));
check(
  "Reset puts every setting back to its default",
  !afterReset.grid && afterReset.shadows && afterReset.cap === "60" && afterReset.hour === "18.5" && afterReset.camera === "free",
  JSON.stringify(afterReset),
);
await uncapFrames();

check("fps counter is off by default", await page.locator("#fps-counter").isHidden() && !(await page.locator("#show-fps").isChecked()));
check("time controls are permanent", await page.locator("#time-controls").isVisible() && /Day 1 \d\d:\d\d/.test(await page.locator("#sim-time").textContent()));
check("time controls do not cover the compass", await page.evaluate(() => {
  const time = document.getElementById("time-controls").getBoundingClientRect();
  const compass = document.getElementById("compass").getBoundingClientRect();
  return time.right <= compass.left || compass.right <= time.left || time.bottom <= compass.top || compass.bottom <= time.top;
}));
check("time controls do not cover the action palette", await page.evaluate(() => {
  const time = document.getElementById("time-controls").getBoundingClientRect();
  const palette = document.getElementById("action-palette").getBoundingClientRect();
  return time.right <= palette.left || palette.right <= time.left || time.bottom <= palette.top || palette.bottom <= time.top;
}));
check("reload starts paused", await page.evaluate(() => window.cityjump.paused()) && await page.locator('[data-time-rate="0"]').getAttribute("aria-pressed") === "true");
await page.locator('[data-time-rate="4"]').click();
await page.reload({ waitUntil: "load" });
await waitForApp();
check("reload keeps the chosen run rate but stays paused", await page.evaluate(() => window.cityjump.paused()) && await page.locator('[data-time-rate="0"]').getAttribute("aria-pressed") === "true");
await page.evaluate(() => window.cityjump.setPaused(false));
check("resume uses the stored run rate", await page.evaluate(() => window.cityjump.stats().timeRate === 4));
await page.locator('[data-time-rate="1"]').click();
await page.waitForFunction(() => !window.cityjump.paused() && window.cityjump.stats().timeRate === 1, null, { timeout: 5_000 });
check("play resumes the simulation clock", await page.locator('[data-time-rate="1"]').getAttribute("aria-pressed") === "true" && await page.locator("#sun-hour").isDisabled());
// The cap is the one setting that spends less rather than showing more. It can only be seen on a
// machine that would otherwise beat it -- a CI runner drawing a frame a second is already under
// any cap, so there the check is that capping does not stop the picture.
await page.selectOption("#frame-cap", "0");
const uncapped = await page.evaluate(() => window.cityjump.measureFps(1500));
await page.selectOption("#frame-cap", "30");
const capped = await page.evaluate(() => window.cityjump.measureFps(1500));
check(
  "the frame cap holds the frame rate down",
  uncapped > 45 ? capped <= 34 && capped < uncapped : capped >= 1,
  `${capped} capped, ${uncapped} uncapped`,
);
// And the city runs at the same speed whatever the cap: everything moves on elapsed time, so a
// longer frame is a longer step. Measured, because the engine's own delta counts animation frames
// this render loop skips, and driving movement from that made a capped city crawl.
const metresPerSecond = async () => page.evaluate(async () => {
  const cars = window.cityjump._scene.meshes.filter((mesh) => mesh.name.startsWith("traffic_"));
  const before = cars.map((mesh) => mesh.position.clone());
  const started = performance.now();
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const seconds = (performance.now() - started) / 1000;
  return cars.reduce((sum, mesh, i) => sum + mesh.position.subtract(before[i]).length(), 0) / cars.length / seconds;
});
await page.selectOption("#frame-cap", "30");
const slowSpeed = await metresPerSecond();
await uncapFrames();
const fastSpeed = await metresPerSecond();
check(
  "traffic covers the same ground whatever the frame cap",
  slowSpeed > 1 && Math.abs(slowSpeed - fastSpeed) / fastSpeed < 0.25,
  `${slowSpeed.toFixed(1)} m/s capped, ${fastSpeed.toFixed(1)} m/s uncapped`,
);
await page.locator('[data-time-rate="2"]').click();
const doubleSpeed = await metresPerSecond();
await page.locator('[data-time-rate="4"]').click();
const quadSpeed = await metresPerSecond();
check(
  "traffic speed follows the selected simulation rate",
  doubleSpeed > fastSpeed * 1.5 && quadSpeed > doubleSpeed * 1.5,
  `${fastSpeed.toFixed(1)} x1, ${doubleSpeed.toFixed(1)} x2, ${quadSpeed.toFixed(1)} x4`,
);
await page.locator('[data-time-rate="1"]').click();
await uncapFrames();
await page.locator("#show-fps").check();
await page.waitForFunction(() => /^\d+ FPS$/.test(document.getElementById("fps-counter").textContent), null, { timeout: 5_000 });
const fpsSample = await page.evaluate(async () => {
  const measured = await window.cityjump.measureFps(800);
  const displayed = Number.parseInt(document.getElementById("fps-counter").textContent, 10);
  return { measured, displayed };
});
check(
  "fps counter shows the shared frame-rate measurement",
  fpsSample.displayed > 0 && Math.abs(fpsSample.displayed - fpsSample.measured) <= 1,
  `${JSON.stringify(fpsSample)}`,
);
await page.reload({ waitUntil: "load" });
await waitForApp();
check("fps setting is remembered across reload", await page.locator("#show-fps").isChecked() && await page.locator("#fps-counter").isVisible());
await page.locator("#show-fps").uncheck();
check("fps counter turns off immediately", await page.locator("#fps-counter").isHidden());
check("shadows and city lights are on by default", (await page.locator("#show-shadows").isChecked()) && (await page.locator("#show-lights").isChecked()));
check("shadows are switched on at the sun light", (await shadowState()).sunShadowEnabled);
await page.locator("#show-shadows").uncheck();
await page.locator("#show-lights").uncheck();
check("shadows can be turned off without touching casters", !(await shadowState()).sunShadowEnabled);
await page.reload({ waitUntil: "load" });
await waitForApp();
check(
  "shadow and light settings are remembered across reload",
  !(await page.locator("#show-shadows").isChecked()) && !(await page.locator("#show-lights").isChecked()) && !(await shadowState()).sunShadowEnabled,
);
await page.locator("#show-shadows").check();
await page.locator("#show-lights").check();
check("shadows can be restored", (await shadowState()).sunShadowEnabled);
check("traffic is on by default", await page.locator("#show-traffic").isChecked());
await page.locator("#show-traffic").uncheck();
await page.reload({ waitUntil: "load" });
await waitForApp();
check("traffic setting is remembered across reload", !(await page.locator("#show-traffic").isChecked()) && await page.locator("#traffic-density").isDisabled());
await page.locator("#show-traffic").check();
await page.locator("#traffic-density").evaluate((input) => {
  input.value = "1.75";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.reload({ waitUntil: "load" });
await waitForApp();
check("traffic density is remembered across reload", (await page.locator("#traffic-density").inputValue()) === "1.75");
await page.locator("#traffic-density").evaluate((input) => {
  input.value = "1";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});

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
check("zone tools show the building price", /\$\d+\+ each/.test(await page.locator("#zone-price").textContent()));
check(
  "zone mode exposes every business and Clear",
  (await page.locator('input[name="zone-kind"]').evaluateAll((inputs) => inputs.map((input) => input.value).join(","))) ===
    "residential,commercial,industrial,agricultural,military,clear",
);
await page.locator('[data-tool="roads"]').click();
await page.locator("#grid-snap").uncheck();
check("grid snapping can be disabled", !(await page.locator("#grid-snap").isChecked()));
await page.locator("#grid-snap").check();
check("unfinished power and water categories are disabled", await page.locator('[data-tool="power"]').isDisabled() && await page.locator('[data-tool="water"]').isDisabled());
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
// The hour is part of the city, and the city is autosaved on a debounce: reload before that runs
// and the city comes back at the hour it was last saved at, whatever the settings say.
// The hour lives in the city, and the city is autosaved on a debounce that a change of hour does
// not itself start -- so ask for a rebuild, which does, and wait for the write to land. Reload
// before that and the city comes back at the hour it was last saved at, settings or no settings.
await page.evaluate(() => window.cityjump.rebuild());
await page.waitForFunction(() => JSON.parse(localStorage.getItem("cityjump.autosave") ?? "{}").hour === 20, null, { timeout: 20_000 });
await page.reload({ waitUntil: "load" });
await waitForApp();
check("sun hour is remembered across reload", (await page.locator("#sun-hour").inputValue()) === "20");
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

// The open settings menu covers the scene, so a terrain click folds it away like a player would
// -- then puts it back, since most of what follows a click is another settings control. A check
// that hovers over the scene where the menu sits uses `hoverScene`, which folds it again.
const click = async (x, y) => {
  const wasOpen = (await page.locator("#toolbar-toggle").getAttribute("aria-expanded")) === "true";
  await setSettingsOpen(false);
  await page.mouse.move(x, y);
  await nextFrame();
  await page.mouse.click(x, y);
  await nextFrame();
  if (wasOpen) await setSettingsOpen(true);
};
/** Move the pointer over the scene, with the settings menu out of the way. */
const hoverScene = async (x, y) => {
  await setSettingsOpen(false);
  await page.mouse.move(x, y);
  await nextFrame();
};

await click(260, 320);
check("select mode leaves left-click to the camera", (await stats()).segments === fresh.segments);
const oceanBefore = await oceanSampleY();
await realTime(250);
check("the ocean surface is animated", Math.abs((await oceanSampleY()) - oceanBefore) > 0.01);
await page.locator('[data-tool="roads"]').click();
check("road tools show the metre price", /\$\d+\/m/.test(await page.locator("#road-price").textContent()));
await page.locator('input[name="road-shape"][value="curve"]').check();

await page.mouse.click(360, 360, { button: "right" });
check("right-click is camera-only, not drawing input", !(await previewVisible()) && (await stats()).segments === fresh.segments);

await click(300, 340);
await hoverScene(400, 330);
check("the first click arms the tool", await previewVisible());
await page.mouse.click(360, 360, { button: "right" });
await hoverScene(420, 330);
check("right-click does not cancel an armed road", await previewVisible());
await click(500, 280);
await page.mouse.move(600, 330);
check("the second click takes the bend", await previewVisible());
await click(700, 360);
await page.waitForFunction(() => window.cityjump.stats().buildings > 0, null, { timeout: 5_000 });

const drawn = await stats();
check("three clicks draw a road", drawn.segments === fresh.segments + 1, `${drawn.segments} segments`);
check("the road grows buildings", drawn.buildings > 0, `${drawn.buildings} buildings`);
check("building a road spends money", drawn.money < fresh.money, `$${drawn.money} vs $${fresh.money}`);
await page.evaluate(() => window.cityjump.setMoney(200_000));
check(
  "far enough out the city is drawn as boxes, and the models come back on the way in",
  await page.evaluate(async () => {
    const scene = window.cityjump._scene;
    const camera = scene.activeCamera;
    const before = { radius: camera.radius, beta: camera.beta, alpha: camera.alpha };
    const boxes = scene.getMeshByName("building_distant");
    const models = () => scene.meshes.filter((m) => /^building_(lot|farm|industrial|military)_/.test(m.name) && m.isEnabled()).length;
    const frame = () => new Promise((resolve) => scene.onAfterRenderObservable.addOnce(() => resolve()));
    window.cityjump.camera(1600, Math.PI / 3.4);
    await frame();
    await frame();
    const far = { boxes: boxes.isEnabled(), models: models(), instances: boxes.thinInstanceCount };
    window.cityjump.camera(400, Math.PI / 3.4);
    await frame();
    await frame();
    const near = { boxes: boxes.isEnabled(), models: models() };
    // Put the camera back: everything after this check is framed the way it was.
    camera.radius = before.radius;
    camera.beta = before.beta;
    camera.alpha = before.alpha;
    await frame();
    return far.boxes && far.models === 0 && far.instances > 0 && !near.boxes && near.models > 0;
  }),
);
const cityHud = await cityHudText();
check(
  "the city HUD shows population and one readable gauge per business",
  /residents$/.test(cityHud.population) &&
    /\$\d/.test(cityHud.money) &&
    /rising|waiting/.test(cityHud.money) &&
    ["Workers", "Commerce", "Farming", "Industry", "Military"].every((label) => cityHud.needs.includes(label)),
  JSON.stringify(cityHud),
);
check("roads grow streetlights", drawn.streetlights > 0, `${drawn.streetlights} streetlights`);
check("streetlights are real downward lights", (await realStreetlightCount()) > 0);
check("streetlights use clustered lighting", await clusteredStreetlights());
await setSettingsOpen(true);
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
    const slider = document.getElementById("sun-hour");
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
const litCity = await cityLightState();
check("city lights leave the sun and ambient sky fill alone", litCity.streetlights > 0 && litCity.headlights > 0 && litCity.sun > 0 && litCity.ambient > 0);
await page.locator("#show-lights").uncheck();
const playerDarkenedCity = await cityLightState();
check(
  "city lights can be switched off without making night black",
  playerDarkenedCity.streetlights === 0 && playerDarkenedCity.headlights === 0 && playerDarkenedCity.sun > 0 && playerDarkenedCity.ambient > 0,
  `${JSON.stringify(playerDarkenedCity)}`,
);
await page.locator("#show-lights").check();
const relitCity = await cityLightState();
check("city lights can be restored", relitCity.streetlights > 0 && relitCity.headlights > 0, `${JSON.stringify(relitCity)}`);
check("streetlights include facade fill lights", await streetlightFacadeLights());
check("streetlights reach nearby buildings", await streetlightsReachBuildings());
check("buildings do not use fake emissive lighting by night", (await buildingFacadeEmission()) === 0);
check("buildings use the same night lighting pipeline as scenery", await buildingLightPipeline());
await page.locator("#show-buildings").uncheck();
check("generated buildings can be hidden", (await stats()).buildings === 0);
await page.locator("#show-buildings").check();
check("generated buildings can be restored", (await stats()).buildings === drawn.buildings);
const shortcut = process.platform === "darwin" ? "Meta" : "Control";
const hourBeforeUndo = await page.locator("#sun-hour").inputValue();
await page.locator("#undo-city").click();
check("undo button removes the last city change", (await stats()).segments === fresh.segments);
check("undo leaves the sun hour alone", (await page.locator("#sun-hour").inputValue()) === hourBeforeUndo);
await page.locator("#undo-city").click();
check("empty undo says so", /Nothing to undo/.test(await toast()));
await page.locator("#redo-city").click();
check("redo button restores the city change", (await stats()).segments === drawn.segments);
await page.keyboard.press(`${shortcut}+Z`);
check("undo shortcut removes the last city change", (await stats()).segments === fresh.segments);
await page.keyboard.press(`${shortcut}+Shift+Z`);
check("redo shortcut restores the city change", (await stats()).segments === drawn.segments);
await setSettingsOpen(true);
await page.locator("#save-slot").focus();
await page.keyboard.press(`${shortcut}+Z`);
check("undo shortcut is inert while a field has focus", (await stats()).segments === drawn.segments);
const unzonedModels = await buildingModelCounts();
await page.locator('[data-tool="zones"]').click();
await page.locator("#zone-radius").evaluate((input) => {
  input.value = "56";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.locator('input[name="zone-kind"][value="commercial"]').check();
await click(500, 350);
await page.waitForFunction(() => window.cityjump.stats().zones > 0, null, { timeout: 5_000 });
await page.waitForFunction((before) => JSON.stringify(window.cityjump._scene.meshes
  .filter((mesh) => mesh.name.startsWith("building_lot_"))
  .map((mesh) => [mesh.name, mesh.thinInstanceCount ?? 0])) !== before, JSON.stringify(Object.entries(unzonedModels)), { timeout: 5_000 });
const zoned = await stats();
const commercialModels = await buildingModelCounts();
check("a zone can be painted from the toolbar", zoned.zones > 0, `${zoned.zones} cells`);
check("zoning changes what gets built", JSON.stringify(commercialModels) !== JSON.stringify(unzonedModels));
await page.locator('[data-tool="select"]').click();
await page.locator('input[name="select-view"][value="no-buildings"]').check();
check("the Zones view shows the player's zones", await zonesOverlayVisible());
check("the buildable grid stays readable under zones", await buildableGridVisible());
await page.locator('[data-tool="zones"]').click();
await page.locator('input[name="zone-kind"][value="clear"]').check();
await click(500, 350);
await page.waitForFunction(() => window.cityjump.stats().zones === 0, null, { timeout: 5_000 });
await page.waitForFunction((before) => JSON.stringify(window.cityjump._scene.meshes
  .filter((mesh) => mesh.name.startsWith("building_lot_"))
  .map((mesh) => [mesh.name, mesh.thinInstanceCount ?? 0])) === before, JSON.stringify(Object.entries(unzonedModels)), { timeout: 5_000 });
check("a zone can be cleared from the toolbar", (await stats()).zones === 0);
check("clearing a zone restores the unzoned building mix", JSON.stringify(await buildingModelCounts()) === JSON.stringify(unzonedModels));
await page.locator('[data-tool="select"]').click();
await page.locator('input[name="select-view"][value="all"]').check();
await page.locator('[data-tool="roads"]').click();
check("roads spawn test traffic", drawn.cars > 0, `${drawn.cars} cars`);
await page.locator("#traffic-density").evaluate((input) => {
  input.value = "2";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForFunction((cars) => window.cityjump.stats().cars > cars, drawn.cars, { timeout: 5_000 });
const denseTraffic = await stats();
check("traffic density can make the city busier", denseTraffic.cars > drawn.cars, `${denseTraffic.cars} vs ${drawn.cars}`);
await page.locator("#traffic-density").evaluate((input) => {
  input.value = "0.25";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForFunction((cars) => window.cityjump.stats().cars < cars, denseTraffic.cars, { timeout: 5_000 });
const quietTraffic = await stats();
check("traffic density can make the city quieter without emptying it", quietTraffic.cars > 0 && quietTraffic.cars < denseTraffic.cars, `${quietTraffic.cars}`);
await setSettingsOpen(true);
await page.locator("#show-traffic").uncheck();
await page.waitForFunction(() => window.cityjump.stats().cars === 0 && window.cityjump.stats().pedestrians === 0, null, { timeout: 5_000 });
check("traffic can be switched off instead of hidden", (await stats()).cars === 0 && (await stats()).pedestrians === 0);
await page.locator("#show-traffic").check();
await page.locator("#traffic-density").evaluate((input) => {
  input.value = "1";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForFunction((cars) => window.cityjump.stats().cars === cars, drawn.cars, { timeout: 5_000 });
await page.locator('[data-time-rate="1"]').click();
await page.waitForFunction(() => window.cityjump.stats().timeRate === 1, null, { timeout: 5_000 });
await realTime(300);
const beforeTraffic = await trafficPositions();
await page.waitForFunction(
  (before) =>
    window.cityjump._scene.meshes
      .filter((mesh) => mesh.name.startsWith("traffic_"))
      .some((mesh, i) => Math.hypot(mesh.position.x - before[i]?.[0], mesh.position.z - before[i]?.[1]) > 0.5),
  beforeTraffic,
  { timeout: 5_000 },
);
const afterTraffic = await trafficPositions();
check("test traffic moves along roads", beforeTraffic.some((p, i) => Math.hypot(p[0] - afterTraffic[i][0], p[1] - afterTraffic[i][1]) > 0.5));
await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
await page.keyboard.press("Space");
await page.waitForFunction(() => window.cityjump.paused(), null, { timeout: 5_000 });
const pausedTraffic = await trafficPositions();
await realTime(500);
const stillTraffic = await trafficPositions();
check("space pauses the simulation", pausedTraffic.every((p, i) => Math.hypot(p[0] - stillTraffic[i][0], p[1] - stillTraffic[i][1]) < 0.05));
await page.keyboard.press("Space");
await page.waitForFunction(() => !window.cityjump.paused(), null, { timeout: 5_000 });
await page.waitForFunction(
  (before) =>
    window.cityjump._scene.meshes
      .filter((mesh) => mesh.name.startsWith("traffic_"))
      .some((mesh, i) => Math.hypot(mesh.position.x - before[i]?.[0], mesh.position.z - before[i]?.[1]) > 0.5),
  stillTraffic,
  { timeout: 5_000 },
);
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
check("the road type selector offers industrial roads", (await page.locator('input[name="road-type"][value="industrial"]').count()) === 1);
check("the road type selector offers dirt and military roads", (await page.locator('input[name="road-type"][value="dirt"]').count()) === 1 && (await page.locator('input[name="road-type"][value="military"]').count()) === 1);
const industrialBefore = await industrialBuildingCount();
await page.evaluate(() => {
  if (!window.cityjump.road(-1500, 900, -1300, 930, -1100, 900, "industrial")) throw new Error("industrial road refused");
  window.cityjump.rebuild();
});
await page.waitForFunction((before) => window.cityjump._scene.meshes
  .filter((mesh) => /^building_industrial_\dx4$/.test(mesh.name))
  .reduce((sum, mesh) => sum + (mesh.thinInstanceCount ?? 0), 0) > before, industrialBefore, { timeout: 5_000 });
const industrial = await page.evaluate(() => window.cityjump._graph.allSegments().filter((segment) => segment.type === "industrial").length);
check("industrial roads generate industrial buildings", industrial >= 1 && (await industrialBuildingCount()) > industrialBefore, `${industrial} industrial roads`);
const worksTraffic = await page.evaluate(() => {
  const road = window.cityjump._graph.allSegments().find((segment) => segment.type === "industrial");
  return window.cityjump._scene.meshes
    .filter((mesh) => mesh.name.startsWith(`traffic_${road.id}_`))
    .map((mesh) => mesh.sourceMesh?.name ?? "");
});
check(
  "an industrial road mostly carries works vehicles",
  worksTraffic.length > 0 && worksTraffic.some((name) => name.includes("tanker") || name.includes("flatbed")),
  JSON.stringify(worksTraffic),
);
check(
  "industrial roads have their own road markings",
  await page.evaluate(() => {
    const road = window.cityjump._graph.allSegments().find((segment) => segment.type === "industrial");
    return !!road && window.cityjump._scene.meshes.filter((mesh) => mesh.name.startsWith(`industrial_mark_${road.id}_`) && mesh.isEnabled()).length === 3;
  }),
);
await page.evaluate(() => {
  if (!window.cityjump.road(-1500, 980, -1300, 1010, -1100, 980, "industrial_oneway")) throw new Error("industrial one-way road refused");
  window.cityjump.rebuild();
});
check(
  "industrial one-way roads use fewer road markings",
  await page.evaluate(() => {
    const road = window.cityjump._graph.allSegments().find((segment) => segment.type === "industrial_oneway");
    return !!road && window.cityjump._scene.meshes.filter((mesh) => mesh.name.startsWith(`industrial_mark_${road.id}_`) && mesh.isEnabled()).length === 2;
  }),
);
const beforeTunnel = await stats();
await page.locator('input[name="road-type"][value="tunnel"]').check();
await click(220, 500);
await click(300, 430);
const tunneled = await stats();
check("the road type selector draws tunnels", tunneled.tunnels >= 1, `${tunneled.tunnels} tunnels`);
check("tunnels render an entrance and exit", (await tunnelPortalCount()) >= 2);
check("tunnels do not grow surface buildings", tunneled.buildings === beforeTunnel.buildings, `${tunneled.buildings} vs ${beforeTunnel.buildings}`);
check("tunnels carry vehicle traffic", tunneled.cars > beforeTunnel.cars, `${tunneled.cars} vs ${beforeTunnel.cars}`);
await page.locator('[data-tool="select"]').click();
await page.locator('input[name="select-view"][value="traffic"]').check();
await nextFrame();
const tunnelTrafficView = await page.evaluate(() => {
  const tunnel = window.cityjump._graph.allSegments().find((segment) => segment.type.startsWith("tunnel"));
  return tunnel ? window.cityjump._scene.meshes.filter((mesh) => mesh.name.startsWith(`traffic_lane_${tunnel.id}_`) && mesh.isEnabled()).length : 0;
});
check("the Traffic view draws tunnel lane overlays", tunnelTrafficView > 0, `${tunnelTrafficView} tunnel lanes`);
await page.locator('[data-tool="roads"]').click();

// A pedestrian path carries people on foot and no cars at all.
await page.locator('input[name="road-type"][value="pedestrian"]').check();
await click(180, 300);
await click(560, 250);
await page.waitForFunction((previous) => window.cityjump.stats().buildings > previous, tunneled.buildings, { timeout: 5_000 });
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
  // Both footways of a road live in one mesh, so this reads its vertices rather than its name:
  // paving has to sit out beyond the kerb on both sides of the centre line.
  "ordinary roads get a footway either side",
  await page.evaluate(() => {
    const graph = window.cityjump._graph;
    const seg = graph.allSegments().find((s) => s.type === "street" && s.length > 60);
    if (!seg) return false;
    const mesh = window.cityjump._scene.getMeshByName(`sidewalk_${seg.id}`);
    if (!mesh) return false;
    const mid = graph.pointAt(seg.id, seg.length / 2);
    const len = Math.hypot(mid.tangent.x, mid.tangent.z);
    const n = { x: -mid.tangent.z / len, z: mid.tangent.x / len };
    const positions = mesh.getVerticesData("position");
    let left = 0;
    let right = 0;
    for (let i = 0; i < positions.length; i += 3) {
      const side = (positions[i] - mid.position.x) * n.x + (positions[i + 2] - mid.position.z) * n.z;
      left = Math.max(left, side);
      right = Math.min(right, side);
    }
    // A street is 8 m wide, so paving beyond 4 m out on both sides is a footway on both sides.
    return left > 4 && right < -4;
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
check(
  "roundabout arms have asphalt gap fillers and splitter islands",
  await page.evaluate((id) => {
    const scene = window.cityjump._scene;
    const gaps = scene.meshes.filter((m) => m.name.endsWith(`_${id}`) && m.name.startsWith("roundabout_gap_"));
    const splitters = scene.meshes.filter((m) => m.name.endsWith(`_${id}`) && m.name.startsWith("roundabout_splitter_"));
    return gaps.length > 0 && gaps.length === splitters.length;
  }, junctionScreen.id),
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
await page.waitForFunction(() => {
  const raw = window.localStorage.getItem("cityjump.autosave");
  if (!raw) return false;
  try {
    return JSON.parse(raw).nodes?.some((node) => node[4] === 1);
  } catch {
    return false;
  }
}, null, { timeout: 5_000 });
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
await setSettingsOpen(true);
await page.locator("#show-fps").check();
const hudOverlap = await page.evaluate(() => {
  const fps = document.getElementById("fps-counter").getBoundingClientRect();
  const panel = document.getElementById("selection-panel").getBoundingClientRect();
  return !(fps.right <= panel.left || panel.right <= fps.left || fps.bottom <= panel.top || panel.bottom <= fps.top);
});
check("fps counter and selection panel do not overlap", !hudOverlap);
await page.locator("#show-fps").uncheck();
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
check("a building panel shows its state", Boolean(selectedBuilding.rows.State), JSON.stringify(selectedBuilding.rows));
await page.locator('input[name="select-view"][value="traffic"]').check();
await page.evaluate(() => window.cityjump.setPaused(true));
check("there is a vehicle to select", await page.evaluate(() => window.cityjump.selectVehicle()));
const selectedVehicle = await page.evaluate(() => ({
  hidden: document.getElementById("selection-panel").hidden,
  kind: document.querySelector("#selection-panel .selection-kind").textContent,
  rows: Object.fromEntries(
    [...document.querySelectorAll("#selection-panel dt")].map((dt) => [dt.textContent, dt.nextElementSibling?.textContent ?? ""]),
  ),
}));
check("clicking a car opens its street", !selectedVehicle.hidden && selectedVehicle.kind === "Car" && Boolean(selectedVehicle.rows.Street), JSON.stringify(selectedVehicle));
check("a selected car names what kind of vehicle it is", Boolean(selectedVehicle.rows.Type), JSON.stringify(selectedVehicle.rows));
await page.evaluate(() => {
  for (const segment of window.cityjump._graph.allSegments()) segment.streetId += 1000;
});
await page.waitForFunction(
  (street) => Object.fromEntries([...document.querySelectorAll("#selection-panel dt")].map((dt) => [dt.textContent, dt.nextElementSibling?.textContent ?? ""])).Street !== street,
  selectedVehicle.rows.Street,
  { timeout: 5_000 },
);
check("selected car street updates when it changes", true);
await page.evaluate(() => window.cityjump.setPaused(false));
await page.locator('input[name="select-view"][value="all"]').check();
await setSettingsOpen(true);
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
const followVehiclePoint = await screenPoint("window.cityjump.vehiclePoint()");
check("there is still a vehicle to follow", followVehiclePoint !== null);
await click(followVehiclePoint.x, followVehiclePoint.y);
const cameraBeforeFollow = await page.evaluate(() => window.cityjump.cameraState());
await setSettingsOpen(true); // the click above folded the menu away, and the camera controls live in it
await page.locator('input[name="camera-mode"][value="follow"]').check();
await realTime(650);
const cameraAfterFollow = await page.evaluate(() => window.cityjump.cameraState());
check("follow mode keeps the selected car framed", Math.hypot(cameraAfterFollow.targetX - cameraBeforeFollow.targetX, cameraAfterFollow.targetZ - cameraBeforeFollow.targetZ) > 0.2);
check("follow mode turns with the selected car", Math.abs(cameraAfterFollow.alpha - cameraBeforeFollow.alpha) > 0.02);
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
await page.locator('[data-tool="select"]').click();
await page.locator('[data-tool="roads"]').click();
await page.evaluate(() => window.cityjump.setMoney(0));
await click(300, 340);
await click(500, 280);
await click(700, 360);
check("a road the treasury cannot afford is refused", /treasury/.test(await toast()) && (await stats()).segments === walked.segments);

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
await setSettingsOpen(true);
await page.locator("#save-slot").selectOption("Rugged");
await page.locator("#save-load").click();
await nextFrame();
const terrainRelief = await page.evaluate(() => {
  const bounds = window.cityjump._scene.getMeshByName("ground").getBoundingInfo().boundingBox;
  return bounds.maximumWorld.y - bounds.minimumWorld.y;
});
check("a city saved on the rugged map loads back onto it", terrainRelief > 20, `${terrainRelief.toFixed(1)} m of relief`);
check("a save restores its hour of day", (await page.locator("#sun-time").textContent()).startsWith("22:"));
await page.evaluate(() => {
  const camera = window.cityjump._scene.activeCamera;
  window.localStorage.setItem(
    "cityjump.save.Camera",
    JSON.stringify({
      v: 7,
      terrain: "rolling",
      hour: 22,
      camera: { targetX: 12, targetY: 3, targetZ: -45, alpha: -1.1, beta: 0.8, radius: 333 },
      nodes: [],
      segments: [],
      planted: [],
      cleared: [],
      zones: [],
    }),
  );
  window.localStorage.setItem("cityjump.saves", JSON.stringify(["Camera", "Rugged"]));
  camera.target.set(0, 0, 0);
  camera.alpha = -2;
  camera.beta = 1;
  camera.radius = 111;
});
await page.reload({ waitUntil: "load" });
await waitForApp();
await setSettingsOpen(true);
await page.locator("#save-slot").selectOption("Camera");
await page.locator("#save-load").click();
const loadedCamera = await page.evaluate(() => window.cityjump.cameraState());
check(
  "a save restores its camera",
  Math.abs(loadedCamera.targetX - 12) < 0.01 &&
    Math.abs(loadedCamera.targetY - 3) < 0.01 &&
    Math.abs(loadedCamera.targetZ + 45) < 0.01 &&
    Math.abs(loadedCamera.alpha + 1.1) < 0.01 &&
    Math.abs(loadedCamera.beta - 0.8) < 0.01 &&
    Math.abs(loadedCamera.radius - 333) < 0.01,
  JSON.stringify(loadedCamera),
);
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
check("compass points north when the camera looks north", await page.locator(".compass-direction").textContent() === "N");
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
check("compass points west when the camera looks west", await page.locator(".compass-direction").textContent() === "W");
await page.evaluate(() => window.cityjump.camera(400, Math.PI / 3, Math.PI * 2));
await nextFrame();
check("compass wraps full camera turns", await page.locator(".compass-direction").textContent() === "W");
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
const builtHasOffshoreBridge = await page.evaluate(() =>
  window.cityjump._graph.allSegments().some((s) => s.type === "highway_2lane" && Math.max(window.cityjump._graph.node(s.a).pos.z, window.cityjump._graph.node(s.b).pos.z) > 2700),
);
const loadedSegmentCount = built.segments + (builtHasOffshoreBridge ? 0 : 1);
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
await page.waitForFunction(() => Boolean(window.__shareLink), null, { timeout: 5_000 });
const shareLink = await page.evaluate(() => window.__shareLink ?? "");
check("a share link is copied", shareLink.includes("#city="), shareLink.slice(0, 80));

// A file has no length ceiling, so it is what a city too big to share as a link travels in.
// Export and import each ask more than one question, so every dialog is answered until they are done.
let fileDialogAnswer = "";
const answerFileDialog = (dialog) => dialog.accept(fileDialogAnswer);
page.on("dialog", answerFileDialog);
const exported = await (async () => {
  fileDialogAnswer = "Exportville";
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 10_000 }), page.locator("#save-export").click()]);
  const path = await download.path();
  return { name: download.suggestedFilename(), city: JSON.parse(await readFile(path, "utf8")) };
})();
check(
  "a city can be exported to a file",
  exported.name === "Exportville.json" && exported.city.segments.length === (await stats()).segments,
  `${exported.name}, ${exported.city.segments?.length} segments`,
);
const beforeImport = await stats();
await page.evaluate(() => window.cityjump.reset());
fileDialogAnswer = "Importville";
await page.locator("#save-import-file").setInputFiles({ name: exported.name, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(exported.city)) });
// Replaying a save splits a road at every junction it rebuilds, so the count comes back at least
// as high as the file's -- the same allowance the load-a-city check makes.
await page.waitForFunction((count) => window.cityjump.stats().segments >= count, exported.city.segments.length, { timeout: 10_000 });
const importedFile = await page.evaluate(() => ({ segments: window.cityjump.stats().segments, active: localStorage.getItem("cityjump.activeSave") }));
check(
  "an exported city imports back under its own name",
  importedFile.segments >= exported.city.segments.length && importedFile.active === "Importville",
  JSON.stringify(importedFile),
);
page.off("dialog", answerFileDialog);
page.on("dialog", (dialog) => dialog.accept());
await page.evaluate(() => {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("cityjump.")) localStorage.removeItem(key);
  }
});
await page.goto("about:blank");
await page.goto(shareLink, { waitUntil: "load" });
await waitForApp();
await page.waitForFunction(() => location.hash === "", null, { timeout: 5_000 });
const imported = await stats();
const importState = await page.evaluate(() => ({
  hash: location.hash,
  saves: localStorage.getItem("cityjump.saves"),
  active: localStorage.getItem("cityjump.activeSave"),
  toast: document.getElementById("toast")?.textContent,
}));
check("arriving on a share link imports and loads the city", imported.segments === loadedSegmentCount, JSON.stringify({ imported: imported.segments, expected: loadedSegmentCount, importState }));
await page.waitForFunction(() => location.hash === "", null, { timeout: 5_000 });
check("the share fragment is removed after handling", await page.evaluate(() => location.hash === ""));
check("the imported city appears in the picker", (await page.locator("#save-slot option").allTextContents()).includes("Sharedville"));

await page.evaluate(() => window.cityjump.reset());
await nextFrame();
await page.locator("#save-load").click();
await nextFrame();
const loaded = await stats();
check("loading restores every segment", loaded.segments === loadedSegmentCount, `${loaded.segments}/${loadedSegmentCount}`);
await page.locator("#undo-city").click();
check("loading clears undo history", /Nothing to undo/.test(await toast()) && (await stats()).segments === loaded.segments);
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

// New: an empty city, framed on the island, and no longer standing on the last save's name.
const beforeNew = await stats(); // a dialog handler is already accepting everything by this point
await setSettingsOpen(true);
await page.locator("#save-new").click();
await page.waitForFunction((before) => window.cityjump.stats().segments < before, beforeNew.segments, { timeout: 10_000 });
const started = await page.evaluate(() => ({ ...window.cityjump.stats(), active: localStorage.getItem("cityjump.activeSave"), radius: window.cityjump.cameraState().radius }));
check(
  "New starts an empty city and stops standing on the last save",
  started.buildings === 0 && started.zones === 0 && started.active === null && started.radius > 400,
  JSON.stringify({ segments: started.segments, buildings: started.buildings, zones: started.zones, active: started.active }),
);

await page.evaluate(() => window.localStorage.setItem("cityjump.autosave", "{not json"));
await page.reload({ waitUntil: "load" });
await waitForApp();
check("a corrupted autosave is ignored rather than fatal", (await stats()).segments === fresh.segments);
await page.evaluate(() => window.cityjump.demoCity());
await page.waitForFunction(() => window.cityjump.stats().buildings > 0, null, { timeout: 10_000 });
await page.evaluate(() => window.cityjump.setMoney(0));
const beforeWave = await stats();
await page.evaluate(() => window.cityjump.forceWave());
await page.waitForFunction(() => window.cityjump.stats().kaiju === true, null, { timeout: 5_000 });
const liveWaveMarkers = await waveMarkersVisible();
check("a live wave marks the landing edge and target building", liveWaveMarkers.edge && liveWaveMarkers.target, JSON.stringify(liveWaveMarkers));
await page.evaluate(() => window.cityjump.forceWave(10_000));
await page.waitForFunction(() => {
  const city = window.cityjump.stats();
  return city.rubble > 0 && city.buildingStates.rebuilding > 0 && city.money < 0;
}, null, { timeout: 5_000 });
const afterWave = await stats();
check("the kaiju rebuilds a damaged building through debt", afterWave.money < beforeWave.money && afterWave.rubble > 0 && afterWave.buildingStates.rebuilding > 0, `$${afterWave.money}, rubble ${afterWave.rubble}, ${JSON.stringify(afterWave.buildingStates)}`);
check("a breached wave shows the breached banner", /Wave breached/.test(await waveBanner()), await waveBanner());
await page.locator("#undo-city").click();
check("undo refuses to cross a wave", /Nothing to undo/.test(await toast()));
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
