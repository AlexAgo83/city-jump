## task_038_orchestrate_the_verification_gates - Orchestrate the verification gates
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-09-03 15:42:22

# AI Context
- Summary: Make each harness able to fail before trusting what it says, then fix what it reports -- in that order, so no gate lands red on main.
- Keywords: exit code, balance seed, clean baseline, version gate, concurrency, clean clone
- Use when: implementing req_036.
- Skip when: the work is a code defect rather than the gate that would have caught it.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Wave 1: give run-scenarios.mjs an exit code and the version check its script, but do not wire scenarios into ci yet.
- [x] 2. Wave 2: read what the scenario harness now says; land req_035 item_102 and re-run before touching any tuning value.
- [x] 3. Wave 3: close whatever unbounded spend the -778058 seed exposes, then bring the band back and wire scenarios into ci.
- [x] 4. Wave 4: the dirty-tree guard, a clean perf baseline for HEAD, and the union merge driver.
- [x] 5. Wave 5: the CI trigger, concurrency, devDependency and timeouts, verified from a fresh clone.
- [x] 6. Do not merge a gate that is red on main: a permanently failing gate is not a gate.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_108_let_the_scenario_harness_exit_non_zero`
- `item_109_bring_the_first_run_back_inside_its_declared_band`
- `item_110_refuse_a_performance_measurement_from_a_dirty_tree`
- `item_111_fail_the_gate_when_a_shipped_document_misstates_the_version`
- `item_112_run_the_ci_gate_once_per_push_and_from_a_clean_clone`
- `item_132_stop_a_city_with_no_utilities_dying_outright`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented by task_038 commits cf61916, a2477c1, 363a79c, ba8bd5b, 6023f5d, and supported by post-frame-cost perf evidence 6255a43. Validated with rtk npm run ci, dirty perf/balance guard checks, npm run perf clean rows, and a clean clone npm ci && npm run ci. Source: `6255a43`
- request-AC2 -> This task. Proof: Implemented by task_038 commits cf61916, a2477c1, 363a79c, ba8bd5b, 6023f5d, and supported by post-frame-cost perf evidence 6255a43. Validated with rtk npm run ci, dirty perf/balance guard checks, npm run perf clean rows, and a clean clone npm ci && npm run ci. Source: `6255a43`
- request-AC3 -> This task. Proof: Implemented by task_038 commits cf61916, a2477c1, 363a79c, ba8bd5b, 6023f5d, and supported by post-frame-cost perf evidence 6255a43. Validated with rtk npm run ci, dirty perf/balance guard checks, npm run perf clean rows, and a clean clone npm ci && npm run ci. Source: `6255a43`
- request-AC4 -> This task. Proof: Implemented by task_038 commits cf61916, a2477c1, 363a79c, ba8bd5b, 6023f5d, and supported by post-frame-cost perf evidence 6255a43. Validated with rtk npm run ci, dirty perf/balance guard checks, npm run perf clean rows, and a clean clone npm ci && npm run ci. Source: `6255a43`
- request-AC5 -> This task. Proof: Implemented by task_038 commits cf61916, a2477c1, 363a79c, ba8bd5b, 6023f5d, and supported by post-frame-cost perf evidence 6255a43. Validated with rtk npm run ci, dirty perf/balance guard checks, npm run perf clean rows, and a clean clone npm ci && npm run ci. Source: `6255a43`
- request-AC6 -> This task. Proof: Implemented by task_038 commits cf61916, a2477c1, 363a79c, ba8bd5b, 6023f5d, and supported by post-frame-cost perf evidence 6255a43. Validated with rtk npm run ci, dirty perf/balance guard checks, npm run perf clean rows, and a clean clone npm ci && npm run ci. Source: `6255a43`
- request-AC7 -> This task. Proof: Implemented by task_038 commits cf61916, a2477c1, 363a79c, ba8bd5b, 6023f5d, and supported by post-frame-cost perf evidence 6255a43. Validated with rtk npm run ci, dirty perf/balance guard checks, npm run perf clean rows, and a clean clone npm ci && npm run ci. Source: `6255a43`

# Validation
- (no validation recorded yet)
- command: `rtk npm run ci; npm run perf; clean clone npm ci && npm run ci` | result: passed | date: 2026-09-03
- Finish workflow executed on 2026-09-03.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-09-03.
- Linked backlog item(s): `item_108_let_the_scenario_harness_exit_non_zero`, `item_109_bring_the_first_run_back_inside_its_declared_band`, `item_110_refuse_a_performance_measurement_from_a_dirty_tree`, `item_111_fail_the_gate_when_a_shipped_document_misstates_the_version`, `item_112_run_the_ci_gate_once_per_push_and_from_a_clean_clone`, `item_132_stop_a_city_with_no_utilities_dying_outright`
- Related request(s): `req_036_make_the_verification_gates_able_to_fail`

# Links
- Request: `req_036_make_the_verification_gates_able_to_fail`
- Product brief(s): `prod_027_evidence_that_stops_the_build`
- Architecture decision(s): (none yet)

# Notes
- Arbitration for the runner. May decide alone: (1) the order of item_108 -- make the harness able to fail, read what it says, fix the cause, and only then add it to the ci script; a gate that is red on main is not a gate. (2) Which of item_109's two directions to attack first, since wave 1 sits at the floor and wave 2 over the ceiling and one constant will not move both. Reserved for the owner: (a) changing the target band itself, which decides how hard a first run should be; (b) item_132 AC1, whether a city that never builds power and water is meant to end with nobody in it. Both are product taste, not measurement.
