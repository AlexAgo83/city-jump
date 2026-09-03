import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import test from "node:test";

const BUILDINGS = new URL("../public/buildings/", import.meta.url);
const EPSILON = 0.01;

function glbJson(buffer) {
  let offset = 12;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    if (type === 0x4e4f534a) return JSON.parse(buffer.subarray(offset + 8, offset + 8 + length).toString("utf8"));
    offset += 8 + length;
  }
  throw new Error("GLB JSON chunk missing");
}

function boundsOf(gltf) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessor = gltf.accessors?.[primitive.attributes?.POSITION];
      if (!accessor?.min || !accessor?.max) continue;
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], accessor.min[i]);
        max[i] = Math.max(max[i], accessor.max[i]);
      }
    }
  }
  return { min, max };
}

function close(actual, expected, model, quantity) {
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${model} ${quantity}: manifest=${expected}, glb=${actual}`);
}

test("every generated building model has a manifest entry", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", BUILDINGS), "utf8"));
  const shipped = readdirSync(BUILDINGS)
    .filter((name) => /^(lot|farm|industrial|military)_\dx\d\.glb$/.test(name))
    .map((name) => name.slice(0, -4))
    .sort();

  for (const model of shipped) assert.ok(manifest.models[model], `${model} missing from manifest`);
});

/**
 * The roof facts are what the renderer stands roof props on, and only the lot models carry them:
 * a farm, a works or a compound has a stack or a silo of its own and gets no props, so its
 * manifest entry only has to exist. The height contract is checked where it is relied on.
 */
test("the lot manifest agrees with shipped GLB height facts", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", BUILDINGS), "utf8"));
  const models = readdirSync(BUILDINGS).filter((name) => /^lot_\dx\d\.glb$/.test(name)).map((name) => name.slice(0, -4)).sort();

  for (const model of models) {
    const roof = manifest.models[model];
    const bounds = boundsOf(glbJson(await readFile(new URL(`${model}.glb`, BUILDINGS))));
    if (roof.kind === "pitched") {
      close(bounds.max[1], roof.ridgeY, model, "ridgeY");
    } else if (roof.kind === "setback") {
      close(bounds.max[1], roof.upperDeckY + 1.5, model, "upperDeckY");
    } else {
      close(bounds.max[1], roof.deckY + 1.5, model, "deckY");
    }
  }
});

test("hand-authored fallback building models declare usable height in the GLB", async () => {
  for (const model of ["block", "house", "shop", "tower"]) {
    const bounds = boundsOf(glbJson(await readFile(new URL(`${model}.glb`, BUILDINGS))));
    assert.ok(bounds.max[1] > bounds.min[1], `${model} has no GLB height`);
  }
});
