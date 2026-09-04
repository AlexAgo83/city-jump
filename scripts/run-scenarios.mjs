// Plays whole runs, not one wave, and prints what happened wave by wave.
//
//   npm run scenarios [-- --waves 6 --seeds 6]
//
// This exists because every balance number in this game was chosen against the first wave. It
// changes nothing; it only looks further, and it validates per seed rather than against an average,
// because an average is how a run that is out of band hides.
import { playRun } from "../.tmp/balance/sim/playthrough.js";

const flag = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : Number(process.argv[at + 1]);
};
const waves = flag("waves", 6);
const seeds = flag("seeds", 6);

const TARGETS = { combatMin: 13, combatMax: 85, salvoMin: 4, salvoMax: 21 };
const targetLabel = `${TARGETS.combatMin}-${TARGETS.combatMax}s / ${TARGETS.salvoMin}-${TARGETS.salvoMax} salvo band`;

function scenario(label, rules) {
  console.log(`\n=== ${label} ===`);
  const runs = [];
  const failures = [];
  for (let seed = 1; seed <= seeds; seed++) {
    // A seed takes a while and says nothing until it is done: say which one is being played, so a
    // long wait reads as progress rather than as a hang.
    process.stdout.write(`playing seed ${seed}/${seeds}... `);
    const played = playRun(seed, rules, waves);
    process.stdout.write("\r");
    runs.push({ seed, played });
    const reached = played.waves.length;
    console.log(
      `seed ${seed}: ${reached} wave(s), ended=${played.run.ended ?? "alive"}, science=${played.run.science}, ` +
        `final pop=${played.economy.resources.population.toFixed(0)}, treasury=$${played.treasury.money.toFixed(0)}`,
    );
    for (const w of played.waves) {
      const combatOut = w.combatDurationSeconds < TARGETS.combatMin || w.combatDurationSeconds > TARGETS.combatMax;
      const salvoOut = w.salvos < TARGETS.salvoMin || w.salvos > TARGETS.salvoMax;
      console.log(
        `   w${w.wave} wait=${w.waitedSeconds.toFixed(0)}s threat=${w.threat} pop=${w.population.toFixed(0)} ` +
          `lots=${w.parcels} bat=${w.fieldedBatteries} combat=${w.combatDurationSeconds.toFixed(1)}s${combatOut ? "!" : " "} ` +
          `salvos=${w.salvos}${salvoOut ? "!" : " "} ${w.held ? "HELD" : "BREACHED"} lost=${w.destroyed} $${w.treasury.toFixed(0)}`,
      );
      const kinds = Object.entries(w.byKind).map(([kind, count]) => `${kind.slice(0, 4)}=${count}`).join(" ");
      const roads = Object.entries(w.roadMetres).map(([type, metres]) => `${type.split("_")[0]}=${metres}m`).join(" ");
      console.log(`        lots: ${kinds}  |  roads: ${roads}`);
    }
    if (reached === 0) failures.push(`${label} seed ${seed}: no wave triggered`);
    if (played.economy.resources.population <= 0) failures.push(`${label} seed ${seed}: final population is zero`);
  }
  const fought = runs.flatMap(({ seed, played }) => played.waves.map((wave) => ({ seed, wave })));
  const offTarget = fought.filter(({ wave }) => wave.combatDurationSeconds < TARGETS.combatMin || wave.combatDurationSeconds > TARGETS.combatMax || wave.salvos < TARGETS.salvoMin || wave.salvos > TARGETS.salvoMax);
  failures.push(
    ...offTarget.map(({ seed, wave }) => `${label} seed ${seed} wave ${wave.wave}: combat=${wave.combatDurationSeconds.toFixed(1)}s salvos=${wave.salvos}`),
  );
  console.log(
    `-- ${fought.length} waves fought, ${fought.filter(({ wave }) => wave.held).length} held, ` +
      `${offTarget.length} outside the ${targetLabel}, ` +
      `runs reaching wave ${waves}: ${runs.filter((r) => r.played.waves.length >= waves).length}/${seeds}`,
  );
  return { label, runs, fought, offTarget, failures };
}

const results = [];

const gateRules = { instantConstruction: true, residentsPerWave: 180 };
results.push(scenario(`expanding city, with utilities (${waves} waves)`, { ...gateRules, expand: true }));
// The same city that never builds its power and water, rather than the same city with the rule
// switched off: with `placeUtilities` left on, the scenario laid its own producer and diffusers,
// nothing was ever short, and this block printed the one above it character for character.
results.push(scenario(`expanding city, no utilities built (${waves} waves)`, { ...gateRules, expand: true, placeUtilities: false }));
results.push(scenario(`static city (the balance gate's scenario, ${waves} waves)`, gateRules));

const failures = results.flatMap((result) => result.failures);
if (failures.length) {
  console.error("\nScenario gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
