## item_171_skip_replacing_empty_explosion_buffers - Skip replacing empty explosion buffers
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
- Summary: Skip replacing the explosion thin-instance buffer when the explosion set is empty and unchanged, while still clearing the last expired explosion once.
- Keywords: skip, replacing, empty, explosion, buffers
- Use when: changing destruction effect instancing or its per-frame write.
- Skip when: changing explosion visuals or lifetimes.

# Problem
- src/render/destructionEffects.ts:91 calls writeExplosionMatrices whenever the feature is enabled, even with no explosion present.
- Line 46 filters an empty list, allocates a zero-length matrix array and replaces the thin-instance buffer.
- Twelve-second observations counted 949 calls at x1 and 927 at x4 with zero payload, for 36.4/29.7 ms of total method time.

# Scope
- In:
  - skipping the buffer write for unchanged empty state
  - still clearing the final expired explosion exactly once
- Out:
  - explosion appearance, lifetime or spawning

# Acceptance criteria
- AC6: An empty explosion set does not replace the thin-instance buffer, while the last expired explosion is still cleared exactly once.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: An empty explosion set does not replace the thin-instance buffer, while the last expired explosion is still cleared exactly once.

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
- Priority: Low
- Rationale: Only 29.7-36.4 ms of method time over twelve seconds; a cleanup, ranked last deliberately.

# Notes
- Hybrid rationale: Derived from request `req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits.md`.
- Generated locally by logics-manager.

# Tasks
- `task_047_land_the_large_city_frame_cost_reductions_in_measured_order`
