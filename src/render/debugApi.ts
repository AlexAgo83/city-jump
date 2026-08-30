import type { Scene } from "@babylonjs/core/scene";
import type { RoadGraph } from "../sim/graph";
import { resolveSnap, commitSegment } from "../sim/rules";
import type { TerrainBounds } from "../sim/heightmap";
import { v3 } from "../sim/vec";

export interface DebugApi {
  /** Escape hatch for the verification scripts; not used by the game. */
  readonly _scene?: unknown;
  reset(): void;
  rebuild(): void;
  road(x0: number, z0: number, cx: number, cz: number, x1: number, z1: number, type?: string): boolean;
  demoNetwork(): void;
  demoCity(): void;
  stats(): Record<string, number>;
  camera(radius: number, beta?: number, alpha?: number): void;
  cameraState(): { targetX: number; targetY: number; targetZ: number; alpha: number; beta: number; radius: number };
  measureCosts(): {
    startupMs: number;
    demoBuildMs: number;
    placementMs: number;
    segments: number;
    fullHiddenMs: Record<string, number>;
    fullVisibleMs: Record<string, number>;
    placementRenderersMs: Record<string, number>;
  };
  measureFps(ms: number): Promise<number>;
}

/**
 * Drives the app from outside the browser UI, so the visual acceptance criteria and the
 * frame-rate figure can be checked by a script instead of asserted in prose.
 */
