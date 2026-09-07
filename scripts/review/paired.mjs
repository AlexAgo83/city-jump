/**
 * Read a distance-probe result as paired per-round deltas rather than one median per side.
 *
 * A round where the whole machine was busy slows the baseline and the candidate together. Taking
 * the median of each side separately mixes those regimes and can invent a gain; taking the median
 * of the per-round deltas cannot, and printing every round shows when a run should be thrown away.
 */
import { readFileSync } from "node:fs";

const [dir] = process.argv.slice(2);
const samples = JSON.parse(
	readFileSync(`${dir}/distance.json`, "utf8"),
).samples;
const median = (xs) => {
	const s = [...xs].sort((a, b) => a - b);
	return s.length % 2
		? s[(s.length - 1) / 2]
		: (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const names = [...new Set(samples.map((s) => s.name))].sort();
const rounds = [...new Set(samples.map((s) => s.round))].sort();
const pick = (name, round, candidate) =>
	samples.find(
		(s) => s.name === name && s.round === round && s.candidate === candidate,
	);

console.log(
	`${"case".padEnd(14)}${rounds.map((r) => `r${r}`.padStart(9)).join("")}${"median".padStart(10)}   baseline p50 by round`,
);
for (const name of names) {
	const deltas = [];
	const bases = [];
	for (const round of rounds) {
		const base = pick(name, round, false);
		const cand = pick(name, round, true);
		if (!base || !cand) {
			deltas.push(Number.NaN);
			bases.push(Number.NaN);
			continue;
		}
		deltas.push(
			((base.frameMs.p50 - cand.frameMs.p50) / base.frameMs.p50) * 100,
		);
		bases.push(base.frameMs.p50);
	}
	const shown = deltas
		.map((d) => `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`.padStart(9))
		.join("");
	const spread = Math.max(...bases) / Math.min(...bases);
	const warn =
		spread > 1.25
			? `  <- baseline varies ${spread.toFixed(2)}x across rounds`
			: "";
	console.log(
		`${name.padEnd(14)}${shown}${`${median(deltas) >= 0 ? "+" : ""}${median(deltas).toFixed(1)}%`.padStart(10)}   ${bases.map((b) => b.toFixed(1)).join(" ")}${warn}`,
	);
}
