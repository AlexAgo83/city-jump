import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { platform, arch, cpus } from "node:os";
import { chromium } from "playwright";
import {
	fixturePath,
	launchOptions,
	options,
	output,
	outputDir,
	previewUrl,
	root,
	selected,
	url,
} from "./config.mjs";

if (options.help) {
	console.log(`Usage: node scripts/review/run.mjs [dev-url] [options]
  --probe interactions|profile|focus|rubble|wave|extra|soak|all
  --preview-url URL  Include production startup measurements in extra (build first)
  --out DIRECTORY    New output directory; existing directories are refused
  --headless         Diagnostic/CI mode, not comparable to headed GPU measurements
Default: interactions, headed Chromium, perf/cities/ma-ville.json.
See docs/performance.md for workloads, prerequisites and interpretation.`);
	process.exit(0);
}

const raw = readFileSync(fixturePath);
const fixture = JSON.parse(raw);
if (fixture.v !== 14 || fixture.buildingStates?.length !== 1287) {
	throw new Error(
		"These coordinate-based probes require the large-demo-v14 reference (1287 buildings). See docs/performance.md.",
	);
}
mkdirSync(dirname(outputDir), { recursive: true });
mkdirSync(outputDir); // Refuse to overwrite historical or partially completed evidence.
const hash = (data) => createHash("sha256").update(data).digest("hex");
const git = (...args) =>
	execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const sources = readdirSync(resolve(root, "src"), { recursive: true })
	.filter((p) => p.endsWith(".ts"))
	.sort();
const sourceHash = hash(
	sources
		.map((p) => `${p}:${hash(readFileSync(resolve(root, "src", p)))}`)
		.join("\n"),
);
const manifest = {
	schema: 1,
	startedAt: new Date().toISOString(),
	status: "running",
	command: process.argv.slice(2),
	commit: git("rev-parse", "HEAD"),
	worktree: git("status", "--short"),
	sourceHash,
	fixture: { path: "perf/cities/ma-ville.json", sha256: hash(raw) },
	platform: platform(),
	arch: arch(),
	cpu: cpus()[0]?.model,
	node: process.version,
	headed: !options.headless,
	devUrl: url,
	previewUrl,
	scripts: Object.fromEntries(
		readdirSync(new URL(".", import.meta.url))
			.filter((p) => p.endsWith(".mjs"))
			.map((p) => [p, hash(readFileSync(new URL(p, import.meta.url)))]),
	),
	probes: [],
};
const record = () =>
	writeFileSync(output("run.json"), `${JSON.stringify(manifest, null, 2)}\n`);
record();
let child;
let interrupted = false;
const interrupt = () => {
	interrupted = true;
	child?.kill("SIGTERM");
};
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);
try {
	const browser = await chromium.launch(launchOptions);
	try {
		manifest.browser = browser.version();
		const page = await browser.newPage();
		manifest.renderer = await page.evaluate(() => {
			const gl = document.createElement("canvas").getContext("webgl2");
			if (!gl) throw new Error("WebGL2 is unavailable");
			const ext = gl.getExtension("WEBGL_debug_renderer_info");
			return gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
		});
	} finally {
		await browser.close();
	}
	record();
	console.log(`Evidence: ${outputDir}\nRenderer: ${manifest.renderer}`);
	for (const name of selected) {
		if (interrupted)
			throw new Error("Review interrupted; partial evidence retained");
		const row = {
			name,
			status: "running",
			startedAt: new Date().toISOString(),
		};
		manifest.probes.push(row);
		record();
		child = spawn(
			process.execPath,
			[
				resolve(root, "scripts/review", `${name}.mjs`),
				...process.argv.slice(2),
			],
			{
				cwd: root,
				stdio: "inherit",
				timeout: 15 * 60 * 1000,
				env: { ...process.env, CITY_JUMP_REVIEW_OUTPUT: outputDir },
			},
		);
		const code = await new Promise((resolve, reject) => {
			child.once("error", reject);
			child.once("exit", resolve);
		});
		row.exitCode = code;
		row.finishedAt = new Date().toISOString();
		row.status = code === 0 ? "complete" : "failed";
		record();
		if (code !== 0)
			throw new Error(
				`Probe ${name} failed (exit ${code}); partial evidence retained`,
			);
	}
	if (interrupted)
		throw new Error("Review interrupted; partial evidence retained");
	manifest.status = "complete";
} catch (error) {
	manifest.status = "failed";
	manifest.error = error.message;
	process.exitCode = 1;
	console.error(error.message);
} finally {
	manifest.finishedAt = new Date().toISOString();
	record();
	process.off("SIGINT", interrupt);
	process.off("SIGTERM", interrupt);
}
