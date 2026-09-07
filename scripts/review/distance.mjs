import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fixturePath, launchOptions, options, output, url } from "./config.mjs";
import { waitForModels } from "../model-readiness.mjs";

const cases = {
	"day-saved": {},
	"day-street": { radius: 140 },
	"day-district": { radius: 600 },
	"day-overview": { radius: 1600 },
	"night-saved": { night: true },
	"night-street": { night: true, radius: 140 },
	"night-overview": { night: true, radius: 1600 },
	moving: { moving: true, radius: 600 },
	follow: { follow: true },
	x4: { rate: 4 },
	paused: { rate: 0 },
};
const selected = options.cases.split(",");
if (selected.some((name) => !cases[name]))
	throw new Error("Unknown distance case");
const variants = [
	"none",
	"traffic",
	"boxes",
	"trees",
	"buildings",
	"streetgeo",
	"perfectcull",
	"ground",
	"lights",
	"streetlights",
	"headlights",
	"emitters",
	"bulbs",
	"scale",
	"msaa",
	"msaa2",
];
if (!variants.includes(options.variant))
	throw new Error("Unknown distance variant");
const rounds = Number(options.rounds),
	ms = Number(options.ms),
	dpr = Number(options.dpr);
if (
	!Number.isInteger(rounds) ||
	rounds < 1 ||
	!Number.isFinite(ms) ||
	ms < 1000 ||
	![1, 2].includes(dpr)
)
	throw new Error("Invalid rounds, ms or DPR");
