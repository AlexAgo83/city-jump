## task_036_make_the_first_wave_answerable_report_the_city_that_was_played_and_prove_the_checks_by_breaking_them - Make the first wave answerable, report the city that was played, and prove the checks by breaking them
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 16:04:51

# AI Context
- Summary: The executable surface of `req_034`: defence first, then honest reporting, then the tests, then the leftovers -- each closed against a number `npm run balance` prints.
- Keywords: first, wave, answerable, report, city, played, prove, checks, breaking, them
- Use when: Implementing or reviewing the fourth correction pass.
- Skip when: You need an earlier pass's own design rather than what it left behind.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Read this request and its four slices. Three passes have now each fixed what they looked at and missed what two fixes do together; that is the only failure mode this task needs to avoid, and every step below exists to make it visible instead of arguable.
- [ ] 2. Before changing anything, run `npm run balance` and write down the line it prints. It currently reads roughly `firstWave=134.0s combat=25.5s salvos=7.0 treasury=$36466 militaryGap=-584.3`, and the combat and salvo figures in it are from a fixture, not from the city played. That line is the before.
- [ ] 3. Take the defence slice first. Nothing else can be measured on a city that fields no battery, and every balance figure in the game is currently taken on a city of twelve people that does not grow.
- [ ] 4. Move one lever at a time and re-run the harness after each. Read the battery count, the population, the salvo count and the verdict together -- the whole defect being corrected is two individually correct changes that compose into zero.
- [ ] 5. Then make the harness report the run it played: the playthrough's own combat duration, salvos, verdict, batteries, population and paid treasury. Retire the `fight()` fixture or label it. A figure that is not from the played city is labelled wherever it is printed and wherever it is recorded.
- [ ] 6. Then the tests. For every assertion this task adds or changes: delete or invert the behaviour it names, run it, confirm it fails, restore. Write in the closeout which behaviours were removed to prove which assertions. An assertion nobody has watched fail is an assertion nobody has tested, and four of them are in the repository right now.
- [ ] 7. Fix `src/sim/playthrough.ts` line 92 rather than working around it, and build the policy it was supposed to drive: zone in response to a reported shortage, inside the loop, logging what was built and why. It has been reported built twice.
- [ ] 8. Then services, the single trade formula, and the district alert. The alert has been closed on three Done tasks without existing; do not close a fourth unless `grep -rn alert src` returns it.
- [ ] 9. Copy no quantity the simulation defines. Three copies of the building price exist today; import instead, in the harness and the tests as well as the app.
- [ ] 10. Add nothing. Every item here is a composition that was not checked, a figure that was not reported, or work already agreed. A new mechanic anywhere in this chain is a sign of drift -- the single borderline lever, a partly staffed battery firing at reduced damage, is offered in the defence slice and is not required.
- [ ] 11. Run `npm run ci`, `npm run test:e2e`, `npm run balance` and `npm run perf -- --wave` locally on the branch as committed.
- [ ] 12. Quote the final `npm run balance` line verbatim in the closeout, beside the before line, and check each acceptance criterion's target against it. A criterion whose number is not in that line is not closed.
- [ ] 13. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. Name in the closeout any criterion from an earlier pass that this one found unmet.
- [ ] 14. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_095_a_defence_that_can_actually_be_fielded_and_a_city_that_grows_enough_to_staff_it`
- `item_096_a_harness_that_reports_the_city_it_played`
- `item_097_checks_that_have_been_watched_failing`
- `item_098_services_one_trade_formula_and_the_alert_that_has_been_closed_three_times`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_095_a_defence_that_can_actually_be_fielded_and_a_city_that_grows_enough_to_staff_it`. Proof deferred to slice closeout.
- request-AC2 -> `item_095_a_defence_that_can_actually_be_fielded_and_a_city_that_grows_enough_to_staff_it`. Proof deferred to slice closeout.
- request-AC3 -> `item_095_a_defence_that_can_actually_be_fielded_and_a_city_that_grows_enough_to_staff_it`. Proof deferred to slice closeout.
- request-AC4 -> `item_096_a_harness_that_reports_the_city_it_played`. Proof deferred to slice closeout.
- request-AC8 -> `item_096_a_harness_that_reports_the_city_it_played`. Proof deferred to slice closeout.
- request-AC9 -> `item_096_a_harness_that_reports_the_city_it_played`. Proof deferred to slice closeout.
- request-AC11 -> `item_096_a_harness_that_reports_the_city_it_played`. Proof deferred to slice closeout.
- request-AC5 -> `item_097_checks_that_have_been_watched_failing`. Proof deferred to slice closeout.
- request-AC6 -> `item_097_checks_that_have_been_watched_failing`. Proof deferred to slice closeout.
- request-AC7 -> `item_098_services_one_trade_formula_and_the_alert_that_has_been_closed_three_times`. Proof deferred to slice closeout.
- request-AC8 -> `item_098_services_one_trade_formula_and_the_alert_that_has_been_closed_three_times`. Proof deferred to slice closeout.
- request-AC10 -> `item_098_services_one_trade_formula_and_the_alert_that_has_been_closed_three_times`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_034_a_first_wave_a_city_can_answer_a_defence_that_can_be_fielded_a_harness_that_reports_the_city_it_played_and_checks_that_fail`
- Product brief(s): `prod_025_a_first_wave_a_city_can_answer`
- Architecture decision(s): (none yet)
