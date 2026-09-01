## task_035_make_the_evidence_real_bring_the_economy_back_in_range_and_build_the_four_criteria_that_were_signed_off_empty - Make the evidence real, bring the economy back in range, and build the four criteria that were signed off empty
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 15:38:09
> Owner: codex

# AI Context
- Summary: The executable surface of `req_033`: the harness first and completely, then the economy, then the military road, then the four unbuilt criteria.
- Keywords: evidence, real, bring, economy, back, range, build, four, criteria, were, signed, off, empty
- Use when: Implementing or reviewing the correction pass on milestone 9.0.
- Skip when: You need a milestone 9.0 slice's own design rather than what it left behind.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Read this request and its four slices, then read `adr_005_one_harness_drives_the_real_simulation_and_no_test_shortcuts_a_player_decision` -- including the clarification added after this review, that extending the harness means keeping the measurements it already takes. 'Extend' was read as 'replace', and that is how a real measurement was lost.
- [x] 2. Recover before rewriting: `git show a437609 -- scripts/balance.mjs` is the deleted fight harness in full, and it worked. Start there rather than from a blank file.
- [x] 3. Take the harness slice first and completely. Everything after it is checked through the harness, and a harness that stipulates its own answer cannot check anything -- which is the whole reason this request exists.
- [x] 4. Prove each replaced assertion by removing the behaviour it names and watching it fail. An assertion nobody has seen fail is an assertion nobody has tested.
- [x] 5. Then the economy, with the treasury figure the harness now reports in front of you. The numbers are stated in the slice, and reversing one is a line -- drifting because nobody was looking is what this is correcting.
- [x] 6. Then the military road, which is small and is what makes the military measurement absurd. Check that a city built around a military road can still defend itself: that is the intended way to defend and it must survive the fix.
- [x] 7. Then the four unbuilt criteria, and name them in the closeout. A criterion reported met that was not is worth saying out loud; a silent re-pass teaches nothing and is how this happened.
- [x] 8. Add nothing. Every item here is a measurement that stopped existing, a correction that went past its target, or work that was already agreed -- a new mechanic anywhere in this chain is a sign of drift.
- [x] 9. Run `npm run ci`, `npm run test:e2e`, `npm run balance` and `npm run perf` locally, and check that `npm run balance` on a clean checkout reproduces the combat-duration figure this request restores.
- [x] 10. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. The criteria this request finds unmet on closed tasks belong in the closeout by name, and `task_031`'s empty Report is repaired rather than left.
- [x] 11. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_091_a_harness_that_fights_the_wave_it_reports_on`
- `item_092_an_economy_back_inside_the_range_it_was_aimed_at`
- `item_093_a_military_road_is_not_unlimited_free_firepower`
- `item_094_the_four_criteria_that_were_closed_without_being_built`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in working tree: restored npm run balance fight evidence (combat 25.5s, salvos 7.0, treasury reported), made playFirstRun derive/apply wave losses, restored trade/industry income and per-kind build prices, removed materials from resources/save output/ledger/prestige, limited military-road parcels and staffed batteries, added district-dark alert, added npm run perf -- --wave evidence (wave 48ms), aligned needs gauges to construction demand, and removed empty prestige branches. Validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave. Source: `working-tree`
- request-AC2 -> This task. Proof: Implemented in working tree: restored npm run balance fight evidence (combat 25.5s, salvos 7.0, treasury reported), made playFirstRun derive/apply wave losses, restored trade/industry income and per-kind build prices, removed materials from resources/save output/ledger/prestige, limited military-road parcels and staffed batteries, added district-dark alert, added npm run perf -- --wave evidence (wave 48ms), aligned needs gauges to construction demand, and removed empty prestige branches. Validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave. Source: `working-tree`
- request-AC3 -> This task. Proof: Implemented in working tree: restored npm run balance fight evidence (combat 25.5s, salvos 7.0, treasury reported), made playFirstRun derive/apply wave losses, restored trade/industry income and per-kind build prices, removed materials from resources/save output/ledger/prestige, limited military-road parcels and staffed batteries, added district-dark alert, added npm run perf -- --wave evidence (wave 48ms), aligned needs gauges to construction demand, and removed empty prestige branches. Validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave. Source: `working-tree`
- request-AC4 -> This task. Proof: Implemented in working tree: restored npm run balance fight evidence (combat 25.5s, salvos 7.0, treasury reported), made playFirstRun derive/apply wave losses, restored trade/industry income and per-kind build prices, removed materials from resources/save output/ledger/prestige, limited military-road parcels and staffed batteries, added district-dark alert, added npm run perf -- --wave evidence (wave 48ms), aligned needs gauges to construction demand, and removed empty prestige branches. Validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave. Source: `working-tree`
- request-AC5 -> This task. Proof: Implemented in working tree: restored npm run balance fight evidence (combat 25.5s, salvos 7.0, treasury reported), made playFirstRun derive/apply wave losses, restored trade/industry income and per-kind build prices, removed materials from resources/save output/ledger/prestige, limited military-road parcels and staffed batteries, added district-dark alert, added npm run perf -- --wave evidence (wave 48ms), aligned needs gauges to construction demand, and removed empty prestige branches. Validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave. Source: `working-tree`
- request-AC11 -> This task. Proof: Implemented in working tree: restored npm run balance fight evidence (combat 25.5s, salvos 7.0, treasury reported), made playFirstRun derive/apply wave losses, restored trade/industry income and per-kind build prices, removed materials from resources/save output/ledger/prestige, limited military-road parcels and staffed batteries, added district-dark alert, added npm run perf -- --wave evidence (wave 48ms), aligned needs gauges to construction demand, and removed empty prestige branches. Validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave. Source: `working-tree`
- request-AC6 -> This task. Proof: Implemented in working tree: restored npm run balance fight evidence (combat 25.5s, salvos 7.0, treasury reported), made playFirstRun derive/apply wave losses, restored trade/industry income and per-kind build prices, removed materials from resources/save output/ledger/prestige, limited military-road parcels and staffed batteries, added district-dark alert, added npm run perf -- --wave evidence (wave 48ms), aligned needs gauges to construction demand, and removed empty prestige branches. Validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave. Source: `working-tree`
- request-AC7 -> This task. Proof: Implemented in working tree: restored npm run balance fight evidence (combat 25.5s, salvos 7.0, treasury reported), made playFirstRun derive/apply wave losses, restored trade/industry income and per-kind build prices, removed materials from resources/save output/ledger/prestige, limited military-road parcels and staffed batteries, added district-dark alert, added npm run perf -- --wave evidence (wave 48ms), aligned needs gauges to construction demand, and removed empty prestige branches. Validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave. Source: `working-tree`
- request-AC8 -> This task. Proof: Implemented in working tree: restored npm run balance fight evidence (combat 25.5s, salvos 7.0, treasury reported), made playFirstRun derive/apply wave losses, restored trade/industry income and per-kind build prices, removed materials from resources/save output/ledger/prestige, limited military-road parcels and staffed batteries, added district-dark alert, added npm run perf -- --wave evidence (wave 48ms), aligned needs gauges to construction demand, and removed empty prestige branches. Validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave. Source: `working-tree`
- request-AC9 -> This task. Proof: Implemented in working tree: restored npm run balance fight evidence (combat 25.5s, salvos 7.0, treasury reported), made playFirstRun derive/apply wave losses, restored trade/industry income and per-kind build prices, removed materials from resources/save output/ledger/prestige, limited military-road parcels and staffed batteries, added district-dark alert, added npm run perf -- --wave evidence (wave 48ms), aligned needs gauges to construction demand, and removed empty prestige branches. Validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave. Source: `working-tree`
- request-AC10 -> This task. Proof: Implemented in working tree: restored npm run balance fight evidence (combat 25.5s, salvos 7.0, treasury reported), made playFirstRun derive/apply wave losses, restored trade/industry income and per-kind build prices, removed materials from resources/save output/ledger/prestige, limited military-road parcels and staffed batteries, added district-dark alert, added npm run perf -- --wave evidence (wave 48ms), aligned needs gauges to construction demand, and removed empty prestige branches. Validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave. Source: `working-tree`
- request-AC11 -> This task. Proof: Implemented in working tree: restored npm run balance fight evidence (combat 25.5s, salvos 7.0, treasury reported), made playFirstRun derive/apply wave losses, restored trade/industry income and per-kind build prices, removed materials from resources/save output/ledger/prestige, limited military-road parcels and staffed batteries, added district-dark alert, added npm run perf -- --wave evidence (wave 48ms), aligned needs gauges to construction demand, and removed empty prestige branches. Validated with npm run ci, npm run test:e2e, npm run balance, npm run perf -- --wave. Source: `working-tree`

# Validation
- (no validation recorded yet)
- command: `npm run ci && npm run test:e2e && npm run balance && npm run perf -- --wave` | result: passed | date: 2026-09-01
- Finish workflow executed on 2026-09-01.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-09-01.
- Linked backlog item(s): `item_091_a_harness_that_fights_the_wave_it_reports_on`, `item_092_an_economy_back_inside_the_range_it_was_aimed_at`, `item_093_a_military_road_is_not_unlimited_free_firepower`, `item_094_the_four_criteria_that_were_closed_without_being_built`
- Related request(s): `req_033_evidence_that_can_fail_a_harness_that_fights_an_economy_the_corrections_overshot_and_four_criteria_closed_without_being_built`

# Links
- Request: `req_033_evidence_that_can_fail_a_harness_that_fights_an_economy_the_corrections_overshot_and_four_criteria_closed_without_being_built`
- Product brief(s): `prod_024_evidence_that_can_fail`
- Architecture decision(s): (none yet)
