## req_042_let_the_player_keep_the_camera_let_the_batteries_reach_and_show_a_destroyed_building_burning - Let the player keep the camera, let the batteries reach, and show a destroyed building burning
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Six needs from playing 0.4.0: a wave that stops seizing the camera, batteries that reach twice as far, an explosion and a burning rubble pile a project with no particle infrastructure has to build, and two HUD placements.
- Keywords: wave camera jump, batteryRangeM, missile flight time, explosion effect, rubble fire, effect toggles, show-fps row, right-stack line
- Use when: changing what a wave does to the view, the battery constants, or anything drawn when a building is destroyed.
- Skip when: retuning the wave difficulty curve, building a general particle framework, or re-laying out the right-hand column's stacking contract.

# Needs
- A wave arriving does not take the camera off the player.
- A battery reaches far enough to defend the city it stands in.
- A building that is destroyed looks destroyed: it blows up, and the rubble burns.
- Effects that cost frames can be switched off.
- A setting about the camera lives with the camera.
- The FPS counter shares a line with the Wave panel instead of pushing it down.

# Context
- Five needs from playing 0.4.0. Two are one-line constants with consequences beyond the line, two are HUD placement, and one is render infrastructure this project does not have yet. Three of the five reopen something already decided or already measured, and each of those is named below so the decision is answered rather than reversed by accident.
- The camera jump is deliberate and has a recorded reason. src/app/app.ts:462 calls `applyCamera(planned.camera)` from `startWave`, and src/app/waveLoop.ts:41-44 says why: "Show the player the thing that is about to walk through their city. It lands a kilometre or more off the coast and walks in, so without this it destroyed the place off screen." Removing the jump without answering that puts the kaiju back off screen. Settled 2026-09-04: that comment is updated in place as part of the work, so it records the decision taken here rather than the behaviour it used to defend.
- The pieces to answer it already exist. `waveMarkers.show(kaijuPlan)` draws the landing and the path every frame of the wave (src/app/app.ts:586), and `showWaveBanner` reports the kaiju's HP and the city's firepower (:610). The question is whether a marker and a banner are enough to say "it is coming from over there" without seizing the view, and whether the player should be offered the framing rather than given it.
- Camera state is also persisted and restored (`applyCamera`, `cameraSnapshot`, `writeCameraState`), and README promises that any pan or arrow key hands control straight back to the player. A wave that yanks the view fights that promise, which is the substance of the complaint.
- src/sim/wave.ts:4 sets `batteryRangeM: 220`. Doubling it to 440 is one character, and it changes three things at once, so make each deliberate.
- First, more batteries fire per salvo: `batteriesInRange` (src/sim/batteries.ts:27) filters by that radius, so every barracks within 440 m of the kaiju now contributes to each volley instead of every one within 220 m. That multiplies the city's effective firepower well beyond a factor of two on a dense map.
- Second, and this is the one worth catching: missiles get twice as fast. `impactAt` is computed as `missileTravelSecondsAtRange * Math.min(1, distXZ(battery, target) / battery.range)` (src/app/app.ts:598), so travel time is a fraction of the range rather than a speed. At 220 m a missile crossed the full range in 1.5 s; at 440 m it crosses twice the distance in the same 1.5 s. Settled 2026-09-04: the intent is reach, not speed. The flight time lengthens -- a missile keeps the speed it flies today and takes about 3 s to cross the new maximum range instead of 1.5 s -- so `missileTravelSecondsAtRange` moves with the range, or better, the formula stops expressing time as a fraction of a distance at all.
- Third, the balance band moves. `npm run scenarios` currently reports 31 of 31 waves held inside a 13-85 s / 4-21 salvo band; doubling reach and halving flight time pushes combat shorter and salvos fewer. Re-run it and record the band rather than tuning the wave to hide the change.
- There is no particle infrastructure in this project at all: searching src/ for a Babylon particle system or sprite class returns nothing, in either import or use. An explosion and a fire are new render infrastructure, not a parameter change. (Those class names are named here as absent, so they are deliberately not written as code anchors -- the audit would read them as stale citations.)
- docs/performance.md is unambiguous about the shape that has to take: "What costs is everything drawn one object at a time -- each unique mesh is a draw call, and every mesh in the scene is walked each frame whether it is on screen or not." The rubble renderer is the model to follow -- src/render/rubble.ts draws every pile as thin instances of one box. A fire per destroyed building must not become a mesh per destroyed building.
- The two effects have different lifetimes and should not be built as one thing. An explosion is a one-shot event at the moment `rubble.destroy(hit)` runs (src/app/app.ts:617) and needs a clock of its own. A fire is derived from state: rubble is saved with the city (`SavedRubble`), so a fire over it has to come back on reload and stop when the lot finishes rebuilding, which `BuildingLifecycle` already tracks through `BUILDING_STAGE_SECONDS`.
- There is already a crude impact flash to build against rather than duplicate: src/render/missiles.ts:39-45 scales the missile body to 5 and swaps in an emissive orange material on impact. Whatever the explosion becomes should relate to that, so the city does not end up with two unrelated vocabularies for the same event.
- The settings surface is ready for the toggles and needs no new machinery: `UiSettings` (src/ui/saves.ts:81-103) is a flat object of optional keys persisted to localStorage, so new keys are backward compatible and absent keys fall back to the default. The open question is which toolbar row they belong to -- `Look` holds the visual effects (`fx-antialias`, `fx-bloom`, `fx-ao`, `fx-tilt`), `World` holds what is drawn (`show-decor`, `show-boxes`) -- and that choice should be made once for both toggles.
- Whatever the effects cost, they answer to the machinery already in place: `createDetailCuller` (src/render/detail.ts), the `frameCap` setting and the `show-decor` discipline. An effect that ignores the culler is an effect that costs frames in a city the player is not looking at.
- `show-fps` sits in the `World` row (index.html:304) beside Grid, Buildings, Details and Boxes, while a `Camera` row already exists at index.html:341-346 holding the free/orbit/follow modes. Moving it is a markup move plus its `controls.ts` wiring; the persisted key is `fps` in `UiSettings` and does not need to change.
- The FPS counter is already in the right-hand column, just stacked above the Wave panel rather than beside it. index.html:469-476 puts `#fps-counter` and `#run-panel` in `#right-stack`, which is `flex-direction: column; align-items: flex-end; gap: 8px` (index.html:135-139). The 8 px gap is the margin the other panels in that column share.
- That column carries a recorded reason that any change has to keep: "Everything that lives in the top-right corner shares one column, stacked in a fixed order -- FPS, run status, selection -- and flows: whatever is hidden takes no room and the rest closes up. Each of these used to carry its own `top`, so showing two at once overlapped them and showing three needed a rule per pair." So putting FPS beside the Wave panel must not reintroduce per-pair positioning, and hiding either one must still leave the other where it was.

