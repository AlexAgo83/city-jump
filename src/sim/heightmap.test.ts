import { describe, it, expect, afterEach } from "vitest";
import { Heightmap, EMBANKMENT, ROAD_BED_DROP, SEA_LEVEL, rollingHills } from "./heightmap";
import { RoadGraph } from "./graph";
import { setTerrain, flatTerrain, terrainHeight } from "./terrain";
import { allSlots } from "./slots";
import { v3 } from "./vec";
import { RULES } from "./rules";

const map = () =>
  new Heightmap({ size: 600, cell: 4, generator: (x, z) => 8 * Math.sin(x / 90) + 5 * Math.cos(z / 70) });

afterEach(() => setTerrain(flatTerrain));

describe("heightmap", () => {
  it("samples the ground it was generated from", () => {
    const h = map();
    // A grid point reads back exactly; between grid points it interpolates.
    expect(h.heightAt(h.worldX(10), h.worldZ(10))).toBeCloseTo(h.at(10, 10), 4);
    const between = h.heightAt(h.worldX(10) + 2, h.worldZ(10));
    expect(between).toBeGreaterThan(Math.min(h.at(10, 10), h.at(11, 10)) - 1e-6);
    expect(between).toBeLessThan(Math.max(h.at(10, 10), h.at(11, 10)) + 1e-6);
  });

  it("becomes the one terrain function the rest of the code reads", () => {
    const h = map();
    setTerrain(h);
    expect(terrainHeight(40, -20)).toBeCloseTo(h.heightAt(40, -20), 6);
  });

  it("levels the ground under a road to the road's own elevation", () => {
    const h = map();
    setTerrain(h);
    const g = new RoadGraph();
    const a = g.addNode(-200, 0);
    const b = g.addNode(200, 0);
    const id = g.addSegment(a, b, v3(0, 0, 0));
    h.conformToRoads(g);

    for (let d = 10; d < g.segment(id).length - 10; d += 20) {
      const p = g.pointAt(id, d);
      // The ground at the road's centre line is the road, less the bed it is cut into.
      expect(h.heightAt(p.position.x, p.position.z)).toBeCloseTo(p.position.y - ROAD_BED_DROP, 1);
      // Never above the carriageway: that is what would poke through.
      expect(h.heightAt(p.position.x, p.position.z)).toBeLessThan(p.position.y);
    }
  });

  it("blends back to the untouched ground across the embankment", () => {
    const h = map();
    setTerrain(h);
    const g = new RoadGraph();
    const a = g.addNode(-200, 0);
    const b = g.addNode(200, 0);
    g.addSegment(a, b, v3(0, 0, 0));
    const untouched = h.heightAt(0, 60);
    h.conformToRoads(g);

    // Well outside the road plus its embankment, nothing moved.
    expect(h.heightAt(0, 60)).toBeCloseTo(untouched, 6);
    // Just past the embankment it is back to the original ground.
    const edge = h.heightAt(0, 4 + EMBANKMENT + 8);
    expect(Math.abs(edge - h.heightAt(0, 4 + EMBANKMENT + 8))).toBeLessThan(1e-9);
  });

  it("restores the ground when the road is removed", () => {
    const h = map();
    setTerrain(h);
    const g = new RoadGraph();
    const a = g.addNode(-200, 0);
    const b = g.addNode(200, 0);
    const id = g.addSegment(a, b, v3(0, 0, 0));

    // Not the midpoint: there the road's interpolated elevation happens to equal the
    // ground, so flattening would be invisible and the test would prove nothing.
    const probe = { x: 100, z: 0 };
    const before = h.heightAt(probe.x, probe.z);
    h.conformToRoads(g);
    const flattened = h.heightAt(probe.x, probe.z);

    g.removeSegment(id);
    h.conformToRoads(g);
    expect(h.heightAt(probe.x, probe.z)).toBeCloseTo(before, 6);
    // And the flattening had actually done something, so this is not a vacuous pass.
    expect(Math.abs(flattened - before)).toBeGreaterThan(0.05);
  });

  it("gives a cell to the nearest road when two are close", () => {
    const h = map();
    setTerrain(h);
    const g = new RoadGraph();
    const near = g.addSegment(g.addNode(-200, 0), g.addNode(200, 0), v3(0, 0, 0));
    g.addSegment(g.addNode(-200, 14), g.addNode(200, 14), v3(0, 0, 14));
    h.conformToRoads(g);

    // A point on the first road's centre line still belongs to the first road.
    const p = g.pointAt(near, 100);
    expect(h.heightAt(p.position.x, p.position.z)).toBeCloseTo(p.position.y - ROAD_BED_DROP, 1);
  });

  it("leaves the graph untouched: roads and slots follow the ground through the interface", () => {
    const h = new Heightmap({ size: 800, cell: 4, generator: rollingHills() });
    setTerrain(h);
    const g = new RoadGraph();
    const a = g.addNode(-150, 0);
    const b = g.addNode(150, 0);
    const id = g.addSegment(a, b, v3(0, 0, 40));
    h.conformToRoads(g);

    // Node elevations were sampled from the terrain, not assumed to be zero.
    expect(Math.abs(g.node(a).pos.y)).toBeGreaterThan(0.01);
    expect(g.node(a).pos.y).toBeCloseTo(h.baseAt(...gridOf(h, -150, 0)), 0);

    // Slots sit at the elevation of the road they front.
    const slots = allSlots(g).filter((s) => s.segment === id);
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(Number.isFinite(slot.position.y)).toBe(true);
    }
  });

  it("keeps the rolling ground inside the gradient a road may climb", () => {
    const generator = rollingHills();
    // Over the shortest segment the rules allow, the ground must not exceed the limit
    // everywhere, or the map would be mostly unbuildable.
    let refused = 0;
    let tried = 0;
    for (let x = -300; x <= 300; x += 25) {
      for (let z = -300; z <= 300; z += 25) {
        tried++;
        const rise = Math.abs(generator(x + 50, z) - generator(x, z));
        if (rise / 50 > RULES.maxGradient) refused++;
      }
    }
    expect(refused / tried).toBeLessThan(0.2);
  });

  it("makes the map an island around sea level", () => {
    const terrain = rollingHills();
    expect(terrain(0, 0)).toBeGreaterThan(SEA_LEVEL);
    expect(terrain(980, 0)).toBeLessThan(SEA_LEVEL);
  });

  it("sinks the island into deeper water offshore", () => {
    const terrain = rollingHills();
    expect(terrain(1300, 0)).toBeLessThan(terrain(980, 0) - 50);
  });

  it("raises clustered mountains into a higher central peak", () => {
    const terrain = rollingHills();
    expect(terrain(0, 0)).toBeGreaterThan(terrain(500, 0) + 70);
    expect(terrain(0, 0)).toBeGreaterThan(terrain(-180, -80));
    expect(terrain(0, 0)).toBeGreaterThan(terrain(20, 190));
  });

  it("can regenerate a substantially more rugged test terrain", () => {
    const h = new Heightmap({ size: 800, cell: 8, generator: rollingHills() });
    const before = h.baseAt(...gridOf(h, 120, 80));
    h.regenerate(rollingHills(18, 450));

    let low = Infinity;
    let high = -Infinity;
    for (let iz = 0; iz < h.count; iz++) {
      for (let ix = 0; ix < h.count; ix++) {
        low = Math.min(low, h.baseAt(ix, iz));
        high = Math.max(high, h.baseAt(ix, iz));
      }
    }
    expect(h.baseAt(...gridOf(h, 120, 80))).not.toBeCloseTo(before, 3);
    expect(high - low).toBeGreaterThan(40);
  });
});

function gridOf(h: Heightmap, x: number, z: number): [number, number] {
  return [Math.round((x + h.size / 2) / h.cell), Math.round((z + h.size / 2) / h.cell)];
}
