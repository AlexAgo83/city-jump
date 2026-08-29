import { describe, it, expect } from "vitest";
import { RoadGraph, type NodeId } from "./graph";
import { canGo, signalAt, signalCycle } from "./signals";
import { v3 } from "./vec";

function hub(bearings: number[], type = "street"): { g: RoadGraph; node: NodeId; arms: number[] } {
  const g = new RoadGraph();
  const node = g.addNode(0, 0);
  const arms = bearings.map((deg) => {
    const r = (deg * Math.PI) / 180;
    const end = g.addNode(Math.cos(r) * 200, Math.sin(r) * 200);
    return g.addSegment(node, end, v3(Math.cos(r) * 100, 0, Math.sin(r) * 100), type);
  });
  return { g, node, arms };
}

describe("signals", () => {
  it("runs the roads that face each other together", () => {
    const { g, node, arms } = hub([0, 90, 180, 270]);
    const cycle = signalCycle(g, node)!;
    expect(cycle.phases).toHaveLength(2);
    for (const phase of cycle.phases) expect(phase).toHaveLength(2);
    // The arm at 0 goes with the arm at 180, not with either of its neighbours.
    const withEast = cycle.phases.find((phase) => phase.includes(arms[0]!))!;
    expect(withEast).toContain(arms[2]!);
  });

  it("gives a T's stem its own phase", () => {
    const { g, node, arms } = hub([0, 180, 90]);
    const cycle = signalCycle(g, node)!;
    expect(cycle.phases).toHaveLength(2);
    expect(cycle.phases.find((phase) => phase.includes(arms[2]!))).toEqual([arms[2]!]);
  });

  it("says nothing to a one-way that only leaves the junction", () => {
    const g = new RoadGraph();
    const node = g.addNode(0, 0);
    const arm = (deg: number, type: string, outward: boolean) => {
      const r = (deg * Math.PI) / 180;
      const end = g.addNode(Math.cos(r) * 200, Math.sin(r) * 200);
      const control = v3(Math.cos(r) * 100, 0, Math.sin(r) * 100);
      return outward ? g.addSegment(node, end, control, type) : g.addSegment(end, node, control, type);
    };
    const west = arm(180, "street", false);
    const east = arm(0, "street", false);
    const north = arm(270, "street", false);
    const exitOnly = arm(90, "street_oneway", true);

    const cycle = signalCycle(g, node)!;
    expect(cycle.arms).toEqual(expect.arrayContaining([west, east, north]));
    expect(cycle.arms).not.toContain(exitOnly);
    expect(cycle.phases.flat()).not.toContain(exitOnly);
  });

  it("signals nothing at a roundabout, a bend, or a dead end", () => {
    const { g, node } = hub([0, 90, 180, 270]);
    g.setRoundabout(node, true, 1);
    expect(signalCycle(g, node)).toBe(null);

    expect(signalCycle(...(() => { const h = hub([0, 180]); return [h.g, h.node] as const; })())).toBe(null);
    expect(signalCycle(...(() => { const h = hub([0]); return [h.g, h.node] as const; })())).toBe(null);
  });

  it("gives one phase green at a time, with amber and an all-red between", () => {
    const { g, node, arms } = hub([0, 90, 180, 270]);
    const cycle = signalCycle(g, node)!;
    const at = (t: number) => arms.map((arm) => signalAt(cycle, arm, t - cycle.offset));

    // Never two crossing phases on green at once, all the way round the cycle.
    for (let t = 0; t < cycle.length; t += 0.25) {
      const green = arms.filter((arm) => canGo(signalAt(cycle, arm, t)));
      const phase = cycle.phases.find((p) => green.every((arm) => p.includes(arm)));
      expect(green.length === 0 || phase !== undefined).toBe(true);
    }
    // Its own phase, whichever that is: green, then amber, then red while the others have theirs.
    const phaseLength = cycle.length / cycle.phases.length;
    const mine = cycle.phases.findIndex((phase) => phase.includes(arms[0]!));
    const start = mine * phaseLength;
    // A hair inside each step, since the boundaries themselves are the changeover.
    expect(at(start + 0.5)[0]).toBe("green");
    expect(at(start + 9.5)[0]).toBe("amber");
    expect(at(start + 11.5)[0]).toBe("red");
    expect(at(start + phaseLength + 0.5)[0]).toBe("red");
    // And it comes back round.
    expect(at(start + 0.5 + cycle.length)[0]).toBe("green");
  });
});
