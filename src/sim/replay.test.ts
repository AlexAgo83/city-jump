import { describe, expect, it } from "vitest";
import { RoadGraph } from "./graph";
import { Plantings } from "./plantings";
import { Zones } from "./zones";
import { serializeCity, restoreCity } from "./save";
import { buildableCells, buildingParcels, parcelsForDemand } from "./slots";
import { BuildingLifecycle, BUILDING_STAGE_SECONDS } from "./buildingLifecycle";
import { Rubble } from "./rubble";
import { CityEconomy, Treasury } from "./economy";
import { Utilities } from "./utilities";
import { createRun } from "./run";
import { createWaveClock } from "./wave";
import { commitSegment, resolveSnap } from "./rules";
import { v3 } from "./vec";

describe("replay drift", () => {
  // A split used to keep the samples it was sliced from, while a replay re-sampled the same curve
  // from its control points. The lots are laid out by walking those samples, so a saved city came
  // back cut about a metre from where it was: 249 of 1806 lots in the same place. The zoning fell
  // off the ones that moved, and every building on them started its construction over.
  it("cuts the same lots after a round trip", () => {
    const graph = new RoadGraph();
    const road = (x0: number, z0: number, cx: number, cz: number, x1: number, z1: number, type = "street") => {
      const from = resolveSnap(graph, x0, z0);
      const to = resolveSnap(graph, x1, z1);
      return commitSegment(graph, from, to, v3(cx, 0, cz), type);
    };
    // A little network with junctions and a split, which is what a player draws.
    road(-400, 0, 0, 40, 400, 0, "avenue");
    road(0, -300, 20, -150, 0, 300);
    road(-200, -300, -180, -150, -200, 300);
    road(200, 20, 260, 160, 320, 300);

    const before = buildableCells(graph).map((c) => c.corners.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`).join("|"));
    const replayed = new RoadGraph();
    restoreCity(replayed, new Plantings(), new Zones(), serializeCity(graph, new Plantings(), new Zones(), "rolling", 12));
    const after = buildableCells(replayed).map((c) => c.corners.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`).join("|"));

    const setAfter = new Set(after);
    const common = before.filter((c) => setAfter.has(c)).length;
    expect(common).toBe(before.length);
    expect(after.length).toBe(before.length);
    expect(after).toEqual(before);
  });
});

describe("replay of what stands on the lots", () => {
  it("brings every building back in the state it was saved in", () => {
    const graph = new RoadGraph();
    const road = (x0: number, z0: number, cx: number, cz: number, x1: number, z1: number, type = "street") => {
      const from = resolveSnap(graph, x0, z0);
      const to = resolveSnap(graph, x1, z1);
      return commitSegment(graph, from, to, v3(cx, 0, cz), type);
    };
    road(-400, 0, 0, 40, 400, 0, "avenue");
    road(0, -300, 20, -150, 0, 300);

    const zones = new Zones();
    zones.paintLots(buildableCells(graph), "residential");
    const lifecycle = new BuildingLifecycle();
    const parcels = parcelsForDemand(buildingParcels(buildableCells(graph, zones), zones), 400, 3000);
    // Some standing, some still going up: the mix a save is taken in the middle of.
    lifecycle.sync(parcels, 400, 100);
    const before = lifecycle.sync(parcels, 400, 100 + BUILDING_STAGE_SECONDS + 1).map((status) => status.state);

    const replayed = new RoadGraph();
    const replayedZones = new Zones();
    const replayedLifecycle = new BuildingLifecycle();
    restoreCity(
      replayed,
      new Plantings(),
      replayedZones,
      serializeCity(graph, new Plantings(), zones, "rolling", 12, undefined, new Rubble(), lifecycle, new Treasury(), new CityEconomy(), new Utilities(), createRun(), createWaveClock(), 3000),
      new Rubble(),
      replayedLifecycle,
    );
    const replayedParcels = parcelsForDemand(buildingParcels(buildableCells(replayed, replayedZones), replayedZones), 400, 3000);
    const after = replayedLifecycle.sync(replayedParcels, 400, 100 + BUILDING_STAGE_SECONDS + 1).map((status) => status.state);

    expect(replayedParcels.length).toBe(parcels.length);
    expect(after).toEqual(before);
  });
});
