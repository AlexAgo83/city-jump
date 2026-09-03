import assert from "node:assert/strict";
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

test("release deploy workflow keeps secrets out of templated shell", async () => {
  const workflow = await readFile(new URL("../.github/workflows/render-release-deploy.yml", import.meta.url), "utf8");
  const runBlocks = workflow.match(/run: \|\n(?: {10}.*\n| {10}\n)+/g) ?? [];

  assert.equal(runBlocks.some((block) => block.includes("${{")), false);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(workflow, /git rev-parse --verify "refs\/tags\/\$\{release_tag\}\^\{commit\}"/);
  assert.doesNotMatch(workflow, /git rev-list/);
});
