/**
 * Writes the Content-Security-Policy digests in render.yaml from the inline blocks they cover.
 *
 * tests/architecture.mjs already recomputes both digests from index.html and refuses a header
 * that has drifted, so a stale policy cannot ship. What was missing was anything that produced
 * the value: the loop was edit the inline style, watch the test fail, compute a base64 SHA-256 by
 * hand, paste it back. The 261-line style block is both the one that changes and the one whose
 * digest gets forgotten.
 *
 * The extraction here is deliberately the same shape as the test's, so the producer and the gate
 * cannot disagree about which bytes are hashed.
 *
 *   node scripts/csp-hashes.mjs           # rewrite render.yaml
 *   node scripts/csp-hashes.mjs --check   # report drift without writing, for a quick local check
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

const digests = { script: inlineDigest("script"), style: inlineDigest("style") };

const line = yaml.match(/^(\s*value:\s*")(default-src[^"\n]*)"$/m);
if (!line) throw new Error("render.yaml has no Content-Security-Policy value line to update");

// Only the digest inside an existing `'sha256-...'` source is replaced. Adding, removing or
// reordering a directive stays a deliberate edit to the policy, not something this script does.
let replaced = 0;
const updated = line[2].replace(/(script-src|style-src)([^;]*?)'sha256-[^']*'/g, (_whole, directive, between) => {
  const digest = digests[directive === "script-src" ? "script" : "style"];
  replaced += 1;
  return `${directive}${between}'sha256-${digest}'`;
});

if (replaced !== 2) throw new Error(`expected one hashed source in script-src and style-src, replaced ${replaced}`);

if (updated === line[2]) {
  console.log("CSP digests already match index.html.");
  process.exit(0);
}

if (check) {
  console.error("CSP digests in render.yaml do not match index.html. Run: npm run csp:sync");
  process.exit(1);
}

writeFileSync("render.yaml", yaml.replace(line[0], `${line[1]}${updated}"`));
console.log(`Updated CSP digests in render.yaml (script sha256-${digests.script}, style sha256-${digests.style}).`);
