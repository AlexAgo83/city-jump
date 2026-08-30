## item_043_orbit_the_camera_around_what_the_player_is_looking_at - Orbit the camera around what the player is looking at
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:07:22

# AI Context
- Summary: Nothing turns the camera by itself, so seeing a place from all sides means holding the mouse down; orbit advances `alpha` at a frame-rate-independent cinematic pace around the selection or the current target.
- Keywords: orbit, camera, around, player, looking
- Use when: Implementing or tuning the orbit behaviour in `src/render/scene.ts`.
- Skip when: The work follows something moving, adds configurable speed, or animates a camera path.

# Problem
- Seeing something from every side means holding the mouse down and dragging, and there is no way to sit and watch the light change over one place.

# Scope
- In:
  - Advance the camera's `alpha` on its own at a pace that reads as cinematic -- a full revolution measured in tens of seconds, not seconds -- scaled by frame time so it turns at the same rate whatever the frame rate.
  - Orbit the selection when there is one, snapping the target to it on entry; otherwise orbit the point already being looked at, so the mode is always available rather than a disabled control.
  - Leave zoom and angle under the player's control throughout.
- Out:
  - Following anything that moves.
  - Configurable orbit speed or direction.
  - Automatic framing, distance fitting, or path animation.

# Acceptance criteria
- AC1: Orbit turns the camera continuously around its target at a steady rate independent of frame rate, and the player can still zoom and change angle.
- AC2: Entering Orbit with a selection centres on it; entering with none orbits the current target rather than refusing.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: Orbit turns the camera continuously around its target at a steady rate independent of frame rate, and the player can still zoom and change angle.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_009_a_camera_that_can_watch_not_only_be_aimed`
- Architecture decision(s): (none yet)
- Request: `req_012_give_the_camera_three_target_policies_free_orbit_and_follow`
- Primary task(s): `task_014_implement_the_camera_target_policies_and_the_camera_settings_section`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_014_implement_the_camera_target_policies_and_the_camera_settings_section`

# Notes
- Task `task_014_implement_the_camera_target_policies_and_the_camera_settings_section` was finished via `logics-manager flow finish task` on 2026-08-30.
