import assert from "node:assert/strict";
import { test } from "node:test";

import { ablationRatio } from "../scripts/measurement.mjs";

test("an ablation ratio survives a drifting baseline", () => {
  // A machine warming up: the full scene slides from 80 fps to 40 over the round, while the
  // ablated feature costs a constant fifth of the frame rate throughout. Every ratio has to read
  // 1.25, whenever in the round it was taken.
  const baseline = (round) => 80 - round * 4;
  for (let round = 0; round < 10; round++) {
    const before = baseline(round);
    const after = baseline(round + 1);
    const withFeatureOff = ((before + after) / 2) * 1.25;
    assert.equal(ablationRatio(withFeatureOff, before, after).toFixed(2), "1.25");
  }

  // Dividing by the round's first baseline instead: the same constant cost reads as a 2.2x win by
  // the end of the round, which is the drift, not the feature.
  const stale = baseline(0);
  const last = (baseline(9) + baseline(10)) / 2;
  assert.ok((last * 1.25) / stale < 0.8);
});

test("an ablation ratio refuses a baseline that never rendered", () => {
  assert.throws(() => ablationRatio(30, 0, 0), /positive frame rate/);
});
