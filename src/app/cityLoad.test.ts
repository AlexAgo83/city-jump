import { describe, expect, it, vi } from "vitest";

import { BuildingLifecycle } from "../sim/buildingLifecycle";
import { CityEconomy, Treasury } from "../sim/economy";
import { RoadGraph } from "../sim/graph";
import { Plantings } from "../sim/plantings";
import { createRun, DEFAULT_RUN_RULES } from "../sim/run";
import { Rubble } from "../sim/rubble";
import { SAVE_VERSION, type CitySave } from "../sim/save";
import { Utilities } from "../sim/utilities";
import { Zones } from "../sim/zones";
import { loadCityInto, relaidNotice, resumedCity, terrainFor, type CityLoadHooks, type CityState } from "./cityLoad";

function emptySave(overrides: Partial<CitySave> = {}): CitySave {
  return {
    v: SAVE_VERSION,
    terrain: "rolling",
    hour: 9,
    nodes: [],
    segments: [],
    planted: [],
    cleared: [],
    zones: [],
    rubble: [],
    buildingStates: [],
    money: 0,
    ...overrides,
  };
}

function cityState(): CityState {
  return {
    graph: new RoadGraph(),
    plantings: new Plantings(),
    zones: new Zones(),
    rubble: new Rubble(),
    buildingLifecycle: new BuildingLifecycle(),
    treasury: new Treasury(),
    cityEconomy: new CityEconomy(),
    utilities: new Utilities(),
    buildableCells: () => [],
  };
}

/** Every hook, recording the order it was called in. */
function recordingHooks(): { hooks: CityLoadHooks; steps: string[]; alerts: string[]; refusals: string[] } {
  const steps: string[] = [];
  const alerts: string[] = [];
  const refusals: string[] = [];
  const step = (name: string) => () => void steps.push(name);
  return {
    steps,
    alerts,
    refusals,
    hooks: {
      cancelTool: step("cancelTool"),
      applyTerrain: (preset) => void steps.push(`applyTerrain:${preset}`),
      onRefused: (message) => {
        steps.push("onRefused");
        refusals.push(message);
      },
      clearHistory: step("clearHistory"),
      resetWave: step("resetWave"),
      resume: step("resume"),
      updateRunHud: step("updateRunHud"),
      renderRunPanel: step("renderRunPanel"),
      onAlert: (message) => {
        steps.push("onAlert");
        alerts.push(message);
      },
      setClockHour: (hour) => void steps.push(`setClockHour:${hour}`),
      noteClockSlot: step("noteClockSlot"),
      addOffshoreBridge: step("addOffshoreBridge"),
      rebuildWithoutCharging: step("rebuildWithoutCharging"),
      applyCamera: step("applyCamera"),
      updateUndoRedo: step("updateUndoRedo"),
    },
  };
}

describe("terrain a save resumes onto", () => {
  it("takes rugged literally and treats everything else as the rolling island", () => {
    expect(terrainFor(emptySave({ terrain: "rugged" }))).toBe("rugged");
    expect(terrainFor(emptySave({ terrain: "rolling" }))).toBe("rolling");
    // A save from a build that offered a preset this one does not still has to open.
    expect(terrainFor(emptySave({ terrain: "archipelago" }))).toBe("rolling");
    expect(terrainFor(emptySave({ terrain: "" }))).toBe("rolling");
  });
});

describe("state a save resumes into", () => {
  it("never resumes a wave that was in progress", () => {
    const mid = emptySave({ waveClock: { elapsedSeconds: 140, active: { startedAtSeconds: 120, threat: 900, hitPoints: 450 } } });

    // Nothing about the kaiju is saved, so a restored `active` rebuilt the plan from a fresh seed
    // and dropped a new monster somewhere else with the old hit points.
    expect(resumedCity(mid).waveClock).toEqual({ elapsedSeconds: 140, active: null });
  });

  it("defaults every field a pre-run save never carried", () => {
    const resumed = resumedCity(emptySave());

    expect(resumed.run).toEqual({ wave: 1, science: 0, ended: null, rules: DEFAULT_RUN_RULES });
    expect(resumed.waveClock).toEqual({ elapsedSeconds: 0, active: null });
    // Zero and one, not undefined: a reload that restarted the clock un-built the city, and day
    // zero is not a day.
    expect(resumed.elapsed).toBe(0);
    expect(resumed.day).toBe(1);
  });

  it("keeps what a save did carry", () => {
    const run = createRun({ freeBuilding: true });
    const resumed = resumedCity(emptySave({ run: { ...run, wave: 4, science: 90 }, elapsed: 1250.5, day: 7 }));

    expect(resumed.run.wave).toBe(4);
    expect(resumed.run.science).toBe(90);
    expect(resumed.run.rules.freeBuilding).toBe(true);
    expect(resumed.elapsed).toBe(1250.5);
    expect(resumed.day).toBe(7);
  });
});

