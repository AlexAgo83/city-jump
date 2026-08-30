## req_012_give_the_camera_three_target_policies_free_orbit_and_follow - Give the camera three target policies: free, orbit, and follow
> From version: 0.2.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The scene already uses an `ArcRotateCamera`, so this is not three cameras but three rules for what `camera.target` does each frame: stay put, be orbited, or track something moving. Follow depends on cars being selectable; camera-position persistence has to be suspended outside Free or it records a moving car as the resume point.
- Keywords: camera, three, target, policies, free, orbit, follow
- Use when: Touching the camera in `src/render/scene.ts`, the settings panel rows in `index.html` and `bindControls`, or `writeCameraState` in `src/ui/saves.ts`.
- Skip when: The work adds a second camera type, a cinematic path editor, a first-person view, or changes the existing pan, zoom and limit behaviour.

# Needs
- The camera has exactly one behaviour and no way to change it. `createScene` builds an `ArcRotateCamera` and `attachKeyboardPan` walks its target across the map; there is no Camera section in the settings panel, which currently offers World, Sun and City rows only.
- There is no way to watch the city rather than operate it. The player can orbit by dragging, but nothing turns by itself, so seeing a junction from every angle means holding the mouse down, and there is no way to sit and watch the light change over a roundabout.
- There is no way to ride along with anything that moves. Cars and pedestrians are the most alive part of the scene and the camera cannot follow one, so a player who wants to see how a car actually takes a roundabout has to chase it by hand and loses it.
- Camera state persistence will actively misbehave under either new mode. `writeCameraState` is debounced 800 ms off `onViewMatrixChangedObservable`; a camera that turns every frame never lets that debounce fire, and a camera locked to a moving car would persist a vehicle's position as the point a session resumes at.

# Context
- This is not three cameras. The scene already uses an `ArcRotateCamera`, which orbits its target by design -- so the three modes are three rules for what `camera.target` does each frame, over one unchanged camera. Free leaves the target where the player put it, orbit locks it to the selection and advances `alpha` slowly, follow tracks a moving thing's position. Keeping the same camera is what lets the player still zoom and change angle while orbiting or following; Babylon's own follow-camera type would discard the framing and impose its own controls.
- Following depends on cars being selectable, which they are not today. That is delivered by the detail-panel slice of `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`, so the follow mode cannot land before it.
- A followed vehicle does not currently survive an edit: `traffic.rebuild()` disposes every mover and re-instantiates the population, so the car being followed ceases to exist the moment a road is drawn. The rebuild-granularity work in `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses` stops that wholesale disposal. Rather than wait, follow should end gracefully and say so when its subject disappears -- and it then becomes durable for free once that work lands.
- The settings panel is built from plain rows of labelled checkboxes in `index.html`, wired in `bindControls`, with player-facing toggles persisted through `UiSettings` in `src/ui/saves.ts` alongside `sunAuto` and `shortNight`. A Camera section follows that pattern; it introduces no new UI machinery.
- `drawTool` already arbitrates camera dragging through `setCameraDrag`, which is the existing seam for deciding when the camera should stay out of the way of a tool.

# Acceptance criteria
- AC1: The settings panel has a Camera section offering Free, Orbit and Follow, and the chosen mode is remembered across sessions the way the other toggles are.
- AC2: Free behaves exactly as the camera does today -- same panning, same dragging, same zoom, same limits.
- AC3: Orbit turns the camera slowly around its target on its own, at a pace that reads as cinematic rather than dizzying, while the player keeps full control of zoom and angle; with something selected it orbits that, otherwise it orbits the point already being looked at.
- AC4: Follow keeps a selected moving thing framed while it travels, leaving the player free to change angle and distance around it, and ends gracefully with an explanation when its subject stops existing.
- AC5: Panning the camera -- by drag or by arrow key -- returns the camera to Free, so the player is never fighting a mode they did not mean to be in.
- AC6: A mode that turns the camera by itself does not corrupt the resumed view: the camera position persisted between sessions is a place the player chose, never a moving target or a never-fired debounce.
- AC7: No mode interferes with drawing: the camera does not turn by itself while a tool is mid-stroke.
- AC8: Existing checks still pass, and the browser interaction suite covers each mode doing what it claims.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_009_a_camera_that_can_watch_not_only_be_aimed`
- Architecture decision(s): (none yet)

# References
- src/render/scene.ts
- src/render/drawTool.ts
- src/ui/controls.ts
- src/ui/saves.ts
- src/app/app.ts
- index.html
- logics/request/req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click.md
- logics/request/req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses.md

# Backlog
- `item_042_make_the_camera_s_target_policy_switchable_with_free_unchanged`
- `item_043_orbit_the_camera_around_what_the_player_is_looking_at`
- `item_044_follow_something_that_moves_and_stop_cleanly_when_it_is_gone`
- `item_045_add_the_camera_section_and_keep_it_from_corrupting_the_resumed_view`
