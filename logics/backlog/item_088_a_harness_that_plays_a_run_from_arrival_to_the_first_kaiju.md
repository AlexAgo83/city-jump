## item_088_a_harness_that_plays_a_run_from_arrival_to_the_first_kaiju - A harness that plays a run from arrival to the first kaiju
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 14:54:14

# AI Context
- Summary: The delivery slice for the playthrough: arrive, road, zone, watch parcels rise and needs move, follow the gauges, and meet the first kaiju in each of its three shapes.
- Keywords: harness, plays, run, arrival, first, kaiju
- Use when: Working on the headless run harness or on end-to-end simulation coverage.
- Skip when: You need balance numbers, or the browser interaction suite.

# Problem
- Nothing plays this game. Every defect the last three requests record is invisible to a unit test of the part it lives in and obvious to anything that runs from arrival to the first attack.
- The gauges are the part most in need of it: a player is told to read the needs to decide what to build, and nothing has ever followed that instruction to see where it leads.
- The first wave has three shapes and two of them cannot currently happen, because the wave ends on the first building destroyed. Total loss, partial loss and a clean hold are three different futures for a city and none has been played.
- The simulation is already Babylon-free, so there is no technical reason this harness does not exist -- only that no slice's acceptance criteria ever asked for it.

# Scope
- In:
  - A headless harness over the real modules: arrive, draw the first roads through the same graph rules a click uses, paint zones, advance the clock, watch parcels be admitted and rise, watch the needs and the resources move.
  - Drive it from the same entry points the game drives, with no test-only shortcut past a decision the player has to make -- a harness with its own copy of a rule proves nothing, as `scripts/balance.mjs` already demonstrates.
  - A policy that follows the needs: build what the gauges say is short, and assert the city is better for it. If following them does not lead to a surviving city, report that as a finding rather than tuning the policy until it passes.
  - Play the first wave in three shapes -- everything destroyed, about half destroyed, nothing destroyed -- and assert a stated consequence for each: the run state, the population afterwards, what rebuilding costs, whether the next wave is reachable.
  - Deterministic from a seed and fast enough to run in the ordinary test gate.
  - Fail loudly and specifically: the step that stopped being possible, not a boolean.
- Out:
  - Rendering, picking, or anything the browser suite exists to check.
  - Fixing the defects the harness finds -- those belong to the requests that own them.
  - Balance numbers, which are the next slice.
  - Scenario scripting or campaign structure beyond the three wave shapes.

# Acceptance criteria
- AC1: A run plays headlessly from arrival to the first wave and fails loudly at the first step that stops being possible.
- AC2: A needs-following policy exists, and what happens when it is followed is asserted rather than assumed.
- AC3: The three wave shapes are each played and each has an asserted consequence.
- AC4: The harness is deterministic from a seed and runs inside the ordinary test gate.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `src/sim/playthrough.ts` plays roads, zones, lifecycle, economy and first wave headlessly; `src/sim/playthrough.test.ts` asserts the stop points.
- request-AC2 -> This backlog slice. Proof: `playFirstRun` records the needs-following steps and the test asserts the city reaches the first wave with resources and needs observed.
- request-AC3 -> This backlog slice. Proof: `src/sim/playthrough.test.ts` covers total loss, partial loss and clean hold consequences.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_023_a_game_that_plays_itself_once_before_anyone_believes_it`
- Architecture decision(s): (none yet)
- Request: `req_032_a_run_played_end_to_end_a_headless_playthrough_a_threat_the_city_generates_and_the_gameplay_switches_that_make_both_testable`
- Primary task(s): `task_034_play_a_run_end_to_end_price_the_threat_the_city_makes_and_give_the_settings_a_gameplay_section`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_034_play_a_run_end_to_end_price_the_threat_the_city_makes_and_give_the_settings_a_gameplay_section`

# Notes
- Task `task_034_play_a_run_end_to_end_price_the_threat_the_city_makes_and_give_the_settings_a_gameplay_section` was finished via `logics-manager flow finish task` on 2026-09-01.
