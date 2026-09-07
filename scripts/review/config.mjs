import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const probes = [
	"profile",
	"distance",
	"detail",
	"workforce",
	"focus",
	"rubble",
	"wave",
	"interactions",
	"extra",
	"soak",
];
const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		probe: { type: "string", default: "interactions" },
		out: { type: "string" },
		"preview-url": { type: "string" },
		headless: { type: "boolean", default: false },
		help: { type: "boolean", default: false },
		"compare-url": { type: "string" },
		cases: {
			type: "string",
			default:
				"day-street,day-district,day-overview,night-saved,moving,follow,x4,paused",
		},
		variant: { type: "string", default: "none" },
		rounds: { type: "string", default: "3" },
		ms: { type: "string", default: "5000" },
		dpr: { type: "string", default: "1" },
		wide: { type: "boolean", default: false },
	},
});
export const options = values;
export const url = positionals[0] ?? "http://127.0.0.1:5173";
export const previewUrl = values["preview-url"];
if (positionals.length > 1)
	throw new Error("Expected only one development-server URL");
for (const address of [url, previewUrl, values["compare-url"]].filter(
	Boolean,
)) {
	if (!["http:", "https:"].includes(new URL(address).protocol))
		throw new Error("Expected an HTTP(S) server URL");
}
if (values.probe !== "all" && !probes.includes(values.probe))
	throw new Error(`Unknown probe: ${values.probe}`);
export const selected = values.probe === "all" ? probes : [values.probe];
export const outputDir = resolve(
	process.env.CITY_JUMP_REVIEW_OUTPUT ??
		values.out ??
		resolve(
			root,
			".tmp/perf-review",
			new Date().toISOString().replaceAll(":", "-"),
		),
);
export const output = (name) => resolve(outputDir, name);
export const fixturePath = resolve(root, "perf/cities/ma-ville.json");
export const launchOptions = {
	headless: values.headless,
	args: ["--ignore-gpu-blocklist"],
};
