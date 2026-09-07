import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { Scene } from "@babylonjs/core/scene";

import { ROAD_LIFT, SIDEWALK_LIFT } from "../sim/roadTypes";
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

  it("keeps roads and sidewalks as surfaces without extruded sides", () => {
    const graph = new RoadGraph();
    const a = graph.addNode(0, 0);
    const b = graph.addNode(160, 0);
    const id = graph.addSegment(a, b, v3(80, 0, 0));
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const roads = createRoadRenderer(scene, graph, () => 0);

    roads.rebuild();
    const ys = scene.getMeshByName(`road_${id}`)!.getVerticesData("position")!.filter((_, i) => i % 3 === 1);
    const sidewalkYs = scene.getMeshByName(`sidewalk_${id}`)!.getVerticesData("position")!.filter((_, i) => i % 3 === 1);

    expect(ys.length).toBeGreaterThan(0);
    expect(sidewalkYs.length).toBeGreaterThan(0);
    for (const y of ys) expect(y).toBeCloseTo(ROAD_LIFT);
    for (const y of sidewalkYs) expect(y).toBeCloseTo(SIDEWALK_LIFT);
    scene.dispose();
    engine.dispose();
  });
});

it("joins curved sloping roundabout mouths to the road, ring and rounded sidewalk edges", () => {
  const graph = new RoadGraph((x, z) => 30 + x * 0.08 + z * 0.12);
  const hub = graph.addNode(3, 1);
  for (const [x, z, type] of [[-160, 10, "avenue"], [165, -18, "avenue"], [30, 165, "street"], [-20, -165, "street"]] as const) {
    const end = graph.addNode(x, z);
    graph.addSegment(x < 0 ? end : hub, x < 0 ? hub : end, v3(x * 0.4 + 12, 0, z * 0.55), type);
  }
  graph.setRoundabout(hub, true);
  const engine = new NullEngine(), scene = new Scene(engine);
  const roads = createRoadRenderer(scene, graph, graph.heightAt);
  roads.rebuild();
  const points = (name: string) => {
    const p = scene.getMeshByName(name)!.getVerticesData("position")!;
    return Array.from({ length: p.length / 3 }, (_, i) => new Vector3(p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!));
  };
  const ring = points(`roundabout_${hub}`).filter((_, i) => i % 2 === 1);
  const lines = (p: Vector3[]): [Vector3, Vector3][] => p.slice(1).map((b, i) => [p[i]!, b]);
  const distance = (p: Vector3, a: Vector3, b: Vector3) => {
    const ab = b.subtract(a);
    const t = Math.max(0, Math.min(1, Vector3.Dot(p.subtract(a), ab) / ab.lengthSquared()));
    return Vector3.Distance(p, a.add(ab.scale(t)));
  };
  const key = (p: Vector3) => [p.x, p.y, p.z].map((v) => v.toFixed(4)).join(",");
  for (const id of graph.node(hub).segments) {
    const road = points(`road_${id}`);
    const end = graph.segment(id).a === hub ? road.slice(0, 2) : road.slice(-2);
    const boundary: [Vector3, Vector3][] = [[end[0]!, end[1]!], ...lines(ring)];
    for (const side of [-1, 1]) {
      const corner = points(`roundabout_corner_${id}_${hub}_${side}`);
      const inside = corner.filter((_, i) => i % 2 === 0).map((p) => p.subtract(new Vector3(0, SIDEWALK_LIFT - ROAD_LIFT, 0)));
      boundary.push(...lines(inside));
      // Both ends of the rounded paving join an existing sidewalk or the ring footway.
      const walk = points(`sidewalk_${id}`);
      for (const p of corner.slice(0, 2)) expect(walk.some((q) => Vector3.Distance(p, q) < 1e-4)).toBe(true);
      const ringWalk = points(`roundabout_walk_${hub}`);
      for (const p of corner.slice(-2)) expect(ringWalk.some((q) => Vector3.Distance(p, q) < 1e-4)).toBe(true);
    }
    const patch = scene.getMeshByName(`roundabout_gap_${id}_${hub}`)!;
    const p = points(patch.name), indices = patch.getIndices()!;
    for (let i = 0; i < indices.length; i += 3) {
      const a = p[indices[i]!]!, b = p[indices[i + 1]!]!, c = p[indices[i + 2]!]!;
      expect(Vector3.Cross(b.subtract(a), c.subtract(a)).y, JSON.stringify({ id, i, a, b, c })).toBeLessThanOrEqual(1e-6);
    }
    const edges = new Map<string, { a: Vector3; b: Vector3; count: number }>();
    for (let i = 0; i < indices.length; i += 3) for (let j = 0; j < 3; j++) {
      const a = p[indices[i + j]!]!, b = p[indices[i + (j + 1) % 3]!]!;
      const k = [key(a), key(b)].sort().join(";");
      const edge = edges.get(k);
      if (edge) edge.count++;
      else edges.set(k, { a, b, count: 1 });
    }
    const exposed = [...edges.values()].filter((e) => e.count === 1);
    expect(exposed.length).toBeGreaterThan(4);
    for (const { a, b } of exposed) {
      const mid = Vector3.Lerp(a, b, 0.5);
      expect(Math.min(...boundary.map(([lo, hi]) => distance(mid, lo, hi))), `${id}: ${key(mid)}`).toBeLessThan(1e-4);
    }
  }
  roads.dispose(); scene.dispose(); engine.dispose();
});
