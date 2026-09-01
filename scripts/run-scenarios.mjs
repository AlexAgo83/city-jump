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

const TARGETS = { combatMin: 20, combatMax: 40, salvoMin: 5, salvoMax: 8 };

function scenario(label, rules) {
  console.log(`\n=== ${label} ===`);
  const runs = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const played = playRun(seed, rules, waves);
    runs.push(played);
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
    }
  }
  const fought = runs.flatMap((played) => played.waves);
  const offTarget = fought.filter(
    (w) => w.combatDurationSeconds < TARGETS.combatMin || w.combatDurationSeconds > TARGETS.combatMax || w.salvos < TARGETS.salvoMin || w.salvos > TARGETS.salvoMax,
  );
  console.log(
    `-- ${fought.length} waves fought, ${fought.filter((w) => w.held).length} held, ` +
      `${offTarget.length} outside the 20-40s / 5-8 salvo band, ` +
      `runs reaching wave ${waves}: ${runs.filter((r) => r.waves.length >= waves).length}/${seeds}`,
  );
  return { runs, fought, offTarget };
}

scenario(`with utilities (${waves} waves)`, { instantConstruction: true });
scenario(`without utilities (${waves} waves)`, { instantConstruction: true, utilities: false });
