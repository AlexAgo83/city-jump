## task_044_orchestrate_the_camera_battery_reach_and_destruction_effects_work - Orchestrate the camera, battery reach and destruction effects work
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Six slices: the camera first because it is the most intrusive and needs no measurement, then the battery range with one scenarios run, the two HUD moves, the destruction effects, and the toggles once there are effects to switch off. The camera comment and the missile flight time are both settled decisions, not open questions.
- Keywords: wave camera, battery reach, missile flight time, HUD placement, explosion and fire, effect toggles
- Use when: implementing the camera, reach and destruction findings, in the order the plan sets.
- Skip when: starting with the effects; they are the only new infrastructure here and the cheap wins land first.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Take the camera first: it is the most intrusive of the six and it needs no measurement. Rewrite the reason recorded at src/app/waveLoop.ts:41-44 in the same wave, so no reader meets a comment defending a behaviour that has gone.
- [ ] 2. Then the battery range. The flight-time question is already settled -- reach grows, speed does not -- so move the flight time with the range (or stop dividing by it) in the same change, then re-run npm run scenarios once and record the band.
- [ ] 3. Then the two HUD moves -- Show FPS into the Camera row, and the counter onto the Wave panel's line -- which are small, independent, and verify by eye.
- [ ] 4. Then the destruction effects, which are the only new infrastructure here: explosion and fire as separate lifetimes, instanced like the rubble renderer, with a dispose.
- [ ] 5. Close with the toggles, once there are two effects to switch off and a row decided for them.
- [ ] 6. Verify with npm run ci, npm run test:visual for the HUD moves, and npm run perf before and after the effects land.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_152_stop_a_spawning_kaiju_from_taking_the_camera`
- `item_153_double_the_battery_range_and_decide_what_that_does_to_the_missiles`
- `item_154_blow_a_building_up_and_set_its_rubble_alight`
- `item_155_give_the_two_effects_their_settings_toggles`
- `item_156_file_show_fps_with_the_camera`
- `item_157_sit_the_fps_counter_beside_the_wave_panel_instead_of_above_it`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_152_stop_a_spawning_kaiju_from_taking_the_camera`. Proof deferred to slice closeout.
- request-AC2 -> `item_153_double_the_battery_range_and_decide_what_that_does_to_the_missiles`. Proof deferred to slice closeout.
- request-AC8 -> `item_153_double_the_battery_range_and_decide_what_that_does_to_the_missiles`. Proof deferred to slice closeout.
- request-AC3 -> `item_154_blow_a_building_up_and_set_its_rubble_alight`. Proof deferred to slice closeout.
- request-AC4 -> `item_154_blow_a_building_up_and_set_its_rubble_alight`. Proof deferred to slice closeout.
- request-AC5 -> `item_155_give_the_two_effects_their_settings_toggles`. Proof deferred to slice closeout.
- request-AC6 -> `item_156_file_show_fps_with_the_camera`. Proof deferred to slice closeout.
- request-AC7 -> `item_157_sit_the_fps_counter_beside_the_wave_panel_instead_of_above_it`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_042_let_the_player_keep_the_camera_let_the_batteries_reach_and_show_a_destroyed_building_burning`
- Product brief(s): `prod_033_a_wave_you_watch_on_your_own_terms`
- Architecture decision(s): (none yet)

# Notes
- 2026-09-04 operator decisions, all three confirmed before implementation: (1) missile flight time lengthens with the doubled battery range -- reach grows, speed does not; (2) the recorded reason at src/app/waveLoop.ts:41-44 is rewritten in place to state the new camera decision, not worked around; (3) the destruction effects are approved as scoped -- a one-shot explosion and a state-derived rubble fire, instanced like the rubble renderer, each with a settings toggle.
