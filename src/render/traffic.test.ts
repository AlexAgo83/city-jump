import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Meshes/instancedMesh";

import { RoadGraph } from "../sim/graph";
import { v3 } from "../sim/vec";
import { createTrafficRenderer } from "./traffic";

/** The driving rules themselves are in `src/sim/traffic.test.ts`; this needs a real scene. */
describe("traffic renderer", () => {
  it("rebinds retained movers to the current segment after a dirty rebuild", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(160, 0);
    const id = graph.addSegment(a, b, v3(80, 0, 0), "street");
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const traffic = createTrafficRenderer(scene, graph, () => 16, () => 0);

    traffic.rebuild();
    const before = traffic.firstVehicle()!.segment;
    const after = { ...before, length: before.length + 10 };
    (graph as unknown as { segments: Map<number, typeof after> }).segments.set(id, after);

    traffic.rebuild({ minX: 1000, maxX: 1010, minZ: 1000, maxZ: 1010 });

    expect(traffic.firstVehicle()!.segment).toBe(after);
    scene.dispose();
    engine.dispose();
  });});