export function installDebugApi(
  scene: Scene,
  graph: RoadGraph,
  rebuild: (dirty?: TerrainBounds, timings?: Record<string, number>) => void,
  startedAt: number,
  stats: () => Record<string, number>,
  options: { setWorldGridVisible?: (visible: boolean) => void; measureFps?: (ms: number) => Promise<number> } = {},
): void {
  const addRoad = (x0: number, z0: number, cx: number, cz: number, x1: number, z1: number, type = "street") => {
    const from = resolveSnap(graph, x0, z0);
    const to = resolveSnap(graph, x1, z1);
    return commitSegment(graph, from, to, v3(cx, 0, cz), type);
  };
  const api: DebugApi = {
    reset() {
      for (const seg of graph.allSegments()) graph.removeSegment(seg.id);
      rebuild();
    },
    rebuild,
    road(x0, z0, cx, cz, x1, z1, type = "street") {
      return addRoad(x0, z0, cx, cz, x1, z1, type).ok;
    },
    demoNetwork() {
      const mustRoad = (label: string, x0: number, z0: number, cx: number, cz: number, x1: number, z1: number, type = "street") => {
        const result = addRoad(x0, z0, cx, cz, x1, z1, type);
        if (!result.ok) throw new Error(`demoNetwork road refused: ${label} (${type}): ${result.reason}`);
      };
      // Neighborhood capture: big avenues define districts, collectors feed local streets.
      mustRoad("north avenue", -900, -520, 0, -620, 900, -520, "avenue");
      mustRoad("south avenue", -900, 520, 0, 620, 900, 520, "avenue");
      mustRoad("west avenue", -900, -520, -1040, 0, -900, 520, "avenue");
      mustRoad("east avenue", 900, -520, 1040, 0, 900, 520, "avenue");
      mustRoad("central avenue", -200, -660, -200, -60, -200, 660, "avenue");
      mustRoad("market avenue", -850, -420, -330, -470, 230, -380, "avenue");
      mustRoad("park avenue", -760, 180, -260, -60, 760, 150, "avenue");
      mustRoad("west street 1", -900, -480, -550, -540, -230, -420);
      mustRoad("west street 2", -880, -470, -550, -500, -240, -430);
      mustRoad("west street 3", -720, 80, -470, 10, -210, 80);
      mustRoad("west street 4", -690, 420, -430, 330, -160, 390);
      mustRoad("east street 1", -40, -650, 190, -540, 600, -580);
      mustRoad("east street 2", 120, -230, 380, -160, 770, -190);
      mustRoad("east street 3", -30, -170, 220, -130, 650, -180);
      mustRoad("east street 4", 400, -150, 450, -30, 440, 110);
      mustRoad("west connector 1", -610, -470, -570, -350, -540, -210);
      mustRoad("west connector 2", -460, -450, -430, -330, -390, -190);
      mustRoad("west connector 3", -600, 250, -560, 360, -530, 500);
      mustRoad("west connector 4", -430, 210, -400, 330, -360, 480);
      mustRoad("east connector 1", 290, -450, 300, -330, 320, -210);
      mustRoad("east connector 2", 480, -440, 500, -320, 520, -200);
      mustRoad("east connector 3", 300, 90, 340, 210, 330, 350);
      mustRoad("east connector 4", 400, -210, 450, -90, 440, 50);
      mustRoad("tunnel bypass", -780, -360, -340, -470, 130, -360, "tunnel");
      rebuild();
    },
    demoCity() {
      // Curved avenues with cross streets that end on them, so the streets snap and the
      // avenues split: the frame-rate figure is measured over real junctions, not over
      // roads that merely overlap.
      const ROWS = 10;
      const COLS = 13;
      const SPAN = 600;
      const rowZ = (i: number) => -450 + i * 100;
      // The avenue bows by 80 m at mid-span; this is where it actually is at a given x.
      const avenueZ = (x: number, z0: number) => {
        const t = (x / SPAN + 1) / 2;
        return z0 + 80 * t * (1 - t);
      };
      const mustRoad = (label: string, x0: number, z0: number, cx: number, cz: number, x1: number, z1: number, type = "street") => {
        const result = addRoad(x0, z0, cx, cz, x1, z1, type);
        if (!result.ok) throw new Error(`demoCity road refused: ${label} (${type}): ${result.reason}`);
      };

      for (let i = 0; i < ROWS; i++) {
        const z = rowZ(i);
        mustRoad(`avenue ${i}`, -SPAN, z, 0, z + 40, SPAN, z, "avenue");
      }
      for (let c = 0; c < COLS; c++) {
        const x = -SPAN + c * 100;
        for (let i = 0; i < ROWS - 1; i++) {
          const z0 = avenueZ(x, rowZ(i));
          const z1 = avenueZ(x, rowZ(i + 1));
          mustRoad(`street ${c}.${i}`, x, z0, x, (z0 + z1) / 2, x, z1);
        }
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
    cameraState() {
      const cam = scene.activeCamera as unknown as {
        target: { x: number; y: number; z: number };
        alpha: number;
        beta: number;
        radius: number;
      };
      return {
        targetX: cam.target.x,
        targetY: cam.target.y,
        targetZ: cam.target.z,
        alpha: cam.alpha,
        beta: cam.beta,
        radius: cam.radius,
      };
    },
    measureCosts() {
      api.reset();
      const buildStarted = performance.now();
      api.demoCity();
      const demoBuildMs = performance.now() - buildStarted;
      const fullHiddenMs: Record<string, number> = {};
      rebuild(undefined, fullHiddenMs);
      options.setWorldGridVisible?.(true);
      const fullVisibleMs: Record<string, number> = {};
      rebuild(undefined, fullVisibleMs);
      options.setWorldGridVisible?.(false);
      const placementStarted = performance.now();
      if (!api.road(700, 650, 780, 650, 860, 650, "street")) throw new Error("measurement road was refused");
      const placementRenderersMs: Record<string, number> = {};
      rebuild({ minX: 560, maxX: 1000, minZ: 510, maxZ: 790 }, placementRenderersMs);
      return {
        startupMs: performance.now() - startedAt,
        demoBuildMs,
        placementMs: performance.now() - placementStarted,
        segments: graph.allSegments().length,
        fullHiddenMs,
        fullVisibleMs,
        placementRenderersMs,
      };
    },
    measureFps(ms) {
      if (options.measureFps) return options.measureFps(ms);
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

  (window as unknown as { cityjump: DebugApi & { _scene: Scene; _graph: RoadGraph } }).cityjump = Object.assign(api, {
    _scene: scene,
    _graph: graph,
  });
}
