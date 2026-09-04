import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { Scene } from "@babylonjs/core/scene";

import { RoadGraph } from "../sim/graph";
import { v3 } from "../sim/vec";
import { createRoadRenderer, portalOutline, segmentMeshTouchesBounds, sidewalkOuterCorner, tunnelSection, tunnelStripIndices } from "./roadMesh";

describe("road mesh geometry", () => {
  it("builds a symmetrical arched tunnel section", () => {
    const section = tunnelSection(12);

    expect(section[0]).toEqual({ x: -10, y: 0 });
    expect(section.at(-1)).toEqual({ x: 10, y: 0 });
    expect(section[4]!.y).toBeGreaterThan(section[1]!.y);
    const xs = section.map((p) => p.x);
    for (let i = 0; i < xs.length; i++) expect(xs[i]).toBeCloseTo(-xs[xs.length - 1 - i]!);
  });

  it("winds tunnel strip faces consistently", () => {
    expect(tunnelStripIndices(3, 1, false)).toEqual([0, 3, 1, 1, 3, 4, 1, 4, 2, 2, 4, 5]);
    expect(tunnelStripIndices(3, 1, true)).toEqual([0, 1, 3, 1, 4, 3, 1, 2, 4, 2, 5, 4]);
  });

  it("places a portal outline perpendicular to the road tangent", () => {
    const outline = portalOutline({ x: 100, z: 50 }, { x: 0, z: 1 }, 12, 7);

    expect(outline[0]!.x).toBeCloseTo(110);
    expect(outline[0]!.z).toBeCloseTo(50);
    expect(outline.at(-1)!.x).toBeCloseTo(90);
    expect(outline.at(-1)!.z).toBeCloseTo(50);
    expect(outline[0]!.y).toBe(7);
  });

  it("rebuilds road meshes whose swept width touches the dirty region", () => {
    expect(
      segmentMeshTouchesBounds(
        [
          { x: -100, y: 0, z: 0 },
          { x: 100, y: 0, z: 0 },
        ],
        { width: 10, highway: false, pedestrian: false },
        { minX: -2, maxX: 2, minZ: 6, maxZ: 8 },
      ),
    ).toBe(true);
  });

  it("aligns sidewalk ends with the neighbouring junction footway edge", () => {
    const low = { x: 0, y: 0, z: 0 };
    const high = { x: 10, y: 0, z: 0 };
    const corner = sidewalkOuterCorner(
      {
        node: 1,
        roundabout: 0,
        arms: [{ segment: 1, trim: 4, outward: { x: 0, y: 0, z: -1 }, angle: -Math.PI / 2, cornerLow: low, cornerHigh: high }],
        ring: [low, high, { x: 10, y: 0, z: 10 }, { x: 0, y: 0, z: 10 }],
      },
      high,
    );

    expect(corner!.equals(new Vector3(12.6, 0.24, 0))).toBe(true);
  });

  it("does not rebuild a diagonal road only because its broad AABB touches the dirty region", () => {
    expect(
      segmentMeshTouchesBounds(
      [
        { x: -100, y: 0, z: -100 },
        { x: 100, y: 0, z: 100 },
      ],
      { width: 10, highway: false, pedestrian: false },
      { minX: -2, maxX: 2, minZ: 90, maxZ: 94 },
      ),
    ).toBe(false);
  });

  it("toggles the traffic overlay without rebuilding road meshes", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(160, 0);
    const id = graph.addSegment(a, b, v3(80, 0, 0), "avenue_2lane");
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const roads = createRoadRenderer(scene, graph, () => 0);

    roads.rebuild();
    const road = scene.getMeshByName(`road_${id}`);
    const baseCount = scene.meshes.filter((mesh) => !mesh.name.startsWith("traffic_")).length;

    roads.setShowTraffic(true);

    expect(scene.getMeshByName(`road_${id}`)).toBe(road);
    expect(scene.meshes.filter((mesh) => !mesh.name.startsWith("traffic_")).length).toBe(baseCount);
    expect(scene.meshes.some((mesh) => mesh.name.startsWith("traffic_"))).toBe(true);

    roads.setShowTraffic(false);

    expect(scene.getMeshByName(`road_${id}`)).toBe(road);
    expect(scene.meshes.filter((mesh) => mesh.name.startsWith("traffic_")).length).toBe(0);
    scene.dispose();
    engine.dispose();
  });
});
