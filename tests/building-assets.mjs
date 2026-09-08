import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import test from "node:test";
import { createHash } from "node:crypto";

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
    .filter((name) => /^(lot|farm|industrial|military|residential|commercial)_\dx\d(?:_[a-z_]+)?\.glb$/.test(name))
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
  const models = readdirSync(BUILDINGS).filter((name) => /^lot_\dx\d(?:_gable|_slab)?\.glb$/.test(name)).map((name) => name.slice(0, -4)).sort();

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

test("military batteries keep their footprint, origin and instancing budget", async () => {
  for (let frontage = 1; frontage <= 4; frontage++) for (const suffix of ["", "_b", "_c"]) {
    const model = `military_${frontage}x4${suffix}`;
    const buffer = await readFile(new URL(`${model}.glb`, BUILDINGS));
    const gltf = glbJson(buffer);
    const bounds = boundsOf(gltf);
    close(bounds.min[0], 0, model, "left edge");
    close(bounds.min[1], 0, model, "ground");
    close(bounds.max[2], 0, model, "front edge");
    close(bounds.max[0], frontage * 8 - 1.5, model, "width");
    close(bounds.min[2], -30.5, model, "depth");
    assert.ok(bounds.max[1] >= 8 && bounds.max[1] < 14, `${model} radar height`);
    assert.equal(gltf.meshes.length, 1, `${model} must remain one merged building`);
    for (const node of gltf.nodes) {
      assert.equal(node.translation, undefined);
      assert.equal(node.rotation, undefined);
      assert.equal(node.scale, undefined);
    }
    const triangles = gltf.meshes[0].primitives.reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
    assert.ok(triangles > 2000 && triangles < 20000, `${model}: ${triangles} triangles`);
    assert.ok(buffer.length < 1024 * 1024, `${model}: ${buffer.length} bytes`);
  }
});

