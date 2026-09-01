## req_034_a_first_wave_a_city_can_answer_a_defence_that_can_be_fielded_a_harness_that_reports_the_city_it_played_and_checks_that_fail - A first wave a city can answer: a defence that can be fielded, a harness that reports the city it played, and checks that fail
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 16:29:38

# AI Context
- Summary: The fourth correction pass, scoped to numbers a command prints: a first wave a city can actually field a defence against, a harness that reports the run it played instead of a fixture, assertions watched failing, and the services/trade/alert leftovers.
- Keywords: first, wave, city, can, answer, defence, fielded, harness, reports, played, checks, fail
- Use when: Working on the defence balance, population growth, what `npm run balance` reports, the playthrough tests, or the services and trade leftovers.
- Skip when: You need the kaiju loop, missiles or construction feedback, which are delivered and working.

# Needs
- The correction pass met seven of its eleven criteria and met the three hardest properly: `npm run balance` reports a combat duration and a salvo count again, the playthrough fights its wave and derives the outcome instead of accepting it as an argument, and a paid run now ends at plus $18,471 where it ended at minus $212,790. What it missed is one class of thing, and it missed it four times: every item that required checking how two correct changes compose.
- The game is currently undefendable. Two individually correct fixes -- military parcels always passing through `parcelsForDemand`'s limits, and `batteriesForParcels` filtering on staffing -- compose into zero batteries. The smallest parcel a military lot may occupy is 1x4, because `allowedSizes` restricts military to `INDUSTRIAL_SIZES`, and military demands eight workers a cell, so the smallest possible battery needs 32 workers. `workforceFromPopulation` is half the population, so a battery requires a population of 64. The playthrough is at 12.1 when its first wave lands at 134 seconds. It fields nothing, fires nothing, and its own combat measures 90 seconds and 0 salvos.
- Underneath that, population does not grow. `growth` is `jobs * 0.03 * day`, which over the 134 seconds before the first wave moves a city of 12 people to 12.1. Nothing else in the game can work while that is true: no defence can be staffed, no district can be filled, and every balance number downstream is measured on a city of twelve that never changes.
- The measurement that was celebrated is not of the game. `npm run balance` prints `combat=25.5s salvos=7.0`, and those come from `fight()` -- a synthetic scenario in `scripts/balance.mjs` with one hardcoded 4x3 battery against three fixed points. The city the harness actually plays measures 90 seconds and 0 salvos, and those figures are computed but never emitted. One JSON record carries both answers and reports only the flattering one, which is why the undefendable city went unseen.
- Four assertions in `src/sim/playthrough.test.ts` still cannot fail: `toContain` over the three values the return type already guarantees; `rebuildingCost` asserted non-negative when it is a product of positives; `wave.threat` asserted to be the literal zero returned by the pacifist early return; and `Number.isFinite(militaryGap(3))` over ordinary arithmetic. The criterion they were written under says an assertion that cannot fail is replaced rather than supplemented, and the plan said to prove each one by removing the behaviour it names.
- The needs-following policy was not built, for the second time, and was reported built for the second time. `src/sim/playthrough.ts` line 92 still reads `short.kind !== firstNeeds.find(need => need.kind === short.kind)?.kind` -- a value compared against itself, always false. A full run logs zero `need:` entries. Every zone is still painted before the loop and nothing is ever built in response to a gauge.
- Services became what materials were. Growth no longer reads `servicesProduced`, so `resources.services` accumulates and is read by nothing but the ledger -- and `starter-services` still sells 20 of it for 10 prestige. That is the defect removed one field away in the same commit, left standing.
- There are now two formulas for trade. `CityTerms.trade` is `servicesProduced + industryTrade`, per cell per day at rates of 4 and 3; `incomePerSecond` computes a different trade from the statuses, per cell per second at 0.35 and 0.25. The ledger displays the first and the treasury earns the second, so the ledger reports income the city does not receive.
- `rebuildingCost` is `rubble.count() * 140`, a third copy of the price rule that contradicts `buildingBuildCost` -- per kind, 60 to 190 a cell -- with which the same function charges the rebuild three lines earlier.
- `militaryGap` still mixes units, now more elaborately: damage per minute minus hit points divided by a number chosen by an unrelated boolean.
- The district-going-dark alert has now been closed without being written three times. The word 'alert' appears nowhere in the repository.

