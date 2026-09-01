import { mkdir, appendFile } from "node:fs/promises";

const POLICIES = ["cautious", "early"];
const SEEDS = Array.from({ length: 12 }, (_, index) => index + 1);
const CONSTANTS = {
  baseScience: 10,
  earlyMultiplier: 2,
  firstWaveSeconds: 60,
  starterPopulation: 12,
};

function random(seed) {
  let state = Math.imul(seed, 2654435761) >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function run(seed, policy) {
  const rnd = random(seed);
  let population = CONSTANTS.starterPopulation;
  let science = 0;
  for (let wave = 1; wave <= 4; wave++) {
    const calledEarly = policy === "early";
    const defense = 0.44 + rnd() * 0.42 + (calledEarly ? -0.08 : 0.03);
    const defeated = defense >= 0.58;
    if (!defeated) return { seed, policy, ended: "defeated", wave, science };
    science += CONSTANTS.baseScience * wave * (calledEarly ? CONSTANTS.earlyMultiplier : 1);
    population -= Math.max(0, 3 - Math.floor(defense * 5));
    if (population <= 0) return { seed, policy, ended: "population_zero", wave, science };
  }
  return { seed, policy, ended: "evacuated", wave: 4, science };
}

const runs = POLICIES.flatMap((policy) => SEEDS.map((seed) => run(seed, policy)));
const summary = {
  at: new Date().toISOString(),
  constants: CONSTANTS,
  runs,
  distribution: runs.reduce((counts, result) => {
    counts[result.ended] = (counts[result.ended] ?? 0) + 1;
    return counts;
  }, {}),
};

await mkdir("balance", { recursive: true });
await appendFile("balance/history.jsonl", `${JSON.stringify(summary)}\n`);
console.log(`balance: ${runs.length} runs ${JSON.stringify(summary.distribution)}`);
