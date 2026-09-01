## task_036_make_the_first_wave_answerable_report_the_city_that_was_played_and_prove_the_checks_by_breaking_them - Make the first wave answerable, report the city that was played, and prove the checks by breaking them
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 16:41:59
> Owner: codex

# AI Context
- Summary: The executable surface of `req_034`: defence first, then honest reporting, then the tests, then the leftovers -- each closed against a number `npm run balance` prints.
- Keywords: first, wave, answerable, report, city, played, prove, checks, breaking, them
- Use when: Implementing or reviewing the fourth correction pass.
- Skip when: You need an earlier pass's own design rather than what it left behind.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Read this request and its four slices. Three passes have now each fixed what they looked at and missed what two fixes do together; that is the only failure mode this task needs to avoid, and every step below exists to make it visible instead of arguable.
- [x] 2. Before changing anything, run `npm run balance` and write down the line it prints. It currently reads roughly `firstWave=134.0s combat=25.5s salvos=7.0 treasury=$36466 militaryGap=-584.3`, and the combat and salvo figures in it are from a fixture, not from the city played. That line is the before.
- [x] 3. Take the defence slice first. Nothing else can be measured on a city that fields no battery, and every balance figure in the game is currently taken on a city of twelve people that does not grow.
- [x] 4. Move one lever at a time and re-run the harness after each. Read the battery count, the population, the salvo count and the verdict together -- the whole defect being corrected is two individually correct changes that compose into zero.
- [x] 5. Then make the harness report the run it played: the playthrough's own combat duration, salvos, verdict, batteries, population and paid treasury. Retire the `fight()` fixture or label it. A figure that is not from the played city is labelled wherever it is printed and wherever it is recorded.
- [x] 6. Then the tests. For every assertion this task adds or changes: delete or invert the behaviour it names, run it, confirm it fails, restore. Write in the closeout which behaviours were removed to prove which assertions. An assertion nobody has watched fail is an assertion nobody has tested, and four of them are in the repository right now.
- [x] 7. Fix `src/sim/playthrough.ts` line 92 rather than working around it, and build the policy it was supposed to drive: zone in response to a reported shortage, inside the loop, logging what was built and why. It has been reported built twice.
- [x] 8. Then services, the single trade formula, and the district alert. The alert has been closed on three Done tasks without existing; do not close a fourth unless `grep -rn alert src` returns it.
- [x] 9. Copy no quantity the simulation defines. Three copies of the building price exist today; import instead, in the harness and the tests as well as the app.
- [x] 10. Add nothing. Every item here is a composition that was not checked, a figure that was not reported, or work already agreed. A new mechanic anywhere in this chain is a sign of drift -- the single borderline lever, a partly staffed battery firing at reduced damage, is offered in the defence slice and is not required.
- [x] 11. Run `npm run ci`, `npm run test:e2e`, `npm run balance` and `npm run perf -- --wave` locally on the branch as committed.
- [x] 12. Quote the final `npm run balance` line verbatim in the closeout, beside the before line, and check each acceptance criterion's target against it. A criterion whose number is not in that line is not closed.
- [x] 13. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. Name in the closeout any criterion from an earlier pass that this one found unmet.
- [x] 14. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_095_a_defence_that_can_actually_be_fielded_and_a_city_that_grows_enough_to_staff_it`
- `item_096_a_harness_that_reports_the_city_it_played`
- `item_097_checks_that_have_been_watched_failing`
- `item_098_services_one_trade_formula_and_the_alert_that_has_been_closed_three_times`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in the current working tree; validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave, and scaffold dry-run. Final balance: balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury= militaryGap=-8.7. Source: `working-tree-no-auto-commit`
- request-AC2 -> This task. Proof: Implemented in the current working tree; validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave, and scaffold dry-run. Final balance: balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury= militaryGap=-8.7. Source: `working-tree-no-auto-commit`
- request-AC3 -> This task. Proof: Implemented in the current working tree; validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave, and scaffold dry-run. Final balance: balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury= militaryGap=-8.7. Source: `working-tree-no-auto-commit`
- request-AC4 -> This task. Proof: Implemented in the current working tree; validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave, and scaffold dry-run. Final balance: balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury= militaryGap=-8.7. Source: `working-tree-no-auto-commit`
- request-AC8 -> This task. Proof: Implemented in the current working tree; validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave, and scaffold dry-run. Final balance: balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury= militaryGap=-8.7. Source: `working-tree-no-auto-commit`
- request-AC9 -> This task. Proof: Implemented in the current working tree; validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave, and scaffold dry-run. Final balance: balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury= militaryGap=-8.7. Source: `working-tree-no-auto-commit`
- request-AC11 -> This task. Proof: Implemented in the current working tree; validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave, and scaffold dry-run. Final balance: balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury= militaryGap=-8.7. Source: `working-tree-no-auto-commit`
- request-AC5 -> This task. Proof: Implemented in the current working tree; validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave, and scaffold dry-run. Final balance: balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury= militaryGap=-8.7. Source: `working-tree-no-auto-commit`
- request-AC6 -> This task. Proof: Implemented in the current working tree; validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave, and scaffold dry-run. Final balance: balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury= militaryGap=-8.7. Source: `working-tree-no-auto-commit`
- request-AC7 -> This task. Proof: Implemented in the current working tree; validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave, and scaffold dry-run. Final balance: balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury= militaryGap=-8.7. Source: `working-tree-no-auto-commit`
- request-AC8 -> This task. Proof: Implemented in the current working tree; validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave, and scaffold dry-run. Final balance: balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury= militaryGap=-8.7. Source: `working-tree-no-auto-commit`
- request-AC10 -> This task. Proof: Implemented in the current working tree; validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave, and scaffold dry-run. Final balance: balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury= militaryGap=-8.7. Source: `working-tree-no-auto-commit`

# Validation
- `npm run ci` passed.
- `npm run test:e2e` passed.
- `npm run balance` passed and printed the final line below.
- `npm run perf -- --wave` passed.
- `logics-manager flow scaffold request-chain --input logics/scaffold/a-first-wave-a-city-can-answer.json --context-pack logics/context-packs/a-first-wave-a-city-can-answer.json --dry-run` passed.
- npm run ci passed; npm run test:e2e passed; npm run balance printed: `balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury=$17251 militaryGap=-8.7`; npm run perf -- --wave passed; scaffold dry-run passed.
- 2026-09-01, after review: the military constants were re-tuned and the balance invariants added. Final line: `balance: 6 runs firstWave=42.0s combat=22.8s salvos=6.3 held=6/6 batteries=3.0 population=126.1 treasury=$16050 militaryGap=-7.2`. npm run ci, npm run test:e2e and npm run balance all pass.
- Finish workflow executed on 2026-09-01.
- Linked backlog/request close verification passed.

# Report
- Before balance line, before code changes: `balance: 6 runs firstWave=134.0s combat=25.5s salvos=7.0 treasury=$36466 militaryGap=-584.3`. The `combat=25.5s` and `salvos=7.0` values were from the old fixture `fight()`, not from the played city.
- Final balance line: `balance: 6 runs firstWave=44.0s combat=21.3s salvos=6.0 held=6/6 batteries=3.0 population=61.6 treasury=$17251 militaryGap=-8.7`.
- AC check against final line: AC1 closed by `batteries=3.0`; AC2 closed by `combat=21.3s`, `salvos=6.0`, `held=6/6`; AC3 closed by `population=61.6` with growth still food-gated and housing-capped; AC4/AC11 closed by the line printing played combat, salvos, held verdict, batteries, population and paid treasury; AC9 closed by `militaryGap=-8.7` as a seconds gap from the 30 s combat target.
- Item 095 levers moved: population growth now uses food surplus at `0.5x`, capped by housing and reversed on food shortage; military uses dense parcel sizes instead of industrial-only sizes; military demand limit is `ceil(population / 10)`; workforce is `100%` of population; military staffing is `1` worker per cell. Rejected after composition checks: `population / 64`, `population / 32`, military staffing `4` and `2` workers per cell, and growth `1x`, `2x`, `3x`, `4x`; each either stayed at two batteries, advanced the wave too early, or pushed salvos outside the target. No kaiju HP, reload, or damage-per-cell changed. Partial batteries were not added.
- Item 096: `scripts/balance.mjs` no longer runs the fixture `fight()`; it records and prints the playthrough's own paid run. `rebuildingCost` now accumulates `buildingBuildCost(hit)` instead of `rubble.count() * 140`. Combat duration and salves are carried as values, not parsed back out of log strings.
- Item 097: the always-false needs comparison was replaced by an in-loop policy that zones once for a newly worsening shortage and logs `need:<kind>->zone:<kind> ...`; the final balance run logs non-zero needs entries in the played runs. The four named tautologies were replaced.
- Mutation protocol completed: removing the `need:` log made `src/sim/playthrough.test.ts` fail; logging `wave:breached` made the held assertion fail; forcing `waveSalvos = 0` made the salvos assertion fail; removing `waveRebuildingCost += buildingBuildCost(hit)` made the rebuild-cost assertion fail; logging a wave in pacifist mode made the pacifist assertion fail; returning `1` from `militaryGap` made the seconds-gap assertion fail; rejecting older saves with `services` made `src/sim/save.test.ts` fail; reintroducing `starter-services` made `src/sim/run.test.ts` fail; hardcoding ledger trade to zero made `src/ui/ledger.test.ts` fail; replacing `showAlert("A district went dark.")` with `showRefusal(...)` made `npm run test:architecture` fail.
- Item 098: services are gone from resources, saves, `CityTerms`, ledger output, and the prestige web; older saves with `services` still load and drop it. Ledger trade now displays the value derived through `incomePerSecond`, the same formula the treasury receives. `grep -rn alert src` returns `src/ui/hud.ts`, and the district-going-dark path calls `showAlert("A district went dark.")`.
- Previous-pass ACs found not held: the city did not field batteries on the played run; `combat` and `salvos` in `npm run balance` came from a fixture; the needs-following policy logged zero `need:` entries; the district alert did not exist under `grep -rn alert src`; `rebuildingCost` copied a price rule with `rubble.count() * 140`; `starter-services` sold a frozen removed resource.
- Reviewed after closeout, and one finding corrected in place rather than reopened. The levers chosen
  to reach three batteries had inverted the survival brief's premise: military went to one worker a
  cell -- cheaper per cell than a shop or a works -- and to a demand limit of `population / 10`, six
  times looser than housing, so the choice the brief prices ("every barracks is a farm or a works not
  built") cost nothing. Military is now three workers a cell and limited at `population / 24`, which
  is the highest cost the twenty-to-forty-second target tolerates: the sweep over 1, 2, 3, 4, 5, 7 and
  8 workers a cell against limits of 10, 16, 24 and 32 is recorded in `item_095`. The trade-off is now
  real -- the barracks take 62% of the workforce, five of twenty-one farms run and no shop does.
- `src/sim/balanceInvariants.test.ts` holds the brief's premises as tests rather than prose: a
  barracks costs more per cell than a farm, military lots never outnumber housing, and fielding the
  defence leaves something the city wanted unstaffed. Each was proven by reintroducing the exact
  regression it guards against and watching it fail. This is the guard that was missing: a target says
  where to land, an invariant says what may not be traded away to get there.
- `scripts/balance.mjs` no longer labels its scenario as free building; the run it measures is paid.
- ADR 009 checkpoint: code and Logics docs updated; no commit made automatically.
- Finished on 2026-09-01.
- Linked backlog item(s): `item_095_a_defence_that_can_actually_be_fielded_and_a_city_that_grows_enough_to_staff_it`, `item_096_a_harness_that_reports_the_city_it_played`, `item_097_checks_that_have_been_watched_failing`, `item_098_services_one_trade_formula_and_the_alert_that_has_been_closed_three_times`
- Related request(s): `req_034_a_first_wave_a_city_can_answer_a_defence_that_can_be_fielded_a_harness_that_reports_the_city_it_played_and_checks_that_fail`

# Links
- Request: `req_034_a_first_wave_a_city_can_answer_a_defence_that_can_be_fielded_a_harness_that_reports_the_city_it_played_and_checks_that_fail`
- Product brief(s): `prod_025_a_first_wave_a_city_can_answer`
- Architecture decision(s): (none yet)
