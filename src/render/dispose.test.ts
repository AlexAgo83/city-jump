import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";

import { RoadGraph } from "../sim/graph";
import type { BuildableCell } from "../sim/slots";
import { Utilities, suppliedDiffusers } from "../sim/utilities";
import { v3 } from "../sim/vec";
import { Zones } from "../sim/zones";
import { createMissileRenderer } from "./missiles";
import { createRubbleRenderer } from "./rubble";
import { createUtilityRenderer } from "./utilities";
import { createZoneRenderer } from "./zones";

describe("renderer disposal", () => {
  it("removes simple renderer meshes and materials from the scene", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(80, 0);
    graph.addSegment(a, b, v3(40, 0, 0), "street");

    const utilities = new Utilities();
    utilities.place(graph, "producer", "power", 20, 0);
    utilities.place(graph, "diffuser", "power", 40, 0);

    const zones = new Zones();
    const cell = zoneCell();
    zones.paintLots([cell], "residential");

    const zoneRenderer = createZoneRenderer(scene);
    const utilityRenderer = createUtilityRenderer(scene, graph, utilities, () => 0);
    const rubbleRenderer = createRubbleRenderer(scene, () => 0);
    const missileRenderer = createMissileRenderer(scene);

    zoneRenderer.rebuild([cell], zones);
    utilityRenderer.rebuild(suppliedDiffusers(graph, utilities.producers(), utilities.diffusers()));
    rubbleRenderer.rebuild([[0, 0]]);
    missileRenderer.rebuild([{ from: v3(0, 0, 0), to: v3(10, 0, 0), progress: 0.5 }]);

    expect(scene.meshes.length).toBeGreaterThan(0);
    expect(scene.materials.length).toBeGreaterThan(0);

    zoneRenderer.dispose();
    utilityRenderer.dispose();
    rubbleRenderer.dispose();
    missileRenderer.dispose();

    expect(scene.meshes).toHaveLength(0);
    expect(scene.materials.filter((material) => material.name !== "default material")).toHaveLength(0);
    scene.dispose();
    engine.dispose();
  });
});

function zoneCell(): BuildableCell {
  return {
    lowRise: false,
    industrial: false,
    buildingKind: "residential",
    segment: 1,
    side: 1,
    block: 0,
    column: 0,
    row: 0,
    rotationY: 0,
    corners: [v3(0, 0, 0), v3(8, 0, 0), v3(8, 0, 8), v3(0, 0, 8)],
  };
}
