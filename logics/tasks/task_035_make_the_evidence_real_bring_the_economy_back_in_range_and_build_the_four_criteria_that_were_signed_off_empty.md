## task_035_make_the_evidence_real_bring_the_economy_back_in_range_and_build_the_four_criteria_that_were_signed_off_empty - Make the evidence real, bring the economy back in range, and build the four criteria that were signed off empty
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 15:19:50

# AI Context
- Summary: The executable surface of `req_033`: the harness first and completely, then the economy, then the military road, then the four unbuilt criteria.
- Keywords: evidence, real, bring, economy, back, range, build, four, criteria, were, signed, off, empty
- Use when: Implementing or reviewing the correction pass on milestone 9.0.
- Skip when: You need a milestone 9.0 slice's own design rather than what it left behind.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Read this request and its four slices, then read `adr_005_one_harness_drives_the_real_simulation_and_no_test_shortcuts_a_player_decision` -- including the clarification added after this review, that extending the harness means keeping the measurements it already takes. 'Extend' was read as 'replace', and that is how a real measurement was lost.
- [ ] 2. Recover before rewriting: `git show a437609 -- scripts/balance.mjs` is the deleted fight harness in full, and it worked. Start there rather than from a blank file.
- [ ] 3. Take the harness slice first and completely. Everything after it is checked through the harness, and a harness that stipulates its own answer cannot check anything -- which is the whole reason this request exists.
- [ ] 4. Prove each replaced assertion by removing the behaviour it names and watching it fail. An assertion nobody has seen fail is an assertion nobody has tested.
- [ ] 5. Then the economy, with the treasury figure the harness now reports in front of you. The numbers are stated in the slice, and reversing one is a line -- drifting because nobody was looking is what this is correcting.
- [ ] 6. Then the military road, which is small and is what makes the military measurement absurd. Check that a city built around a military road can still defend itself: that is the intended way to defend and it must survive the fix.
- [ ] 7. Then the four unbuilt criteria, and name them in the closeout. A criterion reported met that was not is worth saying out loud; a silent re-pass teaches nothing and is how this happened.
- [ ] 8. Add nothing. Every item here is a measurement that stopped existing, a correction that went past its target, or work that was already agreed -- a new mechanic anywhere in this chain is a sign of drift.
- [ ] 9. Run `npm run ci`, `npm run test:e2e`, `npm run balance` and `npm run perf` locally, and check that `npm run balance` on a clean checkout reproduces the combat-duration figure this request restores.
- [ ] 10. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. The criteria this request finds unmet on closed tasks belong in the closeout by name, and `task_031`'s empty Report is repaired rather than left.
- [ ] 11. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_091_a_harness_that_fights_the_wave_it_reports_on`
- `item_092_an_economy_back_inside_the_range_it_was_aimed_at`
- `item_093_a_military_road_is_not_unlimited_free_firepower`
- `item_094_the_four_criteria_that_were_closed_without_being_built`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_091_a_harness_that_fights_the_wave_it_reports_on`. Proof deferred to slice closeout.
- request-AC2 -> `item_091_a_harness_that_fights_the_wave_it_reports_on`. Proof deferred to slice closeout.
- request-AC3 -> `item_091_a_harness_that_fights_the_wave_it_reports_on`. Proof deferred to slice closeout.
- request-AC4 -> `item_091_a_harness_that_fights_the_wave_it_reports_on`. Proof deferred to slice closeout.
- request-AC5 -> `item_091_a_harness_that_fights_the_wave_it_reports_on`. Proof deferred to slice closeout.
- request-AC11 -> `item_091_a_harness_that_fights_the_wave_it_reports_on`. Proof deferred to slice closeout.
- request-AC6 -> `item_092_an_economy_back_inside_the_range_it_was_aimed_at`. Proof deferred to slice closeout.
- request-AC7 -> `item_092_an_economy_back_inside_the_range_it_was_aimed_at`. Proof deferred to slice closeout.
- request-AC8 -> `item_093_a_military_road_is_not_unlimited_free_firepower`. Proof deferred to slice closeout.
- request-AC9 -> `item_093_a_military_road_is_not_unlimited_free_firepower`. Proof deferred to slice closeout.
- request-AC10 -> `item_094_the_four_criteria_that_were_closed_without_being_built`. Proof deferred to slice closeout.
- request-AC11 -> `item_094_the_four_criteria_that_were_closed_without_being_built`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_033_evidence_that_can_fail_a_harness_that_fights_an_economy_the_corrections_overshot_and_four_criteria_closed_without_being_built`
- Product brief(s): `prod_024_evidence_that_can_fail`
- Architecture decision(s): (none yet)
