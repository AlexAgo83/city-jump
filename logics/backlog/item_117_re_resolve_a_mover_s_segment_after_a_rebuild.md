## item_117_re_resolve_a_mover_s_segment_after_a_rebuild - Re-resolve a mover's segment after a rebuild
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 15:41:32

# AI Context
- Summary: Positions come from graph.pointAt so they stay correct, which is why a stale segment object surfaces as movers overshooting limitOf rather than as a visible jump.
- Keywords: traffic rebuild, mover retention, stale segment, resampled length, limitOf
- Use when: touching what traffic keeps across a rebuild.
- Skip when: changing which movers are retained, or limitOf itself.

# Problem
- rebuild (src/render/traffic.ts:1326) keeps movers whose segment id still exists, but mover.segment remains the pre-rebuild object, so its length and samples can disagree with the resampled segment. Positions come from graph.pointAt so they stay correct, which is why this surfaces as movers overshooting limitOf rather than as a visible jump.

# Scope
- In:
  - Re-resolve mover.segment from the graph in the retention loop.
  - A test that a mover kept across a rebuild reads the resampled length.
- Out:
  - Changing which movers are retained across a rebuild.
  - Changing limitOf.

# Acceptance criteria
- AC1: A mover kept across a rebuild reads the current segment object.
- AC2: No mover exceeds its segment limit after a rebuild that changed sampling.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: A mover kept across a rebuild reads the current segment object.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_028_a_city_that_costs_what_it_is_changing`
- Architecture decision(s): (none yet)
- Request: `req_037_stop_paying_every_frame_for_a_city_that_is_not_changing`
- Primary task(s): `task_039_orchestrate_the_per_frame_cost_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- 2026-09-03 wave: `traffic.rebuild(dirty)` now rebinds retained movers to `graph.segment(mover.segment.id)` before keeping them.
- Validation proof: `rtk npx vitest run src/render/traffic.test.ts` and `npm run typecheck` passed; the new traffic test swaps the graph segment object under the same id and verifies the retained vehicle exposes the replacement segment.
- Task `task_039_orchestrate_the_per_frame_cost_work` was finished via `logics-manager flow finish task` on 2026-09-03.

# Tasks
- `task_039_orchestrate_the_per_frame_cost_work`
