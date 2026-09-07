import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const runner = fileURLToPath(
	new URL("../scripts/review/run.mjs", import.meta.url),
);
const run = (...args) =>
	spawnSync(process.execPath, [runner, ...args], {
		cwd: tmpdir(),
		encoding: "utf8",
		timeout: 10000,
	});

test("review CLI is portable, validates options and refuses to overwrite evidence", () => {
	const folder = mkdtempSync(join(tmpdir(), "city-jump-review-test-"));
	try {
		const help = run("--help");
		assert.equal(help.status, 0, help.stderr);
		assert.match(help.stdout, /--preview-url/);
		for (const args of [
			["--probe", "missing"],
			["file:///tmp"],
			["--typo"],
			["--out", folder],
		]) {
			const result = run(...args);
			assert.notEqual(result.status, 0, JSON.stringify(args));
		}
		assert.deepEqual(readdirSync(folder), []);
		for (const name of readdirSync(
			new URL("../scripts/review/", import.meta.url),
		)) {
			if (!name.endsWith(".mjs")) continue;
			const file = new URL(`../scripts/review/${name}`, import.meta.url);
			const source = readFileSync(file, "utf8");
			assert.doesNotMatch(
				source,
				/\/Users\/|\/tmp\/city-jump|127\.0\.0\.1:518[78]/,
				name,
			);
			const check = spawnSync(
				process.execPath,
				["--check", fileURLToPath(file)],
				{ encoding: "utf8" },
			);
			assert.equal(check.status, 0, check.stderr);
		}
	} finally {
		rmSync(folder, { recursive: true, force: true });
	}
});

test("model readiness follows the served manifest and explains missing assets", async () => {
	const { waitForModels } = await import("../scripts/model-readiness.mjs");
	const page = {
		url: () => "http://localhost:5173/",
		request: {
			get: async () => ({
				ok: () => true,
				json: async () => ({ models: { a: {}, b: {} } }),
			}),
		},
		waitForTimeout: async () => {},
		waitForFunction: async (_fn, args) => {
			assert.deepEqual(args.ids, ["a", "b"]);
		},
		evaluate: async () => ({ models: 2, buildings: 5 }),
	};
	assert.equal((await waitForModels(page, 5)).models, 2);
	page.waitForFunction = async () => {
		throw new Error("timeout");
	};
	page.evaluate = async () => ["building_a"];
	await assert.rejects(waitForModels(page, 5, 1), /missing models: b/);
});
