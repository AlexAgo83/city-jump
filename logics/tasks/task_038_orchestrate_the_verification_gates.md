## task_038_orchestrate_the_verification_gates - Orchestrate the verification gates
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 85%
> Progress: 90%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-09-03 13:14:27

# AI Context
- Summary: Make each harness able to fail before trusting what it says, then fix what it reports -- in that order, so no gate lands red on main.
- Keywords: exit code, balance seed, clean baseline, version gate, concurrency, clean clone
- Use when: implementing req_036.
- Skip when: the work is a code defect rather than the gate that would have caught it.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Wave 1: give run-scenarios.mjs an exit code and the version check its script, but do not wire scenarios into ci yet.
- [ ] 2. Wave 2: read what the scenario harness now says; land req_035 item_102 and re-run before touching any tuning value.
- [ ] 3. Wave 3: close whatever unbounded spend the -778058 seed exposes, then bring the band back and wire scenarios into ci.
- [ ] 4. Wave 4: the dirty-tree guard, a clean perf baseline for HEAD, and the union merge driver.
- [ ] 5. Wave 5: the CI trigger, concurrency, devDependency and timeouts, verified from a fresh clone.
- [ ] 6. Do not merge a gate that is red on main: a permanently failing gate is not a gate.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_108_let_the_scenario_harness_exit_non_zero`
- `item_109_bring_the_first_run_back_inside_its_declared_band`
- `item_110_refuse_a_performance_measurement_from_a_dirty_tree`
- `item_111_fail_the_gate_when_a_shipped_document_misstates_the_version`
- `item_112_run_the_ci_gate_once_per_push_and_from_a_clean_clone`
- `item_132_stop_a_city_with_no_utilities_dying_outright`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_108_let_the_scenario_harness_exit_non_zero`. Proof deferred to slice closeout.
- request-AC2 -> `item_109_bring_the_first_run_back_inside_its_declared_band`. Proof deferred to slice closeout.
- request-AC3 -> `item_110_refuse_a_performance_measurement_from_a_dirty_tree`. Proof deferred to slice closeout.
- request-AC4 -> `item_110_refuse_a_performance_measurement_from_a_dirty_tree`. Proof deferred to slice closeout.
- request-AC5 -> `item_111_fail_the_gate_when_a_shipped_document_misstates_the_version`. Proof deferred to slice closeout.
- request-AC6 -> `item_112_run_the_ci_gate_once_per_push_and_from_a_clean_clone`. Proof deferred to slice closeout.
- request-AC7 -> `item_112_run_the_ci_gate_once_per_push_and_from_a_clean_clone`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_036_make_the_verification_gates_able_to_fail`
- Product brief(s): `prod_027_evidence_that_stops_the_build`
- Architecture decision(s): (none yet)

# Notes
- Arbitration for the runner. May decide alone: (1) the order of item_108 -- make the harness able to fail, read what it says, fix the cause, and only then add it to the ci script; a gate that is red on main is not a gate. (2) Which of item_109's two directions to attack first, since wave 1 sits at the floor and wave 2 over the ceiling and one constant will not move both. Reserved for the owner: (a) changing the target band itself, which decides how hard a first run should be; (b) item_132 AC1, whether a city that never builds power and water is meant to end with nobody in it. Both are product taste, not measurement.
