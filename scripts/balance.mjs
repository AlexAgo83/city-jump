import { mkdir, appendFile } from "node:fs/promises";

import { playFirstRun, militaryGap } from "../.tmp/balance/sim/playthrough.js";

const runs = Array.from({ length: 6 }, (_, index) => {
  const played = playFirstRun(index + 1, { instantConstruction: true, freeBuilding: true }, "clean_hold");
  return {
    seed: index + 1,
    firstWaveSeconds: played.seconds,
    threat: played.wave.threat,
    batteries: played.wave.fieldedBatteries,
    firepowerPerMinute: played.wave.firepowerPerMinute,
    militaryGap: militaryGap(index + 1),
  };
});
const summary = {
  at: new Date().toISOString(),
  scenario: "headless needs-following first run with instant construction and free building",
  runs,
  averageFirstWaveSeconds: runs.reduce((sum, run) => sum + run.firstWaveSeconds, 0) / runs.length,
  averageMilitaryGap: runs.reduce((sum, run) => sum + run.militaryGap, 0) / runs.length,
};

await mkdir("balance", { recursive: true });
await appendFile("balance/history.jsonl", `${JSON.stringify(summary)}\n`);
console.log(`balance: ${runs.length} runs firstWave=${summary.averageFirstWaveSeconds.toFixed(1)}s militaryGap=${summary.averageMilitaryGap.toFixed(1)}`);
