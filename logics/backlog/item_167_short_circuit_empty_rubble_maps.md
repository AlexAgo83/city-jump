## item_167_short_circuit_empty_rubble_maps - Short circuit empty rubble maps
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Short-circuit Rubble.blocks when its map is empty, instead of walking parcel cells and building keys every gameplay frame.
- Keywords: short, circuit, empty, rubble, maps
- Use when: changing rubble blocking checks or the per-frame parcel loop that calls them.
- Skip when: changing rubble expiry or how rubble is created.

# Problem
- src/app/app.ts:358 calls Rubble.blocks for every non-rebuilding parcel each gameplay frame.
- src/sim/rubble.ts:26 walks every parcel cell and builds coordinate keys even when its own map holds nothing.
- The CPU trace attributes about 0.73 s of an 8.70 s sample to this path; a temporary in-browser guard moved the median from 78.1 to 88.4 FPS over three alternating fresh-load pairs.

# Scope
- In:
  - an empty-map short circuit in the shared Rubble.blocks method
  - a focused check covering both the empty and nonempty paths
- Out:
  - changing blocking semantics for a nonempty rubble map
  - the per-frame parcel loop structure in src/app/app.ts

# Acceptance criteria
- AC2: Empty rubble maps short-circuit without cell traversal, while nonempty maps preserve blocking behaviour.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: Empty rubble maps short-circuit without cell traversal, while nonempty maps preserve blocking behaviour.

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
- Priority: High
- Rationale: Best effort-to-gain ratio in the review: a one-method guard, paired 9.6-14.2% FPS improvement already demonstrated.

# Notes
- Hybrid rationale: Derived from request `req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits.md`.
- Generated locally by logics-manager.

# Tasks
- `task_047_land_the_large_city_frame_cost_reductions_in_measured_order`
