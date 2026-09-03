import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

const src = new URL("../src/", import.meta.url);
const files = (await readdir(src, { recursive: true })).filter((file) => file.endsWith(".ts"));

function imports(source) {
  return [...source.matchAll(/(?:import|export)\s+(?:type\s+)?(?:[^"']*?from\s*)?["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
}

test("source layers keep their dependency direction", async () => {
  for (const file of files) {
    const source = await readFile(new URL(file, src), "utf8");
    const dependencies = imports(source);

    if (file.startsWith("sim/")) {
      assert.equal(/\b(?:document|window)\b/.test(source), false, `${file} uses a browser global`);
      for (const dependency of dependencies) {
        assert.equal(
          dependency.startsWith("@babylonjs") || /(?:^|\/)\.\.\/(?:app|render|ui)(?:\/|$)/.test(dependency),
          false,
          `${file} imports ${dependency}`,
        );
      }
    }

    if (file.startsWith("render/")) {
      for (const dependency of dependencies) {
        assert.equal(/(?:^|\/)\.\.\/(?:app|ui)(?:\/|$)/.test(dependency), false, `${file} imports ${dependency}`);
      }
    }
  }
});

test("only app code installs the active terrain", async () => {
  for (const file of files.filter((file) => file !== "sim/terrain.ts" && !file.endsWith(".test.ts"))) {
    const source = await readFile(new URL(file, src), "utf8");
    if (source.includes("setTerrain(")) assert.equal(file.startsWith("app/"), true, `${file} calls setTerrain`);
  }
});

test("main is only the application bootstrap", async () => {
  const source = await readFile(new URL("main.ts", src), "utf8");
  assert.deepEqual(imports(source), ["./app/app"]);
});

test("district dark path raises the alert surface", async () => {
  const hud = await readFile(new URL("ui/hud.ts", src), "utf8");
  const app = await readFile(new URL("app/app.ts", src), "utf8");

  assert.match(hud, /export function showAlert/);
  assert.match(app, /showAlert\("A district went dark\."\)/);
});

function inlineHash(html, tag) {
  const match = html.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  assert.ok(match, `missing inline ${tag}`);
  return createHash("sha256").update(match[1]).digest("base64");
}

test("HUD and CSP keep loaded city values out of HTML sinks", async () => {
  const hud = await readFile(new URL("ui/hud.ts", src), "utf8");
  const render = await readFile(new URL("../render.yaml", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.doesNotMatch(hud, /\.innerHTML\b/);
  assert.match(render, /Content-Security-Policy/);
  assert.match(render, /default-src 'self'/);
  assert.match(render, /object-src 'none'/);
  assert.match(render, /base-uri 'none'/);
  assert.match(render, new RegExp(`script-src 'self' 'sha256-${inlineHash(html, "script")}'`));
  assert.match(render, new RegExp(`style-src 'self' 'sha256-${inlineHash(html, "style")}'`));
  assert.doesNotMatch(render, /style-src[^\\n]*'unsafe-inline'/);
});

test("static hosting and asset cache keys stay diagnosable", async () => {
  const render = await readFile(new URL("../render.yaml", import.meta.url), "utf8");
  const assets = await readFile(new URL("render/assets.ts", src), "utf8");
  const buildings = await readFile(new URL("render/buildings.ts", src), "utf8");
  const kaiju = await readFile(new URL("render/kaiju.ts", src), "utf8");
  const vite = await readFile(new URL("../vite.config.mjs", import.meta.url), "utf8");

  assert.doesNotMatch(render, /type:\s*rewrite/);
  assert.match(assets, /package-derived query key/);
  assert.match(vite, /package\.json/);
  assert.match(vite, /__APP_VERSION__/);
  assert.match(buildings, /v=\$\{ASSET_VERSION\}/);
  assert.match(kaiju, /v=\$\{ASSET_VERSION\}/);
  assert.doesNotMatch(`${buildings}\n${kaiju}`, /(?:BUILDING|KAIJU)_ASSET_VERSION/);
});

test("release deploy workflow keeps secrets out of templated shell", async () => {
  const workflow = await readFile(new URL("../.github/workflows/render-release-deploy.yml", import.meta.url), "utf8");
  const runBlocks = workflow.match(/run: \|\n(?: {10}.*\n| {10}\n)+/g) ?? [];

  assert.equal(runBlocks.some((block) => block.includes("${{")), false);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(workflow, /git rev-parse --verify "refs\/tags\/\$\{release_tag\}\^\{commit\}"/);
  assert.doesNotMatch(workflow, /git rev-list/);
  assert.match(workflow, /RENDER_API_KEY: \$\{\{ secrets\.RENDER_API_KEY \}\}/);
  assert.match(workflow, /RENDER_SERVICE_ID: \$\{\{ secrets\.RENDER_SERVICE_ID \}\}/);
  assert.match(workflow, /RENDER_POLL_TIMEOUT_SECONDS: 900/);
  assert.match(workflow, /RENDER_POLL_INTERVAL_SECONDS: 15/);
  assert.match(workflow, /\/v1\/services\/\$\{RENDER_SERVICE_ID\}\/deploys\?limit=20/);
  assert.match(workflow, /live\|deactivated/);
  assert.match(workflow, /build_failed\|canceled/);
});
