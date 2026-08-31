import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("the shipped kaiju model is about fifty metres tall", async () => {
  const gltf = glbJson(await readFile(new URL("../public/kaiju.glb", import.meta.url)));
  const manifest = JSON.parse(await readFile(new URL("../public/kaiju.manifest.json", import.meta.url), "utf8"));
  const maxY = Math.max(
    ...gltf.nodes.flatMap((node) =>
      gltf.meshes[node.mesh].primitives.map((primitive) => (node.translation?.[1] ?? 0) + gltf.accessors[primitive.attributes.POSITION].max[1]),
    ),
  );
  assert.equal(manifest.models.kaiju.file, "kaiju.glb");
  assert.ok(Math.abs(maxY - manifest.models.kaiju.heightM) <= 1, `height ${maxY}`);
});
