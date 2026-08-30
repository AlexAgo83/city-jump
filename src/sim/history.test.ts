import { describe, expect, it } from "vitest";

import { createCityHistory } from "./history";

describe("city history", () => {
  it("undoes, redoes, and discards redo after a new change", () => {
    const history = createCityHistory<number>(2);
    let value = 0;
    const restore = (next: number) => {
      value = next;
    };

    history.record(value);
    value = 1;
    expect(history.undo(value, restore)).toBe(true);
    expect(value).toBe(0);
    expect(history.redo(value, restore)).toBe(true);
    expect(value).toBe(1);

    history.record(value);
    value = 2;
    expect(history.undo(value, restore)).toBe(true);
    expect(value).toBe(1);
    history.record(value);
    value = 3;
    expect(history.canRedo).toBe(false);
  });

  it("keeps only the bounded number of snapshots", () => {
    const history = createCityHistory<number>(2);
    let value = 3;
    const restore = (next: number) => {
      value = next;
    };

    history.record(0);
    history.record(1);
    history.record(2);

    expect(history.undo(value, restore)).toBe(true);
    expect(value).toBe(2);
    expect(history.undo(value, restore)).toBe(true);
    expect(value).toBe(1);
    expect(history.undo(value, restore)).toBe(false);
  });
});
