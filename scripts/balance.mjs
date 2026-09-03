import { mkdir, appendFile } from "node:fs/promises";
import { execSync } from "node:child_process";

import { playFirstRun, militaryGap } from "../.tmp/balance/sim/playthrough.js";

const args = process.argv.slice(2);
const commit = execSync("git rev-parse --short HEAD").toString().trim();
const dirty = execSync("git status --porcelain").toString().trim().length > 0;
if (dirty && !args.includes("--allow-dirty")) {
  console.error("Refusing to append balance/history.jsonl from a dirty tree. Use --allow-dirty to record it anyway.");
  process.exit(1);
}

const runs = Array.from({ length: 6 }, (_, index) => {
  const played = playFirstRun(index + 1, { instantConstruction: true });
  return {
    seed: index + 1,
    firstWaveSeconds: played.seconds - played.wave.combatDurationSeconds,
    combatDurationSeconds: played.wave.combatDurationSeconds,
    salvos: played.wave.salvos,
    held: played.log.includes("wave:held"),
    shape: played.wave.shape,
    treasury: played.treasury.money,
    population: played.economy.resources.population,
    threat: played.wave.threat,
    batteries: played.wave.fieldedBatteries,
    firepowerPerMinute: played.wave.firepowerPerMinute,
    militaryGap: militaryGap(index + 1),
  };
});
const summary = {
  at: new Date().toISOString(),
  commit,
  dirty,
  scenario: "headless needs-following first run, paid buildings, instant construction",
  runs,
  averageFirstWaveSeconds: runs.reduce((sum, run) => sum + run.firstWaveSeconds, 0) / runs.length,
  averageCombatDurationSeconds: runs.reduce((sum, run) => sum + run.combatDurationSeconds, 0) / runs.length,
  averageSalvos: runs.reduce((sum, run) => sum + run.salvos, 0) / runs.length,
  averageBatteries: runs.reduce((sum, run) => sum + run.batteries, 0) / runs.length,
  averagePopulation: runs.reduce((sum, run) => sum + run.population, 0) / runs.length,
  averageTreasury: runs.reduce((sum, run) => sum + run.treasury, 0) / runs.length,
  averageMilitaryGap: runs.reduce((sum, run) => sum + run.militaryGap, 0) / runs.length,
  heldRuns: runs.filter((run) => run.held).length,
};

await mkdir("balance", { recursive: true });
await appendFile("balance/history.jsonl", `${JSON.stringify(summary)}\n`);
console.log(`balance: ${runs.length} runs firstWave=${summary.averageFirstWaveSeconds.toFixed(1)}s combat=${summary.averageCombatDurationSeconds.toFixed(1)}s salvos=${summary.averageSalvos.toFixed(1)} held=${summary.heldRuns}/${runs.length} batteries=${summary.averageBatteries.toFixed(1)} population=${summary.averagePopulation.toFixed(1)} treasury=$${summary.averageTreasury.toFixed(0)} militaryGap=${summary.averageMilitaryGap.toFixed(1)}`);
