import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { createRoadRenderer } from "./roadMesh";
import { expect, it } from "vitest";
import { Heightmap } from "../sim/heightmap";
import { RoadGraph } from "../sim/graph";
import { buildableCells, buildingParcels } from "../sim/slots";
import { roadType, SIDEWALK_WIDTH } from "../sim/roadTypes";
import { v3 } from "../sim/vec";
import { pickHeightmap } from "./terrainPick";

it("keeps the rendered 8 m terrain below sloping, rotated streets and sidewalks after terrace changes", () => {
	for (const angle of [0, 0.23, 0.79, 1.3]) {
		const h = new Heightmap({
			size: 400,
			cell: 8,
			generator: (x, z) => 30 + 0.09 * x + 0.12 * z + 3 * Math.sin(x / 35),
		});
		const g = new RoadGraph((x, z) => h.heightAt(x, z));
		const c = Math.cos(angle),
			s = Math.sin(angle);
		const id = g.addSegment(
			g.addNode(-140 * c + 3, -140 * s + 1),
			g.addNode(140 * c + 3, 140 * s + 1),
			v3(3, 0, 1),
		);
		h.conformToRoads(g);
		const parcels = buildingParcels(buildableCells(g));
		const edge = roadType(g.segment(id).type).width / 2 + SIDEWALK_WIDTH;
		for (const pads of [
			[],
			parcels,
			parcels.slice(0, Math.floor(parcels.length / 2)),
		]) {
			h.conformToRoads(g, pads);
			let excess = -Infinity;
			for (let d = 15; d < g.segment(id).length - 15; d += 1.7) {
				const { position: p, tangent: t } = g.pointAt(id, d);
				for (let across = -edge; across <= edge; across += 0.7) {
					const x = p.x - t.z * across,
						z = p.z + t.x * across;
					const hit = pickHeightmap(h, {
						origin: v3(x, 200, z),
						direction: v3(0, -1, 0),
					})!;
					excess = Math.max(excess, hit.y - p.y);
				}
			}
			expect(excess, `angle ${angle}, pads ${pads.length}`).toBeLessThan(0);
		}
	}
});

it.each([false, true])("clears curved approaches and junctions at production resolution (roundabout: %s)", (roundabout) => {
	const h = new Heightmap({
		size: 400,
		cell: 8,
		generator: (x, z) => 40 + 0.1 * x + 0.14 * z + 2 * Math.sin(z / 20),
	});
	const g = new RoadGraph((x, z) => h.heightAt(x, z));
	const hub = g.addNode(3, 1);
	for (const [x, z, type] of [
		[-160, 10, "avenue"],
		[165, -18, "avenue"],
		[30, 165, "street"],
		[-20, -165, "street"],
	] as const) {
		g.addSegment(hub, g.addNode(x, z), v3(x * 0.4 + 15, 0, z * 0.6), type);
	}
	g.setRoundabout(hub, roundabout);
	h.conformToRoads(g);
	const parcels = buildingParcels(buildableCells(g));
	h.conformToRoads(g, parcels);
	const scene = new Scene(new NullEngine());
	const roads = createRoadRenderer(scene, g, (x, z) => h.heightAt(x, z));
	roads.rebuild();
	let probes = 0,
		excess = -Infinity;
	for (const mesh of scene.meshes.filter((m) =>
		/^(road|sidewalk(?:_corner)?|junction|roundabout(?:_gap|_walk|_corner)?)_\d+(?:_\d+)*(?:_-1)?$/.test(m.name),
	)) {
		const pos = mesh.getVerticesData("position")!,
			norm = mesh.getVerticesData("normal")!,
			indices = mesh.getIndices()!;
		for (let i = 0; i < indices.length; i += 3) {
			const ids = Array.from(indices.slice(i, i + 3));
			if (ids.some((j) => norm[j * 3 + 1]! < 0.5)) continue;
			const points = ids.map((j) =>
				v3(pos[j * 3]!, pos[j * 3 + 1]!, pos[j * 3 + 2]!),
			);
			points.push(
				v3(
					points.reduce((s, p) => s + p.x, 0) / 3,
					points.reduce((s, p) => s + p.y, 0) / 3,
					points.reduce((s, p) => s + p.z, 0) / 3,
				),
			);
			for (const p of points) {
				const hit = pickHeightmap(h, {
					origin: v3(p.x, 200, p.z),
					direction: v3(0, -1, 0),
				})!;
				excess = Math.max(excess, hit.y - p.y);
				probes++;
			}
		}
	}
	expect(probes).toBeGreaterThan(1000);
	expect(excess).toBeLessThan(0);
	roads.dispose();
	scene.dispose();
});
