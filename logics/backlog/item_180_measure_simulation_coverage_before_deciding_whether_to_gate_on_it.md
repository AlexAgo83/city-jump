## item_180_measure_simulation_coverage_before_deciding_whether_to_gate_on_it - Measure simulation coverage before deciding whether to gate on it
> From version: 0.5.1
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 13:58:42

# AI Context
- Summary: No coverage tooling exists, so the gaps this review found by hand are invisible; a percentage is only meaningful over the pure simulation layer.
- Keywords: coverage, vitest provider, src/sim, threshold, gating decision
- Use when: deciding whether and where to gate on coverage.
- Skip when: raising a number by writing tests that hold no behaviour, or requiring coverage over render, ui or app.

# Problem
- `@vitest/coverage-v8` is absent and `npm run ci` carries no coverage threshold, so the gaps this review found were invisible until read by hand.
- A repository-wide percentage would be actively harmful: executing a Babylon line in `src/render/` is not evidence a mesh is right, which is why `test:visual` and `test:e2e` exist separately.
- A threshold chosen before the measurement is either inert or an immediate block.

# Scope
- In:
  - Add the coverage provider and record a measured coverage figure for `src/sim/` after the traffic and save items land.
  - Take and write down the decision on gating, with the number it was taken against.
  - If gated: scope the threshold to `src/sim/` and set it no higher than the measured level.
- Out:
  - Any coverage requirement over `src/render/`, `src/ui/` or `src/app/`.
  - Writing tests to raise a number rather than to hold a behaviour.
  - Publishing coverage to an external service.

# Acceptance criteria
- AC1: A coverage run over `src/sim/` completes and its figure is recorded in the task evidence.
- AC2: The gating decision is written down with the measured number as its basis.
- AC3: If a threshold is added, `npm run ci` passes with it on the first attempt, and it is scoped to `src/sim/`.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: A coverage run over `src/sim/` completes and its figure is recorded in the task evidence.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_038_a_repository_that_keeps_its_own_rules_without_being_reminded`
- Architecture decision(s): (none yet)
- Request: `req_051_review_findings_a_save_the_parser_refuses_sim_seams_no_test_reaches_and_gates_kept_by_hand`
- Primary task(s): `task_053_orchestrate_the_0_5_1_review_findings`

# Priority
- Priority: Medium
- Rationale: Sequenced after item_177 and item_178, which change the number it would measure. Medium and deliberately decision-first: a threshold chosen before the measurement is either inert or an immediate block.