const raw = readFileSync(fixturePath);
const save = JSON.parse(raw);
save.run.rules.kaijuSpawns = false;
const report = {
	fixtureSha256: createHash("sha256").update(raw).digest("hex"),
	variant: options.variant,
	compareUrl: options["compare-url"],
	samples: [],
};
const browser = await chromium.launch(launchOptions);
try {
	const page = await browser.newPage({
		viewport: options.wide
			? { width: 1920, height: 1080 }
			: { width: 1280, height: 800 },
		deviceScaleFactor: dpr,
	});
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.addInitScript((save) => {
		localStorage.clear();
		localStorage.setItem("cityjump.autosave", JSON.stringify(save));
	}, save);
	for (let round = 0; round < rounds; round++)
		for (const name of selected) {
			const paired = options.variant !== "none" || options["compare-url"];
			for (const candidate of paired
				? round % 2
					? [true, false]
					: [false, true]
				: [false]) {
				await page.goto(
					!candidate && options["compare-url"] ? options["compare-url"] : url,
				);
				await waitForModels(page, save.buildingStates.length);
				await page.locator("#toolbar-toggle").click();
				await page.selectOption("#frame-cap", "0");
				await page.locator("#sun-hour").evaluate(
					(el, hour) => {
						el.value = String(hour);
						el.dispatchEvent(new Event("input", { bubbles: true }));
					},
					cases[name].night ? 22 : 10,
				);
				if (candidate && options.variant === "boxes")
					await page.locator("#show-boxes").check();
				if (candidate && options.variant === "lights")
					await page.locator("#show-lights").uncheck();
				await page.locator("#toolbar-toggle").click();
				await page.evaluate(
					({ mode, variant }) => {
						const api = window.cityjump,
							scene = api._scene,
							engine = scene.getEngine();
						if (mode.radius) api.camera(mode.radius, Math.PI / 3);
						if (mode.follow) {
							if (!api.selectVehicle()) throw new Error("No follow vehicle");
							const select = document.querySelector(
								'input[name="camera-mode"][value="follow"]',
							);
							if (!select) throw new Error("Missing camera mode control");
							select.checked = true;
							select.dispatchEvent(new Event("change", { bubbles: true }));
						}
						if (variant === "scale") engine.setHardwareScalingLevel(1);
						if (variant === "msaa")
							scene.postProcessRenderPipelineManager._renderPipelines.look.samples = 1;
						if (variant === "msaa2")
							scene.postProcessRenderPipelineManager._renderPipelines.look.samples = 2;
						const pattern =
							variant === "traffic"
								? /^(traffic_|pedestrian_|carpart_|carlamp_)/
								: variant === "trees"
									? /^tree_/
									: variant === "ground"
										? /^ground$/
										: variant === "buildings"
											? /^(building_|roofprop_|footdecor_)/
											: variant === "streetgeo"
												? /^streetlight_(poles|arms|heads|bulbs)/
												: null;
						// isVisible affects drawing only; simulation and transform updates still
						// execute. Re-applied each frame for the same reason the lighting ablations
						// are: anything the renderers touch again would otherwise undo it silently.
						// The exact ceiling of any spatial rejection scheme: keep only the building
						// instances inside the frustum. Valid for a still camera only, which is why
						// it is applied once, after the camera is placed, and not for `moving`.
						if (variant === "perfectcull") {
							const planes = scene.frustumPlanes;
							const visible = (m, i) => {
								const x = m[i * 16 + 12], y = m[i * 16 + 13], z = m[i * 16 + 14];
								return planes.every((plane) => plane.dotCoordinate({ x, y, z }) >= -40);
							};
							let before = 0;
							let after = 0;
							for (const mesh of scene.meshes) {
								if (!/^building_/.test(mesh.name) || !mesh.thinInstanceCount) continue;
								const matrix = mesh._thinInstanceDataStorage?.matrixData;
								if (!matrix) continue;
								before += mesh.thinInstanceCount;
								const kept = [];
								for (let i = 0; i < mesh.thinInstanceCount; i++)
									if (visible(matrix, i)) kept.push(matrix.slice(i * 16, i * 16 + 16));
								const buffer = new Float32Array(kept.length * 16);
								for (const [i, m] of kept.entries()) buffer.set(m, i * 16);
								mesh.thinInstanceSetBuffer("matrix", buffer, 16, false);
								mesh.thinInstanceCount = kept.length;
								after += kept.length;
							}
							// An ablation that quietly reaches nothing reads as "no gain" and is
							// indistinguishable from a real null result. Refuse to produce one.
							if (!before || after >= before)
								throw new Error(`perfectcull reached ${before} instances and removed ${before - after}`);
						}
						if (pattern) {
							const hide = () => {
								for (const mesh of scene.meshes)
									if (pattern.test(mesh.name)) mesh.isVisible = false;
							};
							hide();
							scene.onBeforeRenderObservable.add(hide);
						}
						if (variant === "traffic")
							for (const light of scene.lights)
								if (light.name === "car_headlights") light.setEnabled(false);
						// Every lighting ablation has to be re-applied each frame. The clock keeps
						// running, and each hour change calls updateLights(), which re-enables every
						// light and rewrites the bulb colours -- a one-shot mutation is undone within
						// a frame or two and measures nothing at all.
						const lighting = {
							// The individual emitters, containers and lit bulbs left alone: what a
							// per-lamp distance policy could actually reach.
							// A clustered container removes its lights from scene.lights, so the
							// emitters are only reachable through the container itself.
							emitters: () => {
								for (const container of scene.lights)
									if (/^(streetlight_lights|car_headlights)$/.test(container.name))
										for (const light of container.lights) light.setEnabled(false);
							},
							// The lit bulb materials alone, every real light still on: the other half
							// of what the player's lights switch does.
							bulbs: () => {
								for (const material of scene.materials)
									if (/^(streetlight_glow|car_head_lamps|car_tail_lamps)/.test(material.name))
										material.emissiveColor.set(0.25, 0.18, 0.08);
							},
							// Each clustered container costs a pass of its own: disabling one names
							// that pass's price without touching the other's.
							streetlights: () => {
								for (const light of scene.lights)
									if (light.name === "streetlight_lights") light.setEnabled(false);
							},
							headlights: () => {
								for (const light of scene.lights)
									if (light.name === "car_headlights") light.setEnabled(false);
							},
						}[variant];
						if (lighting) {
							lighting();
							scene.onBeforeRenderObservable.add(lighting);
						}
						api.setTimeRate(mode.rate ?? 1);
					},
					{ mode: cases[name], variant: candidate ? options.variant : "none" },
				);
				await page.waitForTimeout(2000);
				const sample = await page.evaluate(
					async ({ ms, mode }) => {
						const api = window.cityjump,
							scene = api._scene,
							engine = scene.getEngine();
						const gl = engine._gl,
							ext = gl.getExtension("WEBGL_debug_renderer_info");
						const renderer = gl.getParameter(
							ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER,
						);
						const before = api.stats(),
							gaps = [],
							cpu = [],
							draws = [],
							active = [];
						const original = scene.render;
						let last = performance.now();
						scene.render = function (...args) {
							const start = performance.now();
							gaps.push(start - last);
							last = start;
							if (mode.moving) scene.activeCamera.alpha += 0.003;
							try {
								return original.apply(this, args);
							} finally {
								cpu.push(performance.now() - start);
								draws.push(engine._drawCalls.current);
								active.push(scene.getActiveMeshes().length);
							}
						};
						try {
							await new Promise((resolve) => setTimeout(resolve, ms));
						} finally {
							scene.render = original;
						}
						const summary = (values) => {
							const sorted = [...values].sort((a, b) => a - b);
							const pct = (p) =>
								sorted[
									Math.min(sorted.length - 1, Math.floor(sorted.length * p))
								] ?? 0;
							return {
								mean:
									values.reduce((a, b) => a + b, 0) /
									Math.max(1, values.length),
								p50: pct(0.5),
								p95: pct(0.95),
								p99: pct(0.99),
								max: pct(1),
							};
						};
						const after = api.stats();
						if (
							(mode.rate ?? 1) > 0 &&
							(!(after.simSeconds > before.simSeconds) ||
								(after.cars > 0 &&
									before.moverPositions === after.moverPositions))
						)
							throw new Error(
								"Running sample did not advance city and traffic",
							);
						return {
							renderer,
							camera: api.cameraState(),
							viewport: [innerWidth, innerHeight],
							buffer: [engine.getRenderWidth(), engine.getRenderHeight()],
							dpr: devicePixelRatio,
							toolbarCollapsed: document
								.querySelector("#toolbar")
								.classList.contains("collapsed"),
							frameCap: document.querySelector("#frame-cap").value,
							before,
							after,
							frames: cpu.length,
							frameMs: summary(gaps.slice(1)),
							cpuMs: summary(cpu),
							drawCalls: summary(draws),
							activeMeshes: summary(active),
						};
					},
					{ ms, mode: cases[name] },
				);
				if (errors.length) throw new Error(errors.join("\n"));
				report.samples.push({ round, name, candidate, ...sample });
				writeFileSync(
					output("distance.json"),
					`${JSON.stringify(report, null, 2)}\n`,
				);
				console.log(
					JSON.stringify({
						round,
						name,
						candidate,
						frame: sample.frameMs,
						cpu: sample.cpuMs.p50,
						meshes: sample.activeMeshes.p50,
					}),
				);
				// Every variant lives in this page only. Navigation resets all mutated engine/mesh state.
			}
		}
} finally {
	await browser.close();
}
