import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version;
const majorMinor = version.split(".").slice(0, 2).join(".");

const checks = [
  {
    file: "README.md",
    read: (text) => text.match(/badge\/version-([^-]+)-/)?.[1],
    expected: version,
  },
  {
    file: "SECURITY.md",
    read: (text) => text.match(/\|\s*(\d+\.\d+\.x)\s*\|\s*Yes\s*\|/)?.[1],
    expected: `${majorMinor}.x`,
  },
  {
    file: "docs/static-site-blueprint.md",
    read: (text) => text.match(/Release version:\s*`([^`]+)`/)?.[1],
    expected: version,
  },
  {
    file: "docs/static-site-blueprint.md",
    read: (text) => text.match(/Tag:\s*`v([^`]+)`/)?.[1],
    expected: version,
  },
];

const failures = [];
for (const check of checks) {
  const found = check.read(readFileSync(check.file, "utf8"));
  if (found !== check.expected) failures.push(`${check.file}: found ${found ?? "missing"}, expected ${check.expected}`);
}

if (failures.length) {
  console.error("Version check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Version check OK (${version})`);
