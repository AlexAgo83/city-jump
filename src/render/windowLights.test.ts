import { expect, it } from "vitest";
import { windowPower, windowSeeds } from "./windowLights";

it("keeps each connected window uniform, separate floors distinct, and powerless sites dark", () => {
  const vertices = [0, 1, 0, 2, 1, 0, 2, 3, 0, 0, 3, 0, 0, 5, 0, 2, 5, 0, 2, 7, 0, 0, 7, 0];
  const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7];
  const seeds = windowSeeds(vertices, indices);
  for (let i = 0; i < 4; i++) expect([...seeds.slice(i * 2, i * 2 + 2)]).toEqual([...seeds.slice(0, 2)]);
  expect(seeds[1]).not.toBe(seeds[9]);
  expect(windowSeeds(vertices, indices)).toEqual(seeds);
  expect(windowPower({ state: "working" })).toBe(1);
  expect(windowPower({ state: "idle", reason: "workers" })).toBe(1);
  expect(windowPower({ state: "idle", reason: "power" })).toBe(0);
  expect(windowPower({ state: "rising" })).toBe(0);
  expect(windowPower({ state: "rebuilding" })).toBe(0);
});
