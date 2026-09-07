import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("bundled Demo save stays loadable", async () => {
  const save = JSON.parse(await readFile("public/default-demo.json", "utf8"));
  assert.equal(save.v, 14);
  assert.equal(save.hour, 20.5);
  assert.equal(save.day, 41);
  assert.equal(save.nodes.length, 85);
  assert.equal(save.segments.length, 131);
  assert.equal(save.planted.length, 56);
  // A grown city, not a road network: the Demo is what the README screenshots show, so an empty
  // or half-built one would quietly turn those captures into a lie.
  assert.equal(save.zones.length, 8318);
  assert.equal(save.buildingStates.length, 1275);
  // The camera the README captures are framed on. Changing it rewrites every screenshot.
  assert.ok(save.camera, "the Demo carries the framing its screenshots use");
  assert.equal(Math.round(save.camera.radius), 328);
});
