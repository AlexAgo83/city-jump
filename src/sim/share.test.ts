import { describe, expect, it } from "vitest";

import { RoadGraph } from "./graph";
import { Plantings } from "./plantings";
import { SAVE_VERSION, serializeCity } from "./save";
import { encodeShare, decodeShare, MAX_SHARE_FRAGMENT } from "./share";
import { v3 } from "./vec";
import { Zones } from "./zones";

describe("share links", () => {
  it("round-trips a named city inside the link cap", async () => {
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(100, 0);
    graph.addSegment(a, b, v3(50, 0, 0));

    const payload = await encodeShare({ name: "Test City", city: serializeCity(graph, new Plantings(), new Zones(), "rolling", 14) });
    expect(payload).not.toBeNull();
    expect(payload!.length).toBeLessThan(MAX_SHARE_FRAGMENT);
    const shared = await decodeShare(payload!);
    expect(shared.name).toBe("Test City");
    expect(shared.city.segments).toHaveLength(1);
  });

  it("refuses malformed, too-large, and newer payloads", async () => {
    await expect(decodeShare("city=nope")).rejects.toThrow(/malformed|incorrect header|invalid/i);
    await expect(decodeShare(`city=${"x".repeat(MAX_SHARE_FRAGMENT)}`)).rejects.toThrow(/too large/i);
    const payload = await encodeShare({
      name: "Future",
      city: { v: SAVE_VERSION + 1, terrain: "rolling", hour: 14, nodes: [], segments: [], planted: [], cleared: [], zones: [], rubble: [] },
    });
    await expect(decodeShare(payload!)).rejects.toThrow(/newer|incompatible/i);
  });
});
