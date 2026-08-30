## item_042_make_the_camera_s_target_policy_switchable_with_free_unchanged - Make the camera's target policy switchable, with Free unchanged
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
- Summary: `createScene` hard-wires one camera behaviour; the modes need a per-frame target policy with Free unchanged, plus the escape rule that any pan drops back to Free.
- Keywords: camera, target, policy, switchable, free, unchanged
- Use when: Introducing or changing the camera target policy in `src/render/scene.ts`, or the pan-escapes-to-Free rule.
- Skip when: The work is the orbit or follow behaviour itself, the settings UI, or changes pan speed, zoom or beta limits.

# Problem
- `createScene` hard-wires one behaviour: an `ArcRotateCamera` whose target only moves when the player pans it.
- Any mode that moves the camera on its own has to be escapable, or the player ends up fighting it.

# Scope
- In:
  - Introduce a target policy the scene applies each frame, with Free as the existing behaviour, expressed so that a player who never changes mode sees no difference at all.
  - Any pan -- drag or arrow key -- drops the policy back to Free.
  - A mode that moves the camera by itself is suspended while a drawing tool is mid-stroke, using the existing `setCameraDrag` seam rather than a new one.
  - Unit-test what can be tested without a scene: the policy state machine and the escape rule.
- Out:
  - The orbit and follow behaviours themselves, which are their own slices.
  - Any UI.
  - Changing pan speed, zoom limits, beta limits or inertia.

# Acceptance criteria
- AC1: With Free selected the camera behaves identically to today, verified by the existing interaction checks.
- AC2: Panning by drag or arrow key returns the camera to Free from any other mode.
- AC3: A self-moving mode does not turn the camera while a tool is mid-stroke.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: With Free selected the camera behaves identically to today, verified by the existing interaction checks.
- request-AC5 -> This backlog slice. Proof: AC2: Panning by drag or arrow key returns the camera to Free from any other mode.
- request-AC7 -> This backlog slice. Proof: AC3: A self-moving mode does not turn the camera while a tool is mid-stroke.

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