test("detailed lots stay inside their cells with bounded geometry and baked transforms", async () => {
	for (let frontage = 1; frontage <= 4; frontage++) {
		for (let depth = 1; depth <= 4; depth++) for (const suffix of ["", "_gable", "_slab"]) {
			const model = `lot_${frontage}x${depth}${suffix}`;
			const buffer = await readFile(new URL(`${model}.glb`, BUILDINGS));
			const gltf = glbJson(buffer);
			const { min, max } = boundsOf(gltf);
			// The body leaves 0.75 m per side; the existing window frames project 0.62 m.
			close(min[0], -0.62, model, "left frame");
			close(max[0], frontage * 8 - 1.5 + 0.62, model, "right frame");
			close(min[1], 0, model, "ground");
			assert.ok(
				max[0] - min[0] < frontage * 8,
				`${model} crosses the neighbouring cell`,
			);
			assert.ok(max[2] - min[2] < depth * 8, `${model} exceeds parcel depth`);
			assert.equal(gltf.meshes.length, 1, model);
			for (const node of gltf.nodes) {
				assert.equal(node.translation, undefined);
				assert.equal(node.rotation, undefined);
				assert.equal(node.scale, undefined);
			}
			const primitives = gltf.meshes[0].primitives;
			const triangles = primitives.reduce(
				(sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3,
				0,
			);
			assert.ok(
				triangles < 14000 && buffer.length < 750000,
				`${model}: ${triangles} triangles, ${buffer.length} bytes`,
			);
			assert.ok(primitives.length <= 7, `${model} material draw budget`);
		}
	}
});

test("industrial works keep their parcel and bounded multi-material geometry", async () => {
  for (let frontage = 1; frontage <= 4; frontage++) for (const suffix of ["", "_b", "_c"]) {
    const model = `industrial_${frontage}x4${suffix}`;
    const buffer = await readFile(new URL(`${model}.glb`, BUILDINGS));
    const gltf = glbJson(buffer);
    const { min, max } = boundsOf(gltf);
    close(min[0], 0, model, "left edge");
    close(min[1], 0, model, "ground");
    close(max[2], 0, model, "front edge");
    close(max[0], frontage * 8 - 1.5, model, "width");
    close(min[2], -30.5, model, "depth");
    assert.ok(max[1] >= 9 && max[1] <= 19, `${model} height`);
    assert.equal(gltf.meshes.length, 1, model);
    for (const node of gltf.nodes) {
      assert.equal(node.translation, undefined);
      assert.equal(node.rotation, undefined);
      assert.equal(node.scale, undefined);
    }
    const primitives = gltf.meshes[0].primitives;
    const triangles = primitives.reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
    assert.ok(triangles < 10000 && buffer.length < 600000, `${model}: ${triangles} triangles, ${buffer.length} bytes`);
    assert.ok(primitives.length <= 8, `${model} material budget`);
    // The narrow depot used to silently skip every tank because its radius did not fit.
    if (suffix === "_c" || (suffix === "" && (frontage === 1 || frontage === 4))) {
      const tank = primitives.find((primitive) => gltf.materials[primitive.material].name === `${model}_tank`);
      assert.ok(tank, `${model} has no tank geometry`);
      const bounds = gltf.accessors[tank.attributes.POSITION];
      assert.ok(bounds.min[0] > 0 && bounds.max[0] < frontage * 8 - 1.5);
      if (frontage === 4 && suffix === "") assert.ok(bounds.min[0] > 0.8 + (frontage * 8 - 1.5) * 0.55, "tanks intersect the warehouse");
    }
  }
});

test("farms keep all equipment and crops within the parcel and instancing budget", async () => {
  for (let frontage = 1; frontage <= 4; frontage++) for (const suffix of ["", "_b", "_c"]) {
    const model = `farm_${frontage}x4${suffix}`;
    const buffer = await readFile(new URL(`${model}.glb`, BUILDINGS));
    const gltf = glbJson(buffer);
    const { min, max } = boundsOf(gltf);
    close(min[0], 0, model, "left edge");
    close(min[1], 0, model, "ground");
    close(max[2], 0, model, "front edge");
    close(max[0], frontage * 8 - 1.5, model, "width");
    close(min[2], -30.5, model, "depth including last crop bed");
    assert.ok(max[1] >= 8 && max[1] <= 12, `${model} height`);
    assert.equal(gltf.meshes.length, 1, model);
    for (const node of gltf.nodes) {
      assert.equal(node.translation, undefined);
      assert.equal(node.rotation, undefined);
      assert.equal(node.scale, undefined);
    }
    const primitives = gltf.meshes[0].primitives;
    const triangles = primitives.reduce((sum, primitive) => sum + gltf.accessors[primitive.indices].count / 3, 0);
    assert.ok(triangles < 8000 && buffer.length < 500000, `${model}: ${triangles} triangles, ${buffer.length} bytes`);
    assert.ok(primitives.length <= 10, `${model} material budget`);
    const feature = (suffix ? ["tunnel", "crop1", "orchard", "water"] : ["tunnel", "silo", "orchard", "water"])[(frontage - 1 + (suffix === "_b" ? 1 : suffix === "_c" ? 2 : 0)) % 4];
    assert.ok(primitives.some((primitive) => gltf.materials[primitive.material].name === `${model}_${feature}`), `${model} missing ${feature}`);
  }
});

test("urban variants and twenty towers match footprints, roof decks and browser budgets", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", BUILDINGS), "utf8"));
  const ids = Object.keys(manifest.models).filter((id) => /^(residential|commercial)_/.test(id));
  assert.equal(ids.length, 148);
  assert.equal(ids.filter((id) => id.includes("_tower")).length, 20);
  for (const footprint of ["residential_3x3", "residential_4x4", "commercial_3x4", "commercial_4x3"]) {
    const silhouettes = ["tower", "tower_steps", "tower_offset", "tower_crown", "tower_split"].map((variant) => JSON.stringify(manifest.models[`${footprint}_${variant}`].decks));
    assert.equal(new Set(silhouettes).size, 5, `${footprint} needs five distinct silhouettes`);
  }
  for (const kind of ["residential", "commercial"]) {
    for (let f = 1; f <= 4; f++) for (let d = 1; d <= 4; d++) {
      const roofs = ["a", "b", "court", "terraces"].map((v) => JSON.stringify(manifest.models[`${kind}_${f}x${d}_${v}`]));
      assert.equal(new Set(roofs).size, 4, `${kind}_${f}x${d} needs four distinct silhouettes`);
    }
  }
  let totalBytes = 0;
  for (const id of ids) {
    const [, frontage, depth, variant] = id.match(/_(\d)x(\d)_(a|b|court|terraces|tower(?:_steps|_offset|_crown|_split)?)$/);
    const buffer = await readFile(new URL(`${id}.glb`, BUILDINGS));
    totalBytes += buffer.length;
    const gltf = glbJson(buffer);
    const { min, max } = boundsOf(gltf);
    const w = Number(frontage) * 8 - 1.5, d = Number(depth) * 8 - 1.5;
    close(min[1], 0, id, "ground");
    assert.ok(min[0] >= -.75 && max[0] <= w+.75 && min[2] >= -d-.75 && max[2] <= .75, `${id} crosses parcel`);
    assert.equal(gltf.meshes.length, 1, id);
    for (const node of gltf.nodes) {
      assert.equal(node.translation, undefined, id);
      assert.equal(node.rotation, undefined, id);
      assert.equal(node.scale, undefined, id);
    }
    const primitives = gltf.meshes[0].primitives;
    const triangles = primitives.reduce((sum, p) => sum + gltf.accessors[p.indices].count/3, 0);
    assert.ok(triangles < 14000 && buffer.length < 750000 && primitives.length <= 6, `${id}: ${triangles} triangles / ${buffer.length} bytes`);
    const roof = manifest.models[id];
    close(max[1], roof.kind === "pitched" ? roof.ridgeY : Math.max(...roof.decks.map((deck) => deck.deckY)) + 1.5, id, "roof height");
    if (roof.kind === "terraced") {
      // Every declared deck must be an actual upward-facing vertex at that height in the GLB.
      const jsonLength = buffer.readUInt32LE(12);
      const bin = 20 + jsonLength + 8;
      for (const deck of roof.decks) {
        const found = primitives.some((p) => {
          const pos = gltf.accessors[p.attributes.POSITION], normal = gltf.accessors[p.attributes.NORMAL];
          const pv = gltf.bufferViews[pos.bufferView], nv = gltf.bufferViews[normal.bufferView];
          for (let i = 0; i < pos.count; i++) {
            const at = bin + pv.byteOffset + (pos.byteOffset ?? 0) + i*(pv.byteStride ?? 12);
            const na = bin + nv.byteOffset + (normal.byteOffset ?? 0) + i*(nv.byteStride ?? 12);
            if (Math.abs(buffer.readFloatLE(at+4)-deck.deckY) < EPSILON && buffer.readFloatLE(na+4) > .99 &&
                buffer.readFloatLE(at) >= deck.minX-EPSILON && buffer.readFloatLE(at) <= deck.maxX+EPSILON &&
                buffer.readFloatLE(at+8) >= deck.minZ-EPSILON && buffer.readFloatLE(at+8) <= deck.maxZ+EPSILON) return true;
          }
          return false;
        });
        assert.ok(found, `${id} has no roof surface at ${deck.deckY}`);
      }
    }
    if (variant === "a" || variant === "court") assert.ok(max[1] < 14, `${id} exceeds pedestrian height`);
    if (variant.startsWith("tower")) assert.ok(max[1] > 60 && max[1] < 140, `${id} tower height`);
  }
  assert.ok(totalBytes < 24*1024*1024, `urban library: ${totalBytes} bytes`);
});

