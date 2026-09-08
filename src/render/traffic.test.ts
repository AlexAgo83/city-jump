import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Meshes/instancedMesh";

import { RoadGraph } from "../sim/graph";
import { v3 } from "../sim/vec";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { signalAt, signalCycle } from "../sim/signals";
import { createSignalRenderer } from "./signals";
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
    const traffic = createTrafficRenderer(scene, graph, () => 16);

    traffic.rebuild();
    const before = traffic.firstVehicle()!.segment;
    const after = { ...before, length: before.length + 10 };
    (graph as unknown as { segments: Map<number, typeof after> }).segments.set(id, after);

    traffic.rebuild({ minX: 1000, maxX: 1010, minZ: 1000, maxZ: 1010 });

    expect(traffic.firstVehicle()!.segment).toBe(after);
    scene.dispose();
    engine.dispose();
  });

  it("keeps displayed lamps on the traffic clock through slow frames, speed changes, pause and hidden traffic", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const graph = new RoadGraph();
    const centre = graph.addNode(0, 0);
    const segments = [0, 90, 180, 270].map((degrees) => {
      const angle = degrees * Math.PI / 180;
      return graph.addSegment(centre, graph.addNode(200 * Math.cos(angle), 200 * Math.sin(angle)), v3(100 * Math.cos(angle), 0, 100 * Math.sin(angle)), "street");
    });
    let frameMs = 16;
    const traffic = createTrafficRenderer(scene, graph, () => frameMs);
    const signals = createSignalRenderer(scene, graph, traffic.signalTime);
    try {
      traffic.rebuild();
      signals.rebuild();
      const cycle = signalCycle(graph, centre)!;
      const seen = new Set<string>();
      const check = () => {
        for (const segment of segments) {
          const expected = signalAt(cycle, segment, traffic.signalTime());
          seen.add(expected);
          for (const [i, state] of ["red", "amber", "green"].entries()) {
            const lens = scene.getMeshByName(`signal_lamp_${segment}_${centre}_${i}`)!;
            const color = lens.instancedBuffers[VertexBuffer.ColorKind];
            expect(Math.max(color.r, color.g, color.b) > 0.5).toBe(state === expected);
          }
        }
      };
      check(); // Even a city rebuilt while paused must show its current lamps.
      for (const rate of [1, 4, 0, 2]) {
        traffic.setTimeScale(rate);
        frameMs = 250;
        const before = traffic.signalTime();
        for (let frame = 0; frame < 150; frame++) {
          scene.onBeforeRenderObservable.notifyObservers(scene);
          check();
        }
        expect(traffic.signalTime() - before).toBeCloseTo(rate === 0 ? 0 : 15);
      }
      expect(seen).toEqual(new Set(["red", "amber", "green"]));
      traffic.setEnabled(false);
      const before = traffic.signalTime();
      scene.onBeforeRenderObservable.notifyObservers(scene);
      expect(traffic.signalTime()).toBeGreaterThan(before);
      check();
      traffic.setEnabled(true);
      signals.rebuild();
      check();
    } finally {
      signals.dispose(); traffic.dispose(); scene.dispose(); engine.dispose();
    }
  });

  it("pitches cars uphill and downhill along an elevated road above flat terrain", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const graph = new RoadGraph(() => 0);
    graph.addElevatedSegment(graph.addNodeAt(v3(0, 20, 0)), graph.addNodeAt(v3(400, 60, 0)), v3(200, 40, 0), "street");
    const traffic = createTrafficRenderer(scene, graph, () => 100);
    try {
      traffic.rebuild();
      for (let frame = 0; frame < 20; frame++) scene.onBeforeRenderObservable.notifyObservers(scene);
      const cars = scene.meshes.filter((mesh) => mesh.name.startsWith("traffic_"));
      expect(cars.length).toBeGreaterThan(1);
      const directions = new Set<number>();
      for (const car of cars) {
        const direction = Math.sign(Math.sin(car.rotation.y));
        directions.add(direction);
        expect(car.rotation.x).toBeCloseTo(-Math.atan(0.1) * direction, 4);
        expect(car.position.y).toBeGreaterThan(20);
      }
      expect(directions).toEqual(new Set([-1, 1]));
    } finally {
      traffic.dispose(); scene.dispose(); engine.dispose();
    }
  });

});
