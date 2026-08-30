## item_044_follow_something_that_moves_and_stop_cleanly_when_it_is_gone - Follow something that moves, and stop cleanly when it is gone
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 80%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:03:06

# AI Context
- Summary: The camera cannot ride along with a car; and a followed vehicle does not survive a rebuild today, since `traffic.rebuild()` disposes the whole mover population — so follow must end gracefully rather than freeze.
- Keywords: follow, something, moves, cleanly, gone
- Use when: Implementing the follow behaviour, once cars and pedestrians are selectable.
- Skip when: Cars are not yet selectable, or the work is about keeping a vehicle alive across a rebuild.

# Problem
- The camera cannot ride along with a car or a pedestrian, so watching how one actually behaves means chasing it by hand and losing it.
- A followed vehicle does not survive a city edit today, because the traffic renderer disposes and re-instantiates its whole population on every rebuild.

# Scope
- In:
  - Track the selected moving thing's position as the camera target each frame, keeping the player's zoom and angle around it.
  - Detect that the subject no longer exists, return to Free, and say why through the existing toast rather than silently drifting or freezing.
  - Smooth the target so the camera is not jittering on a per-frame position.
  - Add the Follow option to the Camera row as part of this slice -- the section ships without it, and this is what makes it appear.
  - Depends on cars and pedestrians being selectable; do not start this slice before that exists.
- Out:
  - Keeping a vehicle alive across a rebuild, which belongs to the rebuild-granularity work.
  - A driver's-seat or chase-cam framing with its own angle rules.
  - Following a building, a road, or anything that does not move.

# Acceptance criteria
- AC1: With a moving thing selected, Follow keeps it framed while it travels, and zoom and angle stay under the player's control.
- AC2: When the followed subject stops existing, the camera returns to Free and the player is told why.
- AC3: The camera does not visibly jitter while following.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: With a moving thing selected, Follow keeps it framed while it travels, and zoom and angle stay under the player's control.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_009_a_camera_that_can_watch_not_only_be_aimed`
- Architecture decision(s): (none yet)
- Request: `req_012_give_the_camera_three_target_policies_free_orbit_and_follow`
- Primary task(s): `task_014_implement_the_camera_target_policies_and_the_camera_settings_section`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
