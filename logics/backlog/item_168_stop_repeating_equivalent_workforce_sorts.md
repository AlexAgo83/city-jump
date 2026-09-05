## item_168_stop_repeating_equivalent_workforce_sorts - Stop repeating equivalent workforce sorts
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Cache workforce allocations when their inputs have not changed, instead of sorting jobs three times per gameplay frame.
- Keywords: repeating, equivalent, workforce, sorts
- Use when: changing workforce allocation, building lifecycle staffing, or battery parcel derivation.
- Skip when: changing job supply or demand rules themselves.

# Problem
- src/sim/buildingLifecycle.ts:77 derives staffing even within the existing population band.
- src/sim/buildingKinds.ts:52 allocates again, and its batteriesForParcels call allocates a third time.
- src/sim/workforce.ts:47 sorts jobs on every invocation: 2,939 matching sorts over 979 frames, about 1.55 ms/frame, with lifecycle synchronization at 2.12 ms/frame inclusive.

# Scope
- In:
  - caching policy-specific allocations keyed on unchanged inputs
  - sharing the identical panel allocations between call sites
- Out:
  - merging the distinct staffing policies, which are not interchangeable
  - changing lifecycle population hysteresis, incumbent staffing, construction or wave semantics

# Acceptance criteria
- AC3: Unchanged workforce inputs do not repeat equivalent allocation sorts; policy-specific staffing semantics, population hysteresis and incumbent staffing remain covered by tests.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC3: Unchanged workforce inputs do not repeat equivalent allocation sorts; policy-specific staffing semantics, population hysteresis and incumbent staffing remain covered by tests.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: About 1.55 ms/frame measured, but the three call sites carry different staffing policies that must not be merged carelessly.

# Notes
- Hybrid rationale: Derived from request `req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits.md`.
- Generated locally by logics-manager.

# Tasks
- `task_047_land_the_large_city_frame_cost_reductions_in_measured_order`
