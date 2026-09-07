import type { Heightmap } from "../sim/heightmap";
import type { Vec3 } from "../sim/vec";

/** Clip the actual ground triangles to a convex cell. Interpolated Y stays on their planes. */
export function* terrainOverlayPolygons(
	ground: Heightmap,
	corners: readonly Vec3[],
): Generator<Vec3[]> {
	const gx = (x: number) => Math.floor((x - ground.worldX(0)) / ground.cell);
	const gz = (z: number) => Math.floor((z - ground.worldZ(0)) / ground.cell);
	const minX = Math.max(0, gx(Math.min(...corners.map((p) => p.x))));
	const maxX = Math.min(
		ground.count - 2,
		gx(Math.max(...corners.map((p) => p.x))),
	);
	const minZ = Math.max(0, gz(Math.min(...corners.map((p) => p.z))));
	const maxZ = Math.min(
		ground.count - 2,
		gz(Math.max(...corners.map((p) => p.z))),
	);
	const winding = Math.sign(
		corners.reduce((sum, p, i) => {
			const q = corners[(i + 1) % corners.length]!;
			return sum + p.x * q.z - q.x * p.z;
		}, 0),
	);
	const point = (x: number, z: number): Vec3 => ({
		x: ground.worldX(x),
		y: ground.at(x, z),
		z: ground.worldZ(z),
	});
	for (let z = minZ; z <= maxZ; z++)
		for (let x = minX; x <= maxX; x++) {
			const a = point(x, z),
				b = point(x + 1, z),
				c = point(x, z + 1),
				d = point(x + 1, z + 1);
			// Same diagonal and winding as createGround and pickHeightmap.
			for (let polygon of [
				[a, b, c],
				[b, d, c],
			]) {
				for (let i = 0; i < corners.length && polygon.length; i++) {
					const p = corners[i]!,
						q = corners[(i + 1) % corners.length]!;
					const side = (v: Vec3) =>
						winding * ((q.x - p.x) * (v.z - p.z) - (q.z - p.z) * (v.x - p.x));
					const clipped: Vec3[] = [];
					let prev = polygon[polygon.length - 1]!,
						prevSide = side(prev);
					for (const next of polygon) {
						const nextSide = side(next);
						if (prevSide >= 0 !== nextSide >= 0) {
							const t = prevSide / (prevSide - nextSide);
							clipped.push({
								x: prev.x + (next.x - prev.x) * t,
								y: prev.y + (next.y - prev.y) * t,
								z: prev.z + (next.z - prev.z) * t,
							});
						}
						if (nextSide >= 0) clipped.push(next);
						prev = next;
						prevSide = nextSide;
					}
					polygon = clipped;
				}
				if (
					polygon.length >= 3 &&
					Math.abs(
						polygon.reduce((sum, p, i) => {
							const q = polygon[(i + 1) % polygon.length]!;
							return sum + p.x * q.z - q.x * p.z;
						}, 0),
					) > 1e-8
				)
					yield polygon;
			}
		}
}

export function appendTerrainOverlay(
	ground: Heightmap,
	corners: readonly Vec3[],
	positions: number[],
	indices: number[],
	lift: number,
): void {
	for (const polygon of terrainOverlayPolygons(ground, corners)) {
		const base = positions.length / 3;
		for (const p of polygon) positions.push(p.x, p.y + lift, p.z);
		for (let i = 1; i < polygon.length - 1; i++)
			indices.push(base, base + i, base + i + 1);
	}
}

/** Keep only the cell boundary, omitting the terrain's internal triangulation edges. */
export function terrainOverlayOutline(
	ground: Heightmap,
	corners: readonly Vec3[],
): Vec3[][] {
	const lines: Vec3[][] = [];
	for (const polygon of terrainOverlayPolygons(ground, corners)) {
		for (let i = 0; i < polygon.length; i++) {
			const a = polygon[i]!,
				b = polygon[(i + 1) % polygon.length]!;
			if (Math.hypot(a.x - b.x, a.z - b.z) < 1e-7) continue;
			if (
				corners.some((p, j) => {
					const q = corners[(j + 1) % corners.length]!;
					const side = (v: Vec3) =>
						(q.x - p.x) * (v.z - p.z) - (q.z - p.z) * (v.x - p.x);
					return Math.abs(side(a)) < 1e-7 && Math.abs(side(b)) < 1e-7;
				})
			)
				lines.push([a, b]);
		}
	}
	return lines;
}
