## item_057_put_the_counter_in_the_top_right_without_evicting_the_selection_panel - Put the counter in the top-right without evicting the selection panel
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
- Summary: `#selection-panel` is already `position: fixed; top: 12px; right: 12px`, so the counter has to share that corner rather than take it. Markup in `index.html`, rendering in `src/ui/hud.ts` beside `showSelection` and `showRefusal`, contrast that survives both midday terrain and night water, and a fixed-width figure that does not shift the layout.
- Keywords: put, counter, top, right, evicting, selection, panel
- Use when: Placing or styling the FPS counter, or changing anything in the top-right HUD corner.
- Skip when: The work restyles the selection panel beyond coexistence, makes the counter draggable, or adds a readout other than the frame rate.

# Problem
- The top-right corner already belongs to `#selection-panel`, which is `position: fixed; top: 12px; right: 12px` and appears whenever anything is selected. A second fixed element placed at the same coordinates covers it or is covered by it.
- A frame-rate figure has to stay legible over whatever the scene happens to be behind it -- bright terrain at midday and dark water at night are both underneath the same corner.

# Scope
- In:
  - A counter element in `index.html` and its rendering in `src/ui/hud.ts`, alongside the existing `showSelection` and `showRefusal`, rather than in `src/app/app.ts`.
  - A layout in which the counter and the selection panel coexist -- stacked in the same corner, or the counter above the panel -- and both stay readable when both are shown.
  - The same visual treatment the existing panels use, so it reads as part of the HUD and not as a debug overlay.
  - Contrast that holds over a bright scene and a dark one, verified against the day cycle rather than assumed.
  - A tabular or fixed-width figure, so the number does not shift the layout as it changes.
- Out:
  - Moving or restyling the selection panel beyond what coexistence requires.
  - A draggable, resizable or repositionable counter.
  - Any readout other than the frame rate.

# Acceptance criteria
- AC1: The counter is in the top-right and legible over both a bright and a dark scene.
- AC2: Selecting something while the counter is shown leaves both fully readable, in either order of appearance.
- AC3: The counter is drawn from `src/ui/hud.ts` and its markup lives in `index.html`, consistent with the other HUD elements.
- AC4: The number does not shift the layout as its width changes.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The counter is in the top-right and legible over both a bright and a dark scene.
- request-AC2 -> This backlog slice. Proof: AC2: Selecting something while the counter is shown leaves both fully readable, in either order of appearance.

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
