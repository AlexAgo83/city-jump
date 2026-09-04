## item_146_open_the_zone_brush_at_the_minimum_of_its_own_slider - Open the zone brush at the minimum of its own slider
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-05 00:22:22

# AI Context
- Summary: The zone brush opens at 32 with a minimum of 8, and the tool's radius is a hand-kept copy of that default which has already drifted from the slider once.
- Keywords: zone-radius, brush default, ZONE_RADIUS, one source of truth, slider minimum
- Use when: changing a brush default, or any constant kept equal to a DOM attribute by hand.
- Skip when: the spray brush's radius, and the slider's min, max and step, which stay as they are.

# Problem
- index.html:449 declares the zone brush `min="8" max="96" step="8" value="32"`, so it opens at four times its minimum.
- src/render/drawTool.ts:103-108 keeps ZONE_RADIUS equal to that default by hand, and its comment records the cost the last time the two diverged: the tool painted at the tree brush's radius while the slider read something else.
- src/ui/controls.ts:287-289 already pushes the input's value into the tool at bind time for that same reason, so the constant is a second source of truth for a number the DOM already holds.

# Scope
- In:
  - The zone brush opens at its slider's minimum.
  - One source of truth for that number, so the tool's radius and the input's range cannot diverge silently.
- Out:
  - `#spray-radius` (index.html:438), which has the same shape and is not what was asked for.
  - Changing the slider's min, max or step.

# Acceptance criteria
- The zone brush's opening radius is the minimum of `#zone-radius`.
- Changing the input's range cannot leave the tool painting at a size the slider does not offer, and something fails if it does.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: The zone brush's opening radius is the minimum of `#zone-radius`.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_032_tools_that_stay_out_of_the_way_and_a_wave_whose_aftermath_the_player_can_read`
- Architecture decision(s): (none yet)
- Request: `req_041_what_playing_0_4_0_turned_up_in_the_zoning_tools_the_brush_surface_and_the_wave_s_aftermath`
- Primary task(s): `task_043_orchestrate_the_zoning_brush_surface_and_wave_aftermath_work`

# Priority
- Priority: Low
- Rationale: One line plus a pairing to remove; it rides along with the zoning pass rather than earning its own.

# Validation
- 2026-09-05: Removed the hand-kept zone brush radius constant, made `#zone-radius` default to its own `min`, and had `bindControls` emit that DOM value at startup. `scripts/interact.mjs` now fails if the zone brush no longer opens at the slider minimum. Validation passed with `rtk npm run typecheck` and `rtk npm run test:e2e`.

# Tasks
- `task_043_orchestrate_the_zoning_brush_surface_and_wave_aftermath_work`

# Notes
- Task `task_043_orchestrate_the_zoning_brush_surface_and_wave_aftermath_work` was finished via `logics-manager flow finish task` on 2026-09-05.
