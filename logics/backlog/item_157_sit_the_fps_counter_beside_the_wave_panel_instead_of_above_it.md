## item_157_sit_the_fps_counter_beside_the_wave_panel_instead_of_above_it - Sit the FPS counter beside the Wave panel instead of above it
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 21:27:21

# AI Context
- Summary: The FPS counter and the Wave panel share the right-hand column, so the counter pushes the panel down instead of sitting beside it. The column's flow contract -- hidden takes no room, no per-pair rules -- has to survive the change.
- Keywords: right-stack, fps-counter, run-panel, column gap, flow contract, per-pair positioning
- Use when: changing the layout of the top-right panel column.
- Skip when: re-laying out the selection or between-runs panels, or giving any of them a fixed top again.

# Problem
- `#fps-counter` and `#run-panel` are both in `#right-stack` (index.html:469-476), which is a column with `gap: 8px` (index.html:135-139), so the counter pushes the Wave panel down instead of sharing its line.
- That column carries a recorded reason a change must keep: the top-right panels share one column in a fixed order and flow, because each carrying its own `top` meant showing two overlapped them and showing three needed a rule per pair.

# Scope
- In:
  - The FPS counter on the same line as the Wave panel, to its left, separated by the column's own gap.
  - Keeping the flow contract: hiding either one leaves the other where it was, with no per-pair positioning.
- Out:
  - Re-laying out the selection panel or the between-runs panel.
  - Giving any of these panels its own fixed position again.

# Acceptance criteria
- The FPS counter and the Wave panel share a line, at the same vertical position, with the column's gap between them.
- Hiding the FPS counter leaves the Wave panel exactly where it was, and vice versa.
- No panel in that column regains a `top` of its own.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: The FPS counter and the Wave panel share a line, at the same vertical position, with the column's gap between them.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_033_a_wave_you_watch_on_your_own_terms`
- Architecture decision(s): (none yet)
- Request: `req_042_let_the_player_keep_the_camera_let_the_batteries_reach_and_show_a_destroyed_building_burning`
- Primary task(s): `task_044_orchestrate_the_camera_battery_reach_and_destruction_effects_work`

# Priority
- Priority: Low
- Rationale: Cosmetic, but it must not break the column's flow contract, which is the only reason it is not a one-line change.

# Notes
- 2026-09-04, codex: wrapped `#fps-counter` and `#run-panel` in a flow row inside `#right-stack`. A targeted Playwright check measured both at y=12, an 8 px gap, no panel-owned `top`, and the run panel stayed at the same y/right edge when FPS was hidden.
