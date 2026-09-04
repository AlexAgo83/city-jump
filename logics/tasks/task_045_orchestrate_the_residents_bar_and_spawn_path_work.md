## task_045_orchestrate_the_residents_bar_and_spawn_path_work - Orchestrate the residents bar and spawn path work
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex
> Indicators reviewed: 2026-09-04 22:23:14

# AI Context
- Summary: Four slices, opening with a confirmation: show the operator that a factor of 1000 drops the gate from six waves per seed to one and roughly quadruples the wave-1 threat, then build the rule, keep the gate honest, widen the landing edges, and settle two loose ends.
- Keywords: operator confirmation, residents bar rule, scenario gate factor, landing edges, unused constant, tick drain
- Use when: implementing the residents bar and the spawn-path findings, in the order the plan sets.
- Skip when: building the rule before the two consequences of 1000 have been put to the operator.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Show the operator the two consequences of a factor of 1000 before building anything: the gate drops from six waves per seed to one, and the wave-1 threat roughly quadruples because waveThreat reads population. Confirm 1000 is still wanted with those on the table.
- [x] 2. Then the rule itself: a RunRules field defaulting to 1000, validated in readRun, threaded into sim as a parameter, surfaced in the Gameplay row. No module state.
- [x] 3. Then the gate: pin the harness's own factor where the harness sets it, update the recorded reason in wave.ts, and re-measure the band once -- together with req_042's battery range if that has landed, so the two are not measured separately.
- [x] 4. Then the landing edges, which are independent of all of the above and cheap.
- [x] 5. Close with the two loose ends: the unused constant and the drain the return type cannot report.
- [x] 6. Verify with npm run ci, and npm run scenarios as the band evidence rather than as a pass or fail.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_158_make_the_residents_bar_a_run_rule_defaulting_to_1000`
- `item_159_keep_the_scenario_gate_measuring_six_waves_once_the_bar_moves`
- `item_160_let_a_kaiju_land_on_any_edge_of_the_map`
- `item_161_settle_the_two_loose_ends_in_the_assault_code`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_158_make_the_residents_bar_a_run_rule_defaulting_to_1000`. Proof deferred to slice closeout.
- request-AC2 -> `item_158_make_the_residents_bar_a_run_rule_defaulting_to_1000`. Proof deferred to slice closeout.
- request-AC3 -> `item_158_make_the_residents_bar_a_run_rule_defaulting_to_1000`. Proof deferred to slice closeout.
- request-AC4 -> `item_159_keep_the_scenario_gate_measuring_six_waves_once_the_bar_moves`. Proof deferred to slice closeout.
- request-AC8 -> `item_159_keep_the_scenario_gate_measuring_six_waves_once_the_bar_moves`. Proof deferred to slice closeout.
- request-AC5 -> `item_160_let_a_kaiju_land_on_any_edge_of_the_map`. Proof deferred to slice closeout.
- request-AC6 -> `item_161_settle_the_two_loose_ends_in_the_assault_code`. Proof deferred to slice closeout.
- request-AC7 -> `item_161_settle_the_two_loose_ends_in_the_assault_code`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)
- Targeted Playwright proved residents/wave default, live banner update, autosave and reload; traffic regression test covers removed junction exit segments.
- command: `rtk npm run ci` | result: passed | date: 2026-09-04
- Finish workflow executed on 2026-09-04.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-09-04.
- Linked backlog item(s): `item_158_make_the_residents_bar_a_run_rule_defaulting_to_1000`, `item_159_keep_the_scenario_gate_measuring_six_waves_once_the_bar_moves`, `item_160_let_a_kaiju_land_on_any_edge_of_the_map`, `item_161_settle_the_two_loose_ends_in_the_assault_code`
- Related request(s): `req_043_let_the_player_set_the_bar_a_kaiju_comes_for_and_fix_what_reading_the_spawn_path_turned_up`

# Links
- Request: `req_043_let_the_player_set_the_bar_a_kaiju_comes_for_and_fix_what_reading_the_spawn_path_turned_up`
- Product brief(s): `prod_034_a_wave_the_player_sets_the_terms_of`
- Architecture decision(s): (none yet)
