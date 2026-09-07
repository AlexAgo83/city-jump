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

test("the shipped kaiju model matches its declared height", async () => {
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

test("the kaiju includes textured skin and complete articulated limbs within its browser budget", async () => {
  const buffer = await readFile(new URL("../public/kaiju.glb", import.meta.url));
  const gltf = glbJson(buffer);
  for (const name of ["body", "head", "jaw", "tail", "left_arm", "right_arm", "left_leg", "right_leg"]) {
    const node = gltf.nodes.find((candidate) => candidate.name === `kaiju_${name}`);
    assert.ok(node && node.mesh !== undefined, `missing ${name}`);
    assert.equal(node.rotation, undefined, `${name} must export in its neutral pose`);
    assert.equal(node.scale, undefined, `${name} must have baked scale`);
    assert.ok(gltf.meshes[node.mesh].primitives.length >= 2, `${name} must retain its attached details`);
  }
  const skin = gltf.materials.find((mat) => mat.name === "kaiju_scaled_hide");
  assert.ok(skin?.normalTexture && skin.pbrMetallicRoughness.baseColorTexture);
  assert.ok(gltf.images.length >= 2 && gltf.images.every((image) => image.bufferView !== undefined && !image.uri));
  const triangles = gltf.meshes.flatMap((mesh) => mesh.primitives).reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
  assert.ok(triangles > 20000 && triangles < 180000, `${triangles} triangles`);
  assert.ok(buffer.length < 12 * 1024 * 1024, `${buffer.length} bytes`);
});


test("kaiju pivots retain the animation layout and manifest triangle count", async () => {
  const gltf = glbJson(await readFile(new URL("../public/kaiju.glb", import.meta.url)));
  const manifest = JSON.parse(await readFile(new URL("../public/kaiju.manifest.json", import.meta.url), "utf8"));
  const nodes = Object.fromEntries(gltf.nodes.map((node) => [node.name, node]));
  const origin = nodes.kaiju_body.translation ?? [0, 0, 0];
  const scale = (nodes.kaiju_right_leg.translation[0] - nodes.kaiju_left_leg.translation[0]) / 18;
  const pivots = {
    head: [0, 73, 4], jaw: [0, 73, 9], tail: [0, 30, -7],
    left_leg: [-9, 34, -2], right_leg: [9, 34, -2],
    left_arm: [-15, 63, 0], right_arm: [15, 63, 0],
  };
  for (const [part, pivot] of Object.entries(pivots)) {
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(Math.abs(nodes[`kaiju_${part}`].translation[axis] - origin[axis] - pivot[axis] * scale) < 0.001, `${part} pivot axis ${axis}`);
    }
  }
  const triangles = gltf.meshes.flatMap((mesh) => mesh.primitives).reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
  assert.equal(triangles, manifest.models.kaiju.triangles);
});