# Acceptance criteria
- A wave starting leaves the camera where the player put it, the player is still told where the kaiju is coming from, and the comment that recorded the old behaviour records the new one.
- Batteries reach twice as far and missiles fly no faster than they do today, so a shot at the new maximum range takes about twice as long to land.
- A destroyed building explodes once, and its rubble burns until the lot is rebuilt, across a save and reload.
- Neither effect adds a draw call per destroyed building, and both answer to the existing detail and frame-cap machinery.
- Both effects can be switched off in the settings, the choice persists, and off means nothing is drawn or stepped.
- Show FPS sits in the Camera row, and the setting it persists is unchanged.
- The FPS counter shares a line with the Wave panel at the same vertical position, with the column's own gap between them, and hiding either leaves the other in place.
- npm run scenarios stays inside its reported band, or the new band is recorded with its reason.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_033_a_wave_you_watch_on_your_own_terms`
- Architecture decision(s): (none yet)

# References
- src/app/app.ts
- src/app/waveLoop.ts
- src/sim/wave.ts
- src/sim/batteries.ts
- src/render/missiles.ts
- src/render/rubble.ts
- src/render/fps.ts
- src/render/detail.ts
- src/ui/controls.ts
- src/ui/saves.ts
- index.html
- docs/performance.md

# Backlog
- `item_152_stop_a_spawning_kaiju_from_taking_the_camera`
- `item_153_double_the_battery_range_and_decide_what_that_does_to_the_missiles`
- `item_154_blow_a_building_up_and_set_its_rubble_alight`
- `item_155_give_the_two_effects_their_settings_toggles`
- `item_156_file_show_fps_with_the_camera`
- `item_157_sit_the_fps_counter_beside_the_wave_panel_instead_of_above_it`
