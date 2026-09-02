// Compiles the headless simulation into `.tmp/balance`, and only when it is out of date.
//
// `npm run scenarios` and `npm run balance` both start with this. The compile takes a few seconds
// and was paid on every run, including the many runs where nothing under `src/sim` had changed.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = ".tmp/balance";
const newest = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce((latest, entry) => {
    const path = join(dir, entry.name);
    const at = entry.isDirectory() ? newest(path) : statSync(path).mtimeMs;
    return Math.max(latest, at);
  }, 0);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "package.json"), '{"type":"commonjs"}');

let built = 0;
try {
  built = newest(join(OUT, "sim"));
} catch {
  built = 0; // never compiled
}
if (newest("src") <= built) process.exit(0);

execFileSync(
  "npx",
  ["tsc", "--ignoreConfig", "--rootDir", "src", "--outDir", OUT, "--module", "CommonJS", "--target", "ES2022",
   "--strict", "--noUncheckedIndexedAccess", "--skipLibCheck", "--noEmit", "false", "src/sim/playthrough.ts"],
  { stdio: "inherit" },
);
