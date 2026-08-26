import type { Scene } from "@babylonjs/core/scene";
import type { RoadGraph } from "../sim/graph";
import { resolveSnap, commitSegment } from "../sim/rules";
import { v3 } from "../sim/vec";

export interface DebugApi {
  reset(): void;
  road(x0: number, z0: number, cx: number, cz: number, x1: number, z1: number, type?: string): boolean;
  demoNetwork(): void;
  demoCity(): void;
  stats(): Record<string, number>;
  camera(radius: number, beta?: number, alpha?: number): void;
  measureFps(ms: number): Promise<number>;
}

/**
 * Drives the app from outside the browser UI, so the visual acceptance criteria and the
 * frame-rate figure can be checked by a script instead of asserted in prose.
 */
export function installDebugApi(
  scene: Scene,
  graph: RoadGraph,
  rebuild: () => void,
  stats: () => Record<string, number>,
): void {
  const api: DebugApi = {
    reset() {
      for (const seg of graph.allSegments()) graph.removeSegment(seg.id);
      rebuild();
    },
    road(x0, z0, cx, cz, x1, z1, type = "street") {
      const from = resolveSnap(graph, x0, z0);
      const to = resolveSnap(graph, x1, z1);
      const result = commitSegment(graph, from, to, v3(cx, 0, cz), type);
      return result.ok;
    },
    demoNetwork() {
      // A bend, a crossroads and a T -- the three things a junction has to survive.
      api.road(-160, 0, -80, -60, 0, 0, "avenue");
      api.road(0, 0, 80, 60, 160, 0, "avenue");
      api.road(0, -120, 0, -60, 0, 120);
      api.road(0, 0, 60, 40, 120, 90);
      api.road(-120, 60, -60, 70, 0, 60);
      rebuild();
    },
    demoCity() {
      // Curved avenues with cross streets: enough frontage for a few thousand slots.
      for (let i = 0; i < 8; i++) {
        const z = -350 + i * 100;
        api.road(-400, z, 0, z + 40, 400, z, "avenue");
      }
      for (let i = 0; i < 9; i++) {
        const x = -400 + i * 100;
        api.road(x, -400, x + 30, 0, x, 400);
      }
      rebuild();
    },
    stats,
    camera(radius, beta = Math.PI / 3.6, alpha = -Math.PI / 2) {
      const cam = scene.activeCamera as unknown as { radius: number; beta: number; alpha: number };
      cam.radius = radius;
      cam.beta = beta;
      cam.alpha = alpha;
    },
    measureFps(ms) {
      return new Promise<number>((resolve) => {
        let frames = 0;
        const started = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - started < ms) requestAnimationFrame(tick);
          else resolve(Math.round((frames * 1000) / (performance.now() - started)));
        };
        requestAnimationFrame(tick);
      });
    },
  };

  (window as unknown as { cityjump: DebugApi }).cityjump = api;
}
