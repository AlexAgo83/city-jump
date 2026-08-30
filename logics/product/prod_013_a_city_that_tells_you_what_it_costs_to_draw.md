## prod_013_a_city_that_tells_you_what_it_costs_to_draw - A city that tells you what it costs to draw
> Date: 2026-08-30
> Status: Proposed
> Related request: `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`
> Related backlog: `item_056_measure_the_frame_rate_once_and_only_while_someone_is_watching`, `item_057_put_the_counter_in_the_top_right_without_evicting_the_selection_panel`, `item_058_add_show_fps_to_settings_world_and_remember_it`
> Related task: `task_018_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.
> Indicators reviewed: 2026-08-30 14:37:53

# Overview
city-jump has always measured its own frame rate and has never shown it to anyone playing. The number lives in a debug hook that a test script calls from outside the page, quoted in the README and asserted in CI, while the player who can actually feel the city slow down has nothing to look at. This slice puts the figure on screen, behind a setting that is off by default, so the cost of a city is something its builder can watch rather than something only the suite knows.

```mermaid
flowchart LR
    Frames[Per-frame delta from the engine] --> Smooth[One smoothed frame-rate value]
    Smooth --> Counter[Top-right HUD counter]
    Smooth --> Probe["measureFps() for the suites"]
    Toggle["Settings > World: Show FPS"] -->|on| Smooth
    Toggle -->|off, the default| Idle[No sampling, nothing drawn]
    Toggle --> Stored[(UiSettings, remembered across reloads)]
    Panel["#selection-panel, same corner"] --- Counter
```

# Goals
- The player can see what the city costs to draw, while they are drawing it.
- The figure on screen is the same one the test suite argues with.
- Someone who does not want a number in the corner never sees one.
- Nothing measures when nobody is looking.

# Non-goals
- A profiler, a frame-time graph, a memory readout, or per-renderer timings.
- Exposing the rest of the debug statistics to the player.
- Any performance optimisation -- this slice measures, it does not improve.
- Warnings, thresholds, or the game reacting to a low frame rate.
- A quality or detail setting the counter would feed.

# Scope and guardrails
- In: one smoothed frame-rate figure, the HUD element that shows it, and the World setting that switches it on.
- In: sharing that measurement with `measureFps`, so the player and the suite argue with the same number.
- Out: profilers, frame-time graphs, per-renderer timings, and any other debug statistic in the UI.
- Out: performance work of any kind -- this measures, it does not improve.

# Key product decisions
- Off by default: a permanent number in the corner is clutter for someone who only wants to build.
- One measurement, two readers. A second measurement that can disagree with the suite is worse than none.
- Nothing samples while the counter is hidden.

# Success signals
- A player can see the frame rate fall as they build, without opening a console.
- The counter and `measureFps` never disagree on the same scene.
- With the setting off, the feature costs nothing measurable.

# References
- Product back-reference: `req_016_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`
- Task back-reference: `task_018_show_the_frame_rate_on_screen_and_let_the_player_turn_it_off`
