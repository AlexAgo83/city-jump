## item_076_the_interface_the_wave_demands_game_state_leaves_the_settings_menu - The interface the wave demands: game state leaves the settings menu
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-31 23:10:29

# AI Context
- Summary: The delivery slice for game state leaves the settings menu, and the loop gets its screen.
- Keywords: interface, wave, demands, game, state, leaves, settings, menu
- Use when: Planning or reviewing this slice of `road_002_city_jump_a_city_worth_defending`.
- Skip when: You need another slice of the roadmap, or the product reasoning behind this one.

# Problem
- It lands after the four slices that add things to read, on purpose.

# Scope
- In:
  - The wave banner and the time controls, permanent, at the top.
  - A compact city strip: money, workers, food, and what is short.
  - The ledger behind the gauges, showing formulas with this city's values in them.
  - A State view, the alerts, and the edge glow.
  - Prices before the click, and unaffordable things that look it.
- Out:
  - Simulation rules -- what a number means belongs to prod_018.

# Acceptance criteria
- AC1: The backlog slice stays bounded for the interface the wave demands: game state leaves the settings menu.
- AC2: The backlog slice is reviewable and promotable into a task.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: the settings menu holding nothing needed during a wave; proven by an interaction check over its contents.
- request-AC2 -> This backlog slice. Proof: the permanent banner, clock and city strip; proven by interaction checks on each.
- request-AC3 -> This backlog slice. Proof: the ledger and its substituted formulas; proven by an interaction check reading one line against the simulation's own terms.
- request-AC4 -> This backlog slice. Proof: no formula written twice; proven by a unit test that the ledger renders reported terms and computes nothing.
- request-AC5 -> This backlog slice. Proof: the State view and the alert line; proven by interaction checks.
- request-AC6 -> This backlog slice. Proof: the screen's budget; proven by recording what was removed or folded alongside what was added.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_019_an_interface_for_a_city_you_can_lose`
- Architecture decision(s): (none yet)
- Request: `req_027_the_interface_the_wave_demands_game_state_leaves_the_settings_menu`
- Primary task(s): `task_029_the_interface_the_wave_demands_game_state_leaves_the_settings_menu`

# Priority
- Priority: Medium
- Rationale: It lands after the four slices that add things to read, on purpose.

# Notes
- Sequenced by `road_002_city_jump_a_city_worth_defending`; the order there is a risk order.

# Tasks
- `task_029_the_interface_the_wave_demands_game_state_leaves_the_settings_menu`
