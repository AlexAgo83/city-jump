## item_154_blow_a_building_up_and_set_its_rubble_alight - Blow a building up and set its rubble alight
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 22:12:15

# AI Context
- Summary: A destroyed building just becomes a box of rubble. There is no ParticleSystem or Sprite anywhere in the project, so this is new render infrastructure -- and the explosion and the fire have different lifetimes: one is an event, the other is derived from saved state.
- Keywords: explosion effect, rubble fire, thin instances, draw call budget, SavedRubble reload, detail culler, missile impact flash
- Use when: adding anything drawn when a building is destroyed, or any new per-object visual effect.
- Skip when: a general particle framework, the destruction rules themselves, and smoke, debris physics, decals or sound.

# Problem
- A building being destroyed is the point of the wave, and all that happens is a mesh becoming a box of rubble. There is no explosion and nothing burns.
- There is no particle infrastructure in the project at all: searching src/ for a Babylon particle system or sprite class returns nothing. This is new render infrastructure rather than a parameter.
- docs/performance.md is explicit that what costs is objects drawn one at a time, and every mesh in the scene is walked each frame whether or not it is on screen. src/render/rubble.ts is the model: every pile is a thin instance of one box.
- The two effects have different lifetimes. The explosion is a one-shot at `rubble.destroy(hit)` (src/app/app.ts:617). The fire is derived from state -- rubble is saved with the city (`SavedRubble`), so it must come back on reload and stop when the lot finishes rebuilding, which `BuildingLifecycle` already tracks.
- src/render/missiles.ts:39-45 already has a crude impact flash: the body scales to 5 and swaps to an emissive orange material.

# Scope
- In:
  - A one-shot explosion when a building is destroyed, with its own clock.
  - A fire over rubble that survives a save and reload and ends when the lot is rebuilt.
  - Instanced or single-system drawing, following the rubble renderer, so neither effect adds a draw call per building.
  - Both effects answering to `createDetailCuller` and the frame cap, and a `dispose` like every other renderer.
  - A relationship to the existing missile impact flash, so there is one vocabulary for an explosion.
- Out:
  - A general particle framework.
  - Damage or destruction rules, which are settled.
  - Smoke, debris physics, scorch decals or sound.

# Acceptance criteria
- A destroyed building explodes once, at the moment it is destroyed.
- Rubble burns until the lot is rebuilt, and the fire is there after a save and reload.
- Neither effect adds a draw call per destroyed building.
- Both are stepped only when visible, and both dispose cleanly with the scene.
- The explosion and the missile impact read as the same kind of event.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: A destroyed building explodes once, at the moment it is destroyed.
- request-AC4 -> This backlog slice. Proof: Rubble burns until the lot is rebuilt, and the fire is there after a save and reload.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_033_a_wave_you_watch_on_your_own_terms`
- Architecture decision(s): (none yet)
- Request: `req_042_let_the_player_keep_the_camera_let_the_batteries_reach_and_show_a_destroyed_building_burning`
- Primary task(s): `task_044_orchestrate_the_camera_battery_reach_and_destruction_effects_work`

# Priority
- Priority: Medium
- Rationale: The whole point of a wave is a building being destroyed, and it is the one slice here that is new infrastructure rather than a change.

# Notes
- 2026-09-04, codex: added a thin-instance destruction effects renderer with a one-shot explosion and saved-rubble-driven fire, wired it to wave destruction/rebuild/reload, and validated with a targeted Playwright check: destruction produced rubble/fire/explosion counts 12/12/1, reload restored rubble/fire 12/12 and did not replay the explosion.
- Task `task_044_orchestrate_the_camera_battery_reach_and_destruction_effects_work` was finished via `logics-manager flow finish task` on 2026-09-04.

# Tasks
- `task_044_orchestrate_the_camera_battery_reach_and_destruction_effects_work`
