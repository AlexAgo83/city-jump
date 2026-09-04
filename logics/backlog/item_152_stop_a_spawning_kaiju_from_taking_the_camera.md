## item_152_stop_a_spawning_kaiju_from_taking_the_camera - Stop a spawning kaiju from taking the camera
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 22:12:15

# AI Context
- Summary: startWave applies a computed camera, so a wave arriving moves the view out from under the player. The jump has a recorded reason -- the kaiju lands a kilometre offshore -- which the landing markers and the banner may already answer.
- Keywords: applyCamera, startWave, createWavePlan framing, waveMarkers, wave banner, camera promise
- Use when: changing what a wave does to the camera, or answering the offshore-landing reason.
- Skip when: removing the landing markers or the banner, and the camera modes and persisted camera state, which work.

# Problem
- src/app/app.ts:462 calls `applyCamera(planned.camera)` from `startWave`, so a wave starting moves the view out from under the player.
- The jump has a recorded reason: src/app/waveLoop.ts:41-44 says the kaiju "lands a kilometre or more off the coast and walks in, so without this it destroyed the place off screen." Removing it without answering that puts the kaiju back off screen.
- **Settled, 2026-09-04:** the operator wants that written decision updated rather than worked around. The comment is rewritten in place to record what is true after this slice -- the camera is the player's, and the offshore landing is covered by the markers and the banner instead of by seizing the view. A reader arriving at that line must not find the old reasoning still asserting a behaviour the code no longer has.
- It also fights the promise README makes, that any pan or arrow key hands control straight back to the player.

# Scope
- In:
  - A wave that starts without moving the camera.
  - Rewriting the recorded reason at src/app/waveLoop.ts:41-44 so it states the decision this slice makes, with the offshore-landing problem it was protecting against named and its new answer given.
  - Covering that problem with the landing markers (src/app/app.ts:586) and the wave banner (:610), which already run for the whole wave.
  - Optionally offering the framing rather than applying it, if that turns out to be needed on top of the markers.
- Out:
  - Removing the landing markers or the banner.
  - The camera modes and the persisted camera state, which work.
  - The framing `createWavePlan` computes, which can stay available even if it is no longer applied.

# Acceptance criteria
- Starting a wave leaves the camera exactly where the player left it.
- The player is still told where the kaiju has landed and where it is heading, without the view moving.
- The reason recorded at src/app/waveLoop.ts:41-44 is rewritten to state the new decision, so it describes the behaviour the code has rather than the one it used to have -- and the offshore-landing problem it named is still visible, with its new answer.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: Starting a wave leaves the camera exactly where the player left it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_033_a_wave_you_watch_on_your_own_terms`
- Architecture decision(s): (none yet)
- Request: `req_042_let_the_player_keep_the_camera_let_the_batteries_reach_and_show_a_destroyed_building_burning`
- Primary task(s): `task_044_orchestrate_the_camera_battery_reach_and_destruction_effects_work`

# Priority
- Priority: High
- Rationale: The most intrusive of the six, it needs no measurement, and it fights a promise the README already makes to the player.

# Notes
- 2026-09-04, operator: update the written decision ("on met a jour la decision ecrite"). The comment at src/app/waveLoop.ts:41-44 is part of this slice's deliverable, not context to leave alone.
- 2026-09-04, codex: removed the wave-start camera application, rewrote the framing comment, and added an e2e assertion plus a targeted Playwright check proving `forceWave()` keeps `cameraState()` unchanged while the kaiju banner appears.
- Task `task_044_orchestrate_the_camera_battery_reach_and_destruction_effects_work` was finished via `logics-manager flow finish task` on 2026-09-04.

# Tasks
- `task_044_orchestrate_the_camera_battery_reach_and_destruction_effects_work`
