import { chromium } from "playwright";
const [url = "http://127.0.0.1:5173", out = "lights.png"] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
page.setDefaultTimeout(90_000);
const noise = [];
page.on("pageerror", (e) => noise.push(`exception: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") noise.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => Boolean(window.cityjump), null, { timeout: 30_000 });
const out1 = await page.evaluate(async () => {
  const api = window.cityjump;
  api.reset();
  // A signalled crossroads, and a roundabout next door that must have no signals at all.
  for (const [x, z] of [[-260, 0], [260, 0], [0, -260], [0, 260]]) api.road(0, 0, x / 2, z / 2, x, z, "avenue_2lane");
  for (const [x, z] of [[900, 0], [640, -260], [640, 260]]) api.road(640, 0, (640 + x) / 2, z / 2, x, z, "avenue_2lane");
  api.road(260, 0, 450, 0, 640, 0, "avenue_2lane");
  const g = api._graph;
  const ring = g.allNodes().find((n) => Math.abs(n.pos.x - 640) < 2);
  g.setRoundabout(ring.id, true, 1);
  api.rebuild();

  const scene = api._scene;
  const masts = scene.meshes.filter((m) => m.name.startsWith("signal_") && !m.name.includes("lamp"));
  const nearRing = masts.filter((m) => Math.hypot(m.position.x - 640, m.position.z) < 200).length;

  // Watch the signalled junction for a full cycle. Cars are expected to come to a dead stop
  // short of it, and to be let through in turn rather than all at once.
  const cars = () => scene.meshes.filter((m) => /^traffic_\d+_\d+$/.test(m.name));
  const still = new Map();
  let stopped = 0;
  let insideEastWest = 0;
  let insideNorthSouth = 0;
  let bothAtOnce = 0;
  const observer = scene.onAfterRenderObservable.add(() => {
    let ew = 0;
    let ns = 0;
    for (const car of cars()) {
      const r = Math.hypot(car.position.x, car.position.z);
      const prev = still.get(car.name);
      const moved = prev ? Math.hypot(car.position.x - prev.x, car.position.z - prev.z) : 1;
      still.set(car.name, { x: car.position.x, z: car.position.z });
      // Halted within sight of the junction: not moving, and not already through it.
      if (r < 45 && r > 14 && moved < 0.002) stopped++;
      if (r < 14) (Math.abs(car.position.x) > Math.abs(car.position.z) ? ew++ : ns++);
    }
    insideEastWest += ew > 0 ? 1 : 0;
    insideNorthSouth += ns > 0 ? 1 : 0;
    if (ew > 0 && ns > 0) bothAtOnce++;
  });
  await new Promise((r) => setTimeout(r, 30000));
  scene.onAfterRenderObservable.remove(observer);
  return {
    masts: masts.length,
    mastsNearRoundabout: nearRing,
    stats: api.stats(),
    framesWithACarStoppedShortOfTheJunction: stopped,
    framesWithTrafficInTheJunction: { eastWest: insideEastWest, northSouth: insideNorthSouth, both: bothAtOnce },
  };
});
await page.evaluate(() => window.cityjump.camera(120, Math.PI / 3.4, -Math.PI / 2));
await page.waitForTimeout(700);
console.log(JSON.stringify({ ...out1, noise }));
await page.screenshot({ path: out });
await browser.close();
