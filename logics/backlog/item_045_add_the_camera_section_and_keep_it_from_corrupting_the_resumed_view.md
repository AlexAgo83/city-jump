## item_045_add_the_camera_section_and_keep_it_from_corrupting_the_resumed_view - Add the Camera section, and keep it from corrupting the resumed view
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
- Summary: There is no Camera row in the settings panel, and `writeCameraState`'s 800 ms debounce off the view-matrix observable never fires under a self-turning camera and would persist a moving car's position under follow.
- Keywords: add, camera, section, corrupting, resumed, view
- Use when: Adding the Camera row in `index.html` and `bindControls`, persisting the mode in `UiSettings`, or changing when camera position is saved.
- Skip when: The work persists what was followed or orbited, or redesigns the settings panel.

# Problem
- There is no Camera section in the settings panel, which offers World, Sun and City rows only.
- `writeCameraState` is debounced 800 ms off `onViewMatrixChangedObservable`: a camera that turns every frame never lets that debounce fire, and a camera locked to a moving car would persist a vehicle's position as the point the next session resumes at.

# Scope
- In:
  - A Camera row in `index.html` wired in `bindControls`, following the panel's existing plain-label pattern.
  - Ship the row with Free and Orbit only. **Follow is not shown until it works** -- an option that appears later surprises nobody, while a disabled control with no explanation is a defect the player has to interpret. The follow slice adds it when selection covers cars.
  - Persist the chosen mode through `UiSettings` in `src/ui/saves.ts`, alongside `sunAuto` and `shortNight`.
  - Suspend camera-position persistence outside Free, so the resumed view is always somewhere the player chose.
  - Extend the browser interaction suite to cover each mode doing what it claims, and returning to Free on a pan.
- Out:
  - Persisting what was being followed or orbited across sessions.
  - Redesigning the settings panel or its markup beyond the new row.
  - A keyboard shortcut for switching mode.

# Acceptance criteria
- AC1: The Camera section offers the modes that currently work and the choice survives a reload; no mode is shown in a state where choosing it does nothing.
- AC2: The persisted camera position is never a moving target and never a position produced by self-motion; a session resumed after orbiting or following comes back somewhere the player chose.
- AC3: The browser interaction suite covers each mode and the escape-to-Free rule.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The Camera section offers the three modes and the choice survives a reload.
- request-AC6 -> This backlog slice. Proof: AC2: The persisted camera position is never a moving target and never a position produced by self-motion; a session resumed after orbiting or following comes back somewhere the player chose.
- request-AC8 -> This backlog slice. Proof: AC3: The browser interaction suite covers each mode and the escape-to-Free rule.

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