describe("what the player is told about a re-laid city", () => {
  it("says nothing when the replay put everything back where it was", () => {
    expect(relaidNotice(0, 0)).toBeNull();
  });

  it("counts both kinds when either moved", () => {
    expect(relaidNotice(3, 0)).toBe("3 zoned lots and 0 buildings were re-laid onto the city as it came back.");
    expect(relaidNotice(0, 2)).toBe("0 zoned lots and 2 buildings were re-laid onto the city as it came back.");
  });
});

describe("loading a city", () => {
  it("runs the load in the order the city depends on", () => {
    const { hooks, steps } = recordingHooks();

    const resumed = loadCityInto(emptySave({ camera: { targetX: 1, targetY: 2, targetZ: 3, alpha: 0.4, beta: 0.5, radius: 60 } }), cityState(), hooks);

    expect(resumed).not.toBeNull();
    // Terrain before the replay, because node elevations were recorded against a pristine
    // heightmap. The clock slot after the hour. Nothing drawn until the lots have been re-laid.
    expect(steps).toEqual([
      "cancelTool",
      "applyTerrain:rolling",
      "clearHistory",
      "resetWave",
      "resume",
      "updateRunHud",
      "renderRunPanel",
      "setClockHour:9",
      "noteClockSlot",
      "addOffshoreBridge",
      "rebuildWithoutCharging",
      "applyCamera",
      "updateUndoRedo",
    ]);
  });

  it("leaves the camera alone when the save never recorded one", () => {
    const { hooks, steps } = recordingHooks();

    loadCityInto(emptySave(), cityState(), hooks);

    expect(steps).not.toContain("applyCamera");
  });

  it("hands back the state the caller has to install", () => {
    const { hooks } = recordingHooks();

    const resumed = loadCityInto(emptySave({ elapsed: 640, day: 3 }), cityState(), hooks);

    expect(resumed).toEqual(resumedCity(emptySave({ elapsed: 640, day: 3 })));
  });

  it("alerts with the counts when the replay could not put the city back exactly", () => {
    const { hooks, alerts } = recordingHooks();
    const state = cityState();
    vi.spyOn(state.zones, "snapTo").mockReturnValue(3);
    vi.spyOn(state.buildingLifecycle, "snapTo").mockReturnValue(2);

    loadCityInto(emptySave(), state, hooks);

    expect(alerts).toEqual(["3 zoned lots and 2 buildings were re-laid onto the city as it came back."]);
  });

  it("says nothing when nothing had to move", () => {
    const { hooks, alerts, steps } = recordingHooks();

    loadCityInto(emptySave(), cityState(), hooks);

    expect(alerts).toEqual([]);
    expect(steps).not.toContain("onAlert");
  });

  it("refuses a city the replay rejects, without running anything past the replay", () => {
    const { hooks, steps, refusals } = recordingHooks();
    // A segment standing on a node the save never wrote. restoreCity throws rather than leaving a
    // half-replayed city, and a refused load must not go on to redraw or reframe anything.
    const broken = emptySave({ nodes: [], segments: [[1, 2, 0, 0, 0, "street"]] });

    const resumed = loadCityInto(broken, cityState(), hooks);

    expect(resumed).toBeNull();
    expect(steps).toEqual(["cancelTool", "applyTerrain:rolling", "onRefused"]);
    expect(refusals[0]).toMatch(/^This city could not be loaded: /);
    expect(refusals[0]).toMatch(/missing node/);
  });
});
