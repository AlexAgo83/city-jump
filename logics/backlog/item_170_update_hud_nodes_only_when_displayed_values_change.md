## item_170_update_hud_nodes_only_when_displayed_values_change - Update HUD nodes only when displayed values change
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
- Summary: Update existing HUD nodes when displayed values change, instead of replacing the needs and ledger subtrees on every gameplay frame.
- Keywords: update, hud, nodes, only, displayed, values, change
- Use when: changing the HUD stats panel, the ledger, or the per-frame syncBuildings path that writes them.
- Skip when: changing which figures the HUD shows.

# Problem
- src/app/app.ts:1060 calls syncBuildings, which calls showCityStats at line 369 on every gameplay frame.
- src/ui/hud.ts:71 and line 84 recreate all needs and ledger rows even with the ledger hidden and the displayed strings unchanged.
- Instrumentation counted 716 calls / 16,110 inserted elements over 358 frames, then 722 / 16,245 over 361 frames: 45 elements per frame, or 2,700 per second at 60 fps, excluding text nodes.

# Scope
- In:
  - writing to existing nodes only when a displayed value changes
  - skipping the ledger rebuild entirely while it is hidden
- Out:
  - restructuring the HUD layout or its markup
  - changing the figures themselves

# Acceptance criteria
- AC5: Unchanged displayed needs and ledger values do not replace their DOM subtrees per frame; changed values and construction feedback remain correct.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC5: Unchanged displayed needs and ledger values do not replace their DOM subtrees per frame; changed values and construction feedback remain correct.

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
- Rationale: 45 elements per frame is real waste, but the CPU profile ranks rubble and staffing above it.

# Notes
- Hybrid rationale: Derived from request `req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits.md`.
- Generated locally by logics-manager.

# Tasks
- `task_047_land_the_large_city_frame_cost_reductions_in_measured_order`
