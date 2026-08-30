## req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off - Show the frame rate on screen, and let the player turn it off
> From version: 0.2.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The frame rate is measured, quoted in the README and asserted in CI, and never shown to the person playing. `measureFps` in `src/render/debugApi.ts` already counts frames but is reachable only from a script. This puts one smoothed figure in the top-right -- where `#selection-panel` already lives, so the two must coexist -- behind a `Show FPS` toggle in `Settings > World` that is off by default and persisted like `Grid` and `Buildings`.
- Keywords: show, frame, rate, screen, let, player, turn, off
- Use when: Working on the on-screen frame-rate counter, the `Show FPS` setting, `src/ui/hud.ts` overlays, or the `UiSettings` World toggles.
- Skip when: The work adds a profiler, frame-time graphs, per-renderer timings, other debug statistics in the UI, or any performance optimisation -- this chain measures, it does not improve.

# Needs
- The frame rate is the one thing the player can feel and cannot see. Draw enough roads and the city slows down; nothing on screen says by how much, or when it started, or whether the last thing they built is what did it.
- The figure already exists and is already measured -- `measureFps` in `src/render/debugApi.ts` counts frames over a window and resolves a number -- but it is reachable only from a script driving the page from outside. The player has no way to ask for it.
- This is also the instrument the project argues performance with. The README quotes a frame rate, the visual and interaction suites check one, and the dirty-region rebuild work was justified by cost measurements -- all of it invisible to the person actually playing.
- It has to be optional. A permanent number in the corner is clutter for someone who only wants to build a city, so it belongs behind a setting that is off by default and remembered like every other setting.

# Context
- The top-right corner is already taken. `#selection-panel` is `position: fixed; top: 12px; right: 12px` in `index.html`, and it appears whenever the player selects a road, a building, a car, a tree or a roundabout. The two have to coexist -- stacked, offset, or with the counter above the panel -- rather than one covering the other.
- `Settings > World` is the row that holds `Grid` and `Buildings` in `index.html` (around line 125), each an `<input type="checkbox">` wired in `src/ui/controls.ts` and persisted through `UiSettings` in `src/ui/saves.ts` via `applySetting` and `persistSettings`. A `Show FPS` checkbox is the same shape as the two beside it, and following them exactly is the whole of the UI work.
- The HUD already owns the on-screen overlays: `src/ui/hud.ts` exports `showSelection` and `showRefusal`, both of which write into elements declared in `index.html`. The counter belongs there rather than in `src/app/app.ts`.
- Frame timing lives on the Babylon engine. `scene.registerBeforeRender` already runs each frame for the camera modes and the traffic step, and `scene.getEngine().getDeltaTime()` is already read there. A raw per-frame reciprocal is unreadable -- it jitters far faster than anyone can read a number -- so the displayed figure has to be smoothed and updated on a slower cadence than it is sampled.
- Nothing about this changes what is rendered, so it costs nothing when the setting is off. Whatever measures the rate should not run at all when the counter is hidden.
- `src/render/debugApi.ts` already exposes `measureFps` and `stats()`. The counter should read the same underlying measurement rather than inventing a second one that can disagree with the figure the test suite asserts.

# Acceptance criteria
- AC1: When the setting is on, the current frame rate is shown in the top-right of the view, legible over both a bright and a dark scene.
- AC2: The counter and the selection panel are both usable at once -- neither hides or overlaps the other, whichever appears first.
- AC3: `Settings > World` carries a `Show FPS` checkbox alongside `Grid` and `Buildings`, off by default, which turns the counter on and off immediately.
- AC4: The choice is remembered across a reload, through the same settings storage the other World toggles use.
- AC5: The displayed figure is smoothed and updated on a human-readable cadence rather than recomputed and redrawn every frame.
- AC6: With the setting off, nothing measures and nothing draws -- the counter costs nothing when it is not wanted.
- AC7: The figure the counter shows and the figure `measureFps` reports come from the same measurement and do not disagree.
- AC8: The browser interaction suite covers turning the setting on, reading a plausible figure, and turning it off again; `npm test`, `npm run test:architecture`, `npm run build` and `npm run logics:validate` all pass.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_013_a_city_that_tells_you_what_it_costs_to_draw`
- Architecture decision(s): (none yet)

# References
- index.html
- src/ui/hud.ts
- src/ui/controls.ts
- src/ui/saves.ts
- src/app/app.ts
- src/render/debugApi.ts
- scripts/interact.mjs
- logics/roadmap/road_001_city_jump_playable_city.md
- logics/request/req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work.md

# Backlog
- `item_056_measure_the_frame_rate_once_and_only_while_someone_is_watching`
- `item_057_put_the_counter_in_the_top_right_without_evicting_the_selection_panel`
- `item_058_add_show_fps_to_settings_world_and_remember_it`
