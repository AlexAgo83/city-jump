## item_058_add_show_fps_to_settings_world_and_remember_it - Add Show FPS to Settings > World and remember it
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 18:21:59

# AI Context
- Summary: A third checkbox in the `World` row of `index.html`, off by default, wired in `src/ui/controls.ts` and persisted through `UiSettings` in `src/ui/saves.ts` exactly as `show-grid` and `show-buildings` are. Following those two precisely is the whole of the work.
- Keywords: add, show, fps, settings, world, remember
- Use when: Adding the `Show FPS` toggle, or any new World setting that has to persist.
- Skip when: The work restructures the settings toolbar, adds a settings screen, or exposes other debug statistics.

# Problem
- There is no way to ask for the counter. `Settings > World` holds `Grid` and `Buildings`; a third toggle beside them is where a player would look for it.
- A setting the player has to set again on every visit is worse than no setting. The other World toggles are already persisted through `UiSettings` in `src/ui/saves.ts`, and a new one that is not would be the odd one out.

# Scope
- In:
  - A `Show FPS` checkbox in the `World` row of `index.html`, off by default, following `show-grid` and `show-buildings` exactly in markup and in wiring.
  - A handler in `src/ui/controls.ts` that turns the counter on and off immediately, and a `showFps` field in `UiSettings` persisted and restored by the existing `persistSettings` / `applySetting` pair.
  - Extend `scripts/interact.mjs`: turn the setting on, assert the counter appears and reads a plausible figure, turn it off, assert it is gone.
  - Check the toolbar still lays out correctly at the narrow widths the existing media query covers.
- Out:
  - Restructuring the settings toolbar or its rows.
  - A settings screen, or grouping the existing toggles differently.
  - Exposing any other debug statistic through the UI.

# Acceptance criteria
- AC1: `Settings > World` shows `Show FPS` beside `Grid` and `Buildings`, off by default, taking effect immediately.
- AC2: The choice survives a reload, through the same storage as the other World toggles.
- AC3: The browser interaction suite covers switching it on, reading a plausible figure, and switching it off.
- AC4: The toolbar still lays out correctly at the narrow widths the existing media query covers.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: `Settings > World` shows `Show FPS` beside `Grid` and `Buildings`, off by default, taking effect immediately.
- request-AC4 -> This backlog slice. Proof: AC2: The choice survives a reload, through the same storage as the other World toggles.
- request-AC8 -> This backlog slice. Proof: AC3: The browser interaction suite covers switching it on, reading a plausible figure, and switching it off.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_013_a_city_that_tells_you_what_it_costs_to_draw`
- Architecture decision(s): (none yet)
- Request: `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`
- Primary task(s): `task_018_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_018_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`

# Notes
- Task `task_018_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off` was finished via `logics-manager flow finish task` on 2026-08-30.
