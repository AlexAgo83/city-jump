import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("bundled Demo save stays loadable", async () => {
  const save = JSON.parse(await readFile("public/default-demo.json", "utf8"));
  assert.equal(save.v, 4);
  assert.equal(save.hour, 20.5);
  assert.equal(save.nodes.length, 427);
  assert.equal(save.segments.length, 68);
  assert.equal(save.planted.length, 605);
});
