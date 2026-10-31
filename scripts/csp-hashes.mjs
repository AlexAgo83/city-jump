/**
 * Writes the inline script's Content-Security-Policy digest in render.yaml.
 * HUD CSS is a same-origin stylesheet emitted by Vite, so style-src needs no hash.
 * tests/architecture.mjs checks both contracts to prevent stale policies from shipping.
 *
 *   node scripts/csp-hashes.mjs           # rewrite render.yaml
 *   node scripts/csp-hashes.mjs --check   # report drift without writing
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const check = process.argv.includes("--check");

const html = readFileSync("index.html", "utf8");
const yaml = readFileSync("render.yaml", "utf8");

/** The inline block a `<tag>` directive covers, hashed exactly as tests/architecture.mjs hashes it. */
function inlineDigest(tag) {
  const match = html.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) throw new Error(`index.html has no inline <${tag}> block for the policy to cover`);
  return createHash("sha256").update(match[1]).digest("base64");
}

const digest = inlineDigest("script");

const line = yaml.match(/^(\s*value:\s*")(default-src[^"\n]*)"$/m);
if (!line) throw new Error("render.yaml has no Content-Security-Policy value line to update");

// Only the digest inside an existing `'sha256-...'` source is replaced. Adding, removing or
// reordering a directive stays a deliberate edit to the policy, not something this script does.
let replaced = 0;
const updated = line[2].replace(/(script-src)([^;]*?)'sha256-[^']*'/g, (_whole, directive, between) => {
  replaced += 1;
  return `${directive}${between}'sha256-${digest}'`;
});

if (replaced !== 1) throw new Error(`expected one hashed source in script-src, replaced ${replaced}`);

if (updated === line[2]) {
  console.log("CSP digests already match index.html.");
  process.exit(0);
}

if (check) {
  console.error("CSP digests in render.yaml do not match index.html. Run: npm run csp:sync");
  process.exit(1);
}

writeFileSync("render.yaml", yaml.replace(line[0], `${line[1]}${updated}"`));
console.log(`Updated CSP digest in render.yaml (script sha256-${digest}).`);
