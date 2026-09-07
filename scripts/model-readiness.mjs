/** All performance harnesses wait for the served catalog, including production previews. */
export async function waitForModels(page, buildings = null, timeout = 30000) {
	const response = await page.request.get(
		new URL("/buildings/manifest.json", page.url()).href,
	);
	if (!response.ok())
		throw new Error(`Building manifest failed: HTTP ${response.status()}`);
	const ids = Object.keys((await response.json()).models ?? {});
	if (!ids.length) throw new Error("Building manifest contains no models");
	try {
		await page.waitForFunction(
			({ ids, buildings }) => {
				const api = window.cityjump;
				if (!api) return false;
				const stats = api.stats();
				return (
					stats.models === ids.length &&
					(buildings === null
						? stats.buildings > 0
						: stats.buildings === buildings)
				);
			},
			{ ids, buildings },
			{ timeout },
		);
		// Model arrivals debounce geometry rebuilding by 50 ms. Verify the settled city too.
		await page.waitForTimeout(150);
		const stats = await page.evaluate(() => window.cityjump.stats());
		if (
			stats.models !== ids.length ||
			(buildings === null
				? stats.buildings <= 0
				: stats.buildings !== buildings)
		)
			throw new Error("City changed during readiness");
		return stats;
	} catch (cause) {
		const loaded = await page.evaluate(
			() => window.cityjump?._scene.meshes.map((m) => m.name) ?? [],
		);
		const missing = ids.filter((id) => !loaded.includes(`building_${id}`));
		throw new Error(
			`City not ready: expected ${ids.length} models and ${buildings ?? "positive"} buildings; missing models: ${missing.join(", ") || "(none; check city/fixture)"}`,
			{ cause },
		);
	}
}

export const actualRenderer = (page) =>
	page.evaluate(() => {
		const gl = window.cityjump._scene.getEngine()._gl;
		const ext = gl.getExtension("WEBGL_debug_renderer_info");
		return gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
	});