# Context
- This request is scoped so that every criterion is a number a command prints, not a judgement someone makes. The previous three passes each failed on the same class of item -- work that needed two changes checked together -- and prose asking for care did not prevent it. What follows names the exact target values and the exact command that shows them.
- **The verification protocol, which applies to every slice.** After the work, `npm run balance` must print a line whose values fall inside the targets stated in the acceptance criteria, and that line is what the closeout quotes. Any figure quoted in a closeout must come from a command in `package.json`, run on the branch as committed. A figure from a fixture is labelled as a fixture wherever it is printed.
- **The mutation protocol, which applies to every test this request adds or changes.** For each assertion, delete or invert the behaviour it names, run the test, and confirm it fails; then restore. An assertion nobody has watched fail is an assertion nobody has tested. The four named tautologies are the standing evidence that writing the assertion is not the same as testing it.
- **The single-source rule, from `adr_005_one_harness_drives_the_real_simulation_and_no_test_shortcuts_a_player_decision`.** Three copies of the building price now exist. Any quantity the simulation defines is imported from where it is defined -- the harness, the tests and the renderers included. A second copy is a defect on sight, not a style preference.
- The defence problem has several levers and this request deliberately does not pick one: the minimum parcel size military may occupy (`allowedSizes` currently forces `INDUSTRIAL_SIZES`), the eight workers a cell military demands, the half-of-population workforce fraction, whether a partly staffed battery fires at reduced damage, and how fast population grows. What it does fix is the outcome the levers must produce, so that whichever combination is chosen can be checked rather than argued.
- Population growth is the lever most likely to be the real answer and the one with the widest blast radius, because every other balance figure in the game is currently measured on a city of twelve that never changes. Whatever is chosen, the city-resources criterion still stands: growth is capped by housing and gated by food.
- Nothing here is new mechanics. The one thing that could be -- a partly staffed battery firing at reduced damage -- is offered as a lever, not required, and it is the same all-or-nothing staffing question an earlier slice already recorded as open.
- The services answer is already settled by precedent: materials were removed outright from the resources, the saves, the terms, the ledger and the prestige web one field away. Services get the same treatment or a real consumer; carrying a frozen stock and selling it for prestige is what the prestige request exists to forbid.
- The two trade formulas are one deletion, not a design question. `incomePerSecond` is what the treasury actually receives, so the ledger reports that, and the interface criterion that no formula is written down twice is satisfied by having one.

# Acceptance criteria
- AC1: A city that zoned a military district fields at least three staffed batteries by its first wave, proven by the playthrough rather than by a fixture.
- AC2: The playthrough's own first wave is held, lasts between 20 and 40 seconds and takes between 5 and 8 salvos -- the same targets the wave balance was set to, now measured on the city that was played.
- AC3: Population grows: the playthrough reaches its first wave with a population that can staff the defence AC1 requires, and growth stays capped by housing and gated by food.
- AC4: `npm run balance` prints the playthrough's own combat duration, salvo count, salvo-held verdict, battery count, population and paid-run treasury, and any figure that comes from a fixture is labelled as one wherever it is printed.
- AC5: The four assertions in `src/sim/playthrough.test.ts` that cannot fail are replaced, and every test this request touches has been watched to fail with the behaviour it names removed.
- AC6: The needs-following policy builds in response to a gauge -- `src/sim/playthrough.ts` line 92 is the always-false comparison to fix -- and a run logs what it built and why.
- AC7: Services are spent by something or are gone from the resources, the saves, `CityTerms`, the ledger and the prestige web, and no prestige node sells a frozen number.
- AC8: There is one trade formula, the ledger displays the one the treasury receives, and no quantity the simulation defines is copied anywhere -- `rubble.count() * 140` included.
- AC9: `militaryGap` compares quantities of the same kind, or is replaced by time-to-kill against the twenty-to-forty-second target.
- AC10: A district going dark raises a one-line alert.
- AC11: Every criterion above is demonstrated by a command in `package.json` run on the branch as committed, and the closeout quotes its output verbatim.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_025_a_first_wave_a_city_can_answer`
- Architecture decision(s): (none yet)

# References
- src/sim/playthrough.ts
- src/sim/playthrough.test.ts
- scripts/balance.mjs
- src/sim/economy.ts
- src/sim/workforce.ts
- src/sim/slots.ts
- src/sim/batteries.ts
- src/sim/run.ts
- src/ui/ledger.ts
- src/ui/hud.ts
- src/app/app.ts
- balance/history.jsonl
- logics/architecture/adr_005_one_harness_drives_the_real_simulation_and_no_test_shortcuts_a_player_decision.md

# Backlog
- `item_095_a_defence_that_can_actually_be_fielded_and_a_city_that_grows_enough_to_staff_it`
- `item_096_a_harness_that_reports_the_city_it_played`
- `item_097_checks_that_have_been_watched_failing`
- `item_098_services_one_trade_formula_and_the_alert_that_has_been_closed_three_times`