test("small industrial variants fit one cell and retain their equipment", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", BUILDINGS), "utf8"));
  for (const variant of ["a", "b", "c"]) {
    const id = `industrial_1x1_${variant}`;
    const buffer = await readFile(new URL(`${id}.glb`, BUILDINGS));
    const gltf = glbJson(buffer);
    const { min, max } = boundsOf(gltf);
    for (const axis of [0, 1, 2]) close(min[axis], [0, 0, -6.5][axis], id, `minimum ${axis}`);
    close(max[0], 6.5, id, "width");
    close(max[2], 0, id, "front");
    assert.ok(max[1] > 5 && max[1] <= 8, `${id} equipment height`);
    assert.ok(manifest.models[id].deckY < max[1]);
    assert.equal(gltf.meshes.length, 1);
    for (const node of gltf.nodes) {
      assert.equal(node.translation, undefined);
      assert.equal(node.rotation, undefined);
      assert.equal(node.scale, undefined);
    }
    const primitives = gltf.meshes[0].primitives;
    const triangles = primitives.reduce((sum, p) => sum + gltf.accessors[p.indices].count / 3, 0);
    assert.ok(triangles < 2000 && buffer.length < 150000 && primitives.length <= 8, `${id} geometry budget`);
    const feature = variant === "c" ? "stack" : "glass";
    assert.ok(primitives.some((p) => gltf.materials[p.material].name === `${id}_${feature}`), `${id} missing ${feature}`);
  }
});


test("each compound and generic footprint has three different geometries", async () => {
  let addedBytes = 0;
  for (const family of ["lot", "farm", "industrial", "military"]) {
    for (let f = 1; f <= 4; f++) for (const d of family === "lot" ? [1,2,3,4] : [4]) {
      const geometries = new Set();
      for (const suffix of family === "lot" ? ["", "_gable", "_slab"] : ["", "_b", "_c"]) {
        const buffer = await readFile(new URL(`${family}_${f}x${d}${suffix}.glb`, BUILDINGS));
        if (suffix) addedBytes += buffer.length;
        const gltf = glbJson(buffer), bin = 20 + buffer.readUInt32LE(12) + 8;
        const hash = createHash("sha256");
        for (const primitive of gltf.meshes[0].primitives) {
          const view = gltf.bufferViews[gltf.accessors[primitive.attributes.POSITION].bufferView];
          hash.update(buffer.subarray(bin + (view.byteOffset ?? 0), bin + (view.byteOffset ?? 0) + view.byteLength));
        }
        geometries.add(hash.digest("hex"));
      }
      assert.equal(geometries.size, 3, `${family}_${f}x${d} repeats geometry`);
    }
  }
  assert.ok(addedBytes < 10*1024*1024, `additional compound/lot library: ${addedBytes} bytes`);
});
