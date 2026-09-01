## item_084_resources_that_something_spends_counted_once - Resources that something spends, counted once
> From version: 0.3.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 11:47:46

# AI Context
- Summary: The delivery slice for the resource loop: materials get a sink or stop being produced, commercial output is counted once, and the gauges show what the rules use.
- Keywords: resources, something, spends, counted, once
- Use when: Working on `CityEconomy`, the resource stocks, income, or the needs panel.
- Skip when: You need the wave, the run loop, or the zone limits.

# Problem
- Materials are produced by `CityEconomy.advance`, persisted by `save.ts` and printed by the ledger, and no rule reads the stock. Industrial parcels demand six workers a cell -- the second-highest in the game -- for a number that only goes up.
- `servicesProduced` is added to the services stock, used as the term that drives population growth, and returned as `trade`, while `incomePerSecond` pays separately for the same commercial parcels. One calculation is a stock, a growth rate and an income at once.
- `buildingNeeds`, which the needs panel shows, is derived from workforce staffing ratios. `parcelsForDemand`, which decides whether a zoned parcel may appear at all, uses a separate set of population thresholds. The panel and the rule are unrelated.
- A player reading the gauges to decide what to build next is reading something that gates nothing -- the exact complaint the survival brief opens with about the game as it was before this direction started.

# Scope
- In:
  - Decide materials: give them a sink -- construction, rebuilding after a wave, batteries -- or stop producing, persisting and displaying them until there is one. Carrying a stock nobody spends is the worse answer and should not be the default.
  - Count commercial output once, and say plainly which of stock, growth and income it is.
  - Make the needs the panel shows and the rules that gate construction one notion of need, so the gauges are the instrument the brief says they are.
  - Keep the loop deterministic and headless-testable from a fixed seed, as the city-resources slice's AC5 already requires.
  - Whatever changes, check that a save written before it still loads.
- Out:
  - New resources or new consumers invented to give materials something to do -- if the sink is not already in the game, not producing them is the answer.
  - The wave, the run loop, or the starting balance.
  - Reworking the ledger's presentation beyond the terms it reports.

# Acceptance criteria
- AC1: Materials are spent by something, or are no longer produced, persisted or displayed.
- AC2: No single calculation is a stock, a growth driver and an income at the same time.
- AC3: The gauges the player reads are derived from the rules that gate construction.
- AC4: The loop replays identically from a fixed seed, and an older save still loads.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: Materials are spent by something, or are no longer produced, persisted or displayed.
- request-AC6 -> This backlog slice. Proof: AC2: No single calculation is a stock, a growth driver and an income at the same time.
- request-AC8 -> This backlog slice. Proof: AC3: The gauges the player reads are derived from the rules that gate construction.
- request-AC9 -> This backlog slice. Proof: AC4: The loop replays identically from a fixed seed, and an older save still loads.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_021_a_run_that_is_more_than_one_wave`
- Architecture decision(s): (none yet)
- Request: `req_030_the_loops_that_never_close_a_run_of_one_wave_a_city_that_starves_on_day_one_and_resources_nothing_consumes`
- Primary task(s): `task_032_close_the_loops_a_run_of_several_waves_a_city_that_survives_its_first_day_and_resources_that_are_spent`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
