## item_156_file_show_fps_with_the_camera - File Show FPS with the camera
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 21:27:21

# AI Context
- Summary: show-fps sits in the World row beside Grid, Buildings, Details and Boxes, none of which it relates to, while a Camera row already exists.
- Keywords: show-fps, World row, Camera row, toolbar placement, persisted fps key
- Use when: moving a control between toolbar rows.
- Skip when: renaming or re-keying the persisted fps setting, and moving any other control.

# Problem
- `show-fps` sits in the `World` row (index.html:304) beside Grid, Buildings, Details and Boxes, none of which it has anything to do with.
- A `Camera` row already exists at index.html:341-346, holding the free, orbit and follow modes.

# Scope
- In:
  - Move the `show-fps` control into the Camera row, with its controls.ts wiring.
- Out:
  - Renaming or re-keying the persisted `fps` setting.
  - Moving any other control between rows.

# Acceptance criteria
- Show FPS is in the Camera row.
- The persisted setting key is unchanged, and an existing player's choice still applies.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: Show FPS is in the Camera row.

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
- Rationale: A misfiled checkbox. Real, trivial, and it waits behind everything that changes behaviour.
