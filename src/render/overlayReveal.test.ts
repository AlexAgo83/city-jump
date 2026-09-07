import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";

import { RoadGraph } from "../sim/graph";
import type { BuildableCell } from "../sim/slots";
import { Utilities, suppliedDiffusers } from "../sim/utilities";
import { v3 } from "../sim/vec";
import { Zones } from "../sim/zones";
import { createUtilityRenderer } from "./utilities";
import { createZoneRenderer } from "./zones";

const lot = (x: number, z: number, column: number): BuildableCell => ({
  lowRise: false,
  industrial: false,
  buildingKind: "residential",
  segment: 1,
  side: 1,
  block: 0,
  column,
  row: 0,
  rotationY: 0,
  corners: [v3(x, 0, z), v3(x + 8, 0, z), v3(x + 8, 0, z + 8), v3(x, 0, z + 8)],
});

const named = (scene: Scene, prefix: string) => scene.meshes.filter((mesh) => mesh.name.startsWith(prefix));

describe("overlays hidden while the city is edited", () => {
  it("builds the zone overlay on reveal, from the last edit rather than the first", () => {
    const scene = new Scene(new NullEngine());
    const zones = new Zones();
    const overlay = createZoneRenderer(scene);
    const cells = [lot(0, 0, 0), lot(8, 0, 1)];

    // Hidden: three edits, and not one of them generates geometry.
    zones.paintLots([cells[0]!], "residential");
    overlay.rebuild(cells, zones);
    zones.paintLots([cells[1]!], "industrial");
    overlay.rebuild(cells, zones);
    zones.paintLots(cells, "commercial");
    overlay.rebuild(cells, zones);
    expect(named(scene, "zones-overlay")).toHaveLength(0);

    // Revealed: one bucket, the commercial one, because that is what the city says now. Two
    // buckets would be the residential and industrial paint that the last edit replaced.
    overlay.setVisible(true);
    const revealed = named(scene, "zones-overlay");
    expect(revealed).toHaveLength(1);
    expect(revealed.every((mesh) => mesh.isEnabled())).toBe(true);

    // Hidden again and edited again: still nothing extra, and the reveal is current once more.
    overlay.setVisible(false);
    zones.paintLots(cells, null);
    overlay.rebuild(cells, zones);
    overlay.setVisible(true);
    expect(named(scene, "zones-overlay")).toHaveLength(0);
  });

  it("builds the utility overlay on reveal, and only once", () => {
    const scene = new Scene(new NullEngine());
    const graph = new RoadGraph();
    graph.addSegment(graph.addNode(0, 0), graph.addNode(80, 0), v3(40, 0, 0), "street");
    const utilities = new Utilities();
    utilities.place(graph, "producer", "power", 20, 0);
    const overlay = createUtilityRenderer(scene, graph, utilities, () => 0);
    const supplied = () => suppliedDiffusers(graph, utilities.producers(), utilities.diffusers());

    overlay.rebuild(supplied());
    expect(named(scene, "utility-")).toHaveLength(0);

    overlay.setVisible(true);
    const first = named(scene, "utility-").length;
    expect(first).toBeGreaterThan(0);

    // Revealing an already-revealed overlay must not build a second copy over the first.
    overlay.setVisible(true);
    expect(named(scene, "utility-")).toHaveLength(first);

    // An edit while shown still lands immediately.
    utilities.place(graph, "diffuser", "power", 40, 0);
    overlay.rebuild(supplied());
    expect(named(scene, "utility-").length).toBeGreaterThan(first);
  });
});
