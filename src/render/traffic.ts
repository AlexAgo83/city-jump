import type { Scene } from "@babylonjs/core/scene";

import type { RoadGraph } from "../sim/graph";
import type { TerrainBounds } from "../sim/heightmap";
import { streetlightsOnAt } from "../sim/time";
import { createTrafficMoverSystem } from "./trafficMovers";
import { createVehicleHeadlights } from "./vehicleLights";
import { createVehicleModels } from "./vehicleModels";

/** `frameDelta` is milliseconds since the last drawn frame -- see `createScene`, and not the
 * engine's own delta, which counts animation frames the render loop may have skipped. */
export function createTrafficRenderer(scene: Scene, graph: RoadGraph, frameDelta: () => number, heightAt: (x: number, z: number) => number) {
  const models = createVehicleModels(scene);
  const headlights = createVehicleHeadlights(scene, models.lampMaterials);
  let sunHour = 14;
  let lightsEnabled = true;
  const state = {
    enabled: true,
    paused: false,
    density: 1,
    timeScale: 1,
    lightsOn: () => state.enabled && lightsEnabled && streetlightsOnAt(sunHour),
  };
  const movers = createTrafficMoverSystem(scene, graph, frameDelta, heightAt, models, headlights, state);

  /** Night turns the lamps up and the beams on; by day they are just coloured glass. */
  function setSunHour(hour: number): void {
    sunHour = hour;
    headlights.setLamps(state.lightsOn());
  }
  setSunHour(sunHour);

  function setLightsEnabled(enabled: boolean): void {
    lightsEnabled = enabled;
    setSunHour(sunHour);
  }

  function rebuild(dirty?: TerrainBounds): void {
    if (!state.enabled) {
      movers.clearMovers();
      return;
    }
    movers.rebuild(dirty);
  }

  return {
    rebuild,
    setSunHour,
    setLightsEnabled,
    setPaused(next: boolean) {
      state.paused = next;
    },
    setTimeScale(next: number) {
      state.timeScale = Math.max(0, next);
      state.paused = state.timeScale === 0;
    },
    setEnabled(enabled: boolean) {
      if (state.enabled === enabled) return;
      state.enabled = enabled;
      rebuild();
    },
    setDensity(next: number) {
      const clamped = Math.max(0.25, Math.min(2, next));
      if (state.density === clamped) return;
      state.density = clamped;
      rebuild();
    },
    vehicleAt: movers.vehicleAt,
    vehicleByMesh: movers.vehicleByMesh,
    firstVehicle: movers.firstVehicle,
    vehiclePoint: movers.vehiclePoint,
    count: movers.count,
    pedestrians: movers.pedestrians,
  };
}
