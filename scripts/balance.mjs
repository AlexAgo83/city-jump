import { mkdir, appendFile } from "node:fs/promises";

import { batteriesForParcels, batteriesInRange } from "../.tmp/balance/sim/batteries.js";
import { advanceKaijuAssault, createKaijuAssault } from "../.tmp/balance/sim/kaiju.js";
import { advanceWaveClock, createWaveClock, damageWaveClock, WAVE_STARTING_VALUES } from "../.tmp/balance/sim/wave.js";

const dt = 0.25;
const battery = { kind: "military", frontageCells: 4, depthCells: 3, position: { x: 0, y: 0, z: 0 } };
const targets = [
  { x: 120, y: 0, z: 0 },
  { x: 170, y: 0, z: 0 },
  { x: 220, y: 0, z: 0 },
];

function run(seed) {
  let clock = advanceWaveClock(createWaveClock(), WAVE_STARTING_VALUES.firstWaveSeconds);
  let assault = createKaijuAssault({ x: -80 + seed * 2, y: 0, z: 0 });
  let nextSalvoAt = 0;
  let seconds = 0;
  let salvos = 0;
  let missiles = [];
  const batteries = batteriesForParcels([battery]);

  while (clock.active?.hitPoints && seconds < 90) {
    assault = advanceKaijuAssault(assault, targets, dt);
    if (seconds >= nextSalvoAt) {
      const firing = batteriesInRange(batteries, assault.position);
      salvos += firing.length ? 1 : 0;
      missiles.push(...firing.map((shot) => ({
        damage: shot.damage,
        impactAt: seconds + WAVE_STARTING_VALUES.missileTravelSecondsAtRange * Math.min(1, distance(shot.position, assault.position) / shot.range),
      })));
      nextSalvoAt = seconds + WAVE_STARTING_VALUES.reloadSeconds;
    }
    const hits = missiles.filter((missile) => missile.impactAt <= seconds);
    if (hits.length) clock = damageWaveClock(clock, hits.reduce((sum, missile) => sum + missile.damage, 0));
    missiles = missiles.filter((missile) => missile.impactAt > seconds);
    seconds += dt;
  }
  return { seed, durationSeconds: seconds, salvos, held: (clock.active?.hitPoints ?? 0) <= 0 };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

const runs = Array.from({ length: 6 }, (_, index) => run(index + 1));
const summary = {
  at: new Date().toISOString(),
  constants: WAVE_STARTING_VALUES,
  scenario: "one 4x3 military battery defending three nearby targets",
  runs,
  averageDurationSeconds: runs.reduce((sum, run) => sum + run.durationSeconds, 0) / runs.length,
  averageSalvos: runs.reduce((sum, run) => sum + run.salvos, 0) / runs.length,
};

await mkdir("balance", { recursive: true });
await appendFile("balance/history.jsonl", `${JSON.stringify(summary)}\n`);
console.log(`balance: ${runs.length} runs avg=${summary.averageDurationSeconds.toFixed(1)}s salvos=${summary.averageSalvos.toFixed(1)}`);
