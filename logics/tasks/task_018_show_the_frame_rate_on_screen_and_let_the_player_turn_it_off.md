## task_018_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off - Show the frame rate on screen and let the player turn it off
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-08-30 18:21:58

# AI Context
- Summary: Orchestration for req_016: measure once and only while watching, then place the counter without evicting the selection panel, then add the persisted `Show FPS` toggle. Small chain; the risk is scope creep towards a profiler, not difficulty.
- Keywords: show, frame, rate, screen, let, player, turn, off
- Use when: Implementing any of the three backlog slices under req_016, in the plan's order. Runs after task_017, which touches the same renderers.
- Skip when: The change optimises performance, adds thresholds or warnings, or feeds a quality/detail setting from the counter.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Read this request and its three backlog slices. This is a small chain; the risk in it is not difficulty but scope creep towards a profiler.
- [x] 2. Run after task_017. An FPS readout is only worth trusting once a partial rebuild is known not to be silently dropping geometry, and task_017 touches the same renderers.
- [x] 3. Measure first: one smoothed frame-rate value that both the counter and `measureFps` read, sampling only while the counter is on, with the smoothing unit-tested as a pure function.
- [x] 4. Then the HUD element, solving the top-right collision with `#selection-panel` explicitly rather than hoping the two never appear together.
- [x] 5. Then the `Show FPS` toggle in `Settings > World`, persisted through `UiSettings` exactly as `Grid` and `Buildings` are.
- [x] 6. Extend the browser interaction suite, then run the fast gate and the visual check.
- [x] 7. Confirm the figure the counter shows agrees with what `measureFps` reports on the same scene.
- [x] 8. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [x] 9. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_056_measure_the_frame_rate_once_and_only_while_someone_is_watching`
- `item_057_put_the_counter_in_the_top_right_without_evicting_the_selection_panel`
- `item_058_add_show_fps_to_settings_world_and_remember_it`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC5 -> This task. Proof: Implemented the optional FPS counter in commit 535bdeb. Verified on 2026-08-30 with npm run ci, CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:e2e, and CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:visual; e2e covers off-by-default, toggle on/off, persistence after reload, shared measureFps agreement, and no overlap with selection panel. Source: `535bdeb`
- request-AC6 -> This task. Proof: Implemented the optional FPS counter in commit 535bdeb. Verified on 2026-08-30 with npm run ci, CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:e2e, and CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:visual; e2e covers off-by-default, toggle on/off, persistence after reload, shared measureFps agreement, and no overlap with selection panel. Source: `535bdeb`
- request-AC7 -> This task. Proof: Implemented the optional FPS counter in commit 535bdeb. Verified on 2026-08-30 with npm run ci, CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:e2e, and CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:visual; e2e covers off-by-default, toggle on/off, persistence after reload, shared measureFps agreement, and no overlap with selection panel. Source: `535bdeb`
- request-AC1 -> This task. Proof: Implemented the optional FPS counter in commit 535bdeb. Verified on 2026-08-30 with npm run ci, CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:e2e, and CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:visual; e2e covers off-by-default, toggle on/off, persistence after reload, shared measureFps agreement, and no overlap with selection panel. Source: `535bdeb`
- request-AC2 -> This task. Proof: Implemented the optional FPS counter in commit 535bdeb. Verified on 2026-08-30 with npm run ci, CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:e2e, and CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:visual; e2e covers off-by-default, toggle on/off, persistence after reload, shared measureFps agreement, and no overlap with selection panel. Source: `535bdeb`
- request-AC3 -> This task. Proof: Implemented the optional FPS counter in commit 535bdeb. Verified on 2026-08-30 with npm run ci, CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:e2e, and CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:visual; e2e covers off-by-default, toggle on/off, persistence after reload, shared measureFps agreement, and no overlap with selection panel. Source: `535bdeb`
- request-AC4 -> This task. Proof: Implemented the optional FPS counter in commit 535bdeb. Verified on 2026-08-30 with npm run ci, CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:e2e, and CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:visual; e2e covers off-by-default, toggle on/off, persistence after reload, shared measureFps agreement, and no overlap with selection panel. Source: `535bdeb`
- request-AC8 -> This task. Proof: Implemented the optional FPS counter in commit 535bdeb. Verified on 2026-08-30 with npm run ci, CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:e2e, and CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:visual; e2e covers off-by-default, toggle on/off, persistence after reload, shared measureFps agreement, and no overlap with selection panel. Source: `535bdeb`

# Validation
- (no validation recorded yet)
- 2026-08-30: npm run ci passed; CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:e2e passed; CITY_JUMP_URL=http://127.0.0.1:5174 npm run test:visual passed.
- Finish workflow executed on 2026-08-30.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-30.
- Linked backlog item(s): `item_056_measure_the_frame_rate_once_and_only_while_someone_is_watching`, `item_057_put_the_counter_in_the_top_right_without_evicting_the_selection_panel`, `item_058_add_show_fps_to_settings_world_and_remember_it`
- Related request(s): `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`

# Links
- Request: `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`
- Product brief(s): `prod_013_a_city_that_tells_you_what_it_costs_to_draw`
- Architecture decision(s): (none yet)
