## item_169_defer_hidden_overlay_geometry_until_reveal - Defer hidden overlay geometry until reveal
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Defer zone and utility overlay geometry while hidden, and realize it on reveal, instead of rebuilding it during every dirty rebuild.
- Keywords: defer, hidden, overlay, geometry, until, reveal
- Use when: changing overlay invalidation, zone or utility rendering, or dirty rebuild scope.
- Skip when: changing what the overlays display once visible.

# Problem
- src/app/app.ts:186 and line 192 rebuild the entire zone and utility overlays even for a local dirty region.
- src/render/zones.ts:61 and src/render/utilities.ts:21 recreate geometry and then disable it when hidden.
- Three 200x200 m dirty rebuilds took 30-37 ms, with zones plus utilities accounting for about 11-12 ms.

# Scope
- In:
  - keeping invalidation while hidden and generating geometry on reveal
  - verifying that stale geometry cannot reappear after edits made while hidden
- Out:
  - the wider end-to-end edit budget, which needs its own measurement
  - overlay appearance or the data they display

# Acceptance criteria
- AC4: Hidden zone and utility overlays defer geometry generation and refresh correctly when revealed after edits, with no stale geometry.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: Hidden zone and utility overlays defer geometry generation and refresh correctly when revealed after edits, with no stale geometry.

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
- Rationale: About a third of a dirty rebuild, and dirty rebuilds are what the player waits on while editing.

# Notes
- Hybrid rationale: Derived from request `req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits.md`.
- Generated locally by logics-manager.

# Tasks
- `task_047_land_the_large_city_frame_cost_reductions_in_measured_order`
