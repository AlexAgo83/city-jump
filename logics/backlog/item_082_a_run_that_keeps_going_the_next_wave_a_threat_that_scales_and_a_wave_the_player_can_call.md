## item_082_a_run_that_keeps_going_the_next_wave_a_threat_that_scales_and_a_wave_the_player_can_call - A run that keeps going: the next wave, a threat that scales, and a wave the player can call
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 12:06:40

# AI Context
- Summary: The delivery slice for the run loop: a verdict that schedules the next wave, a threat derived from the city and the wave number, and a wave the player can call early.
- Keywords: run, keeps, going, next, wave, threat, scales, player, can, call
- Use when: Working on the wave clock, the wave schedule, threat scaling, or the early call.
- Skip when: You need what happens during a wave, or the city's economy.

# Problem
- `finishWave` sets `waveVerdict` and nothing clears it. `updateWave` returns on that verdict on every later frame, `resetWave` is reachable only from loading a city or the debug API, and `nextWaveAtSeconds` is never moved past sixty. The first wave is the last wave.
- `settleWave` increments `runState.wave` for a second wave that is never scheduled, so the run counter and the game disagree from the first verdict onwards.
- `advanceWaveClock` sets the threat to the constant `WAVE_STARTING_VALUES.kaijuHitPoints`, derived from nothing about the city, so growing the city costs the player nothing and consolidating buys nothing.
- `finishWave` passes `calledEarly: false` as a literal. `EARLY_WAVE_SCIENCE_MULTIPLIER` is tested and unreachable, and the decision the science economy is built to price cannot be taken.

# Scope
- In:
  - Clear the verdict and schedule the next wave after one ends, with the interval readable in the banner the countdown already uses.
  - Derive the threat from the city -- the population and parcels already counted -- and from the wave number, and keep it fixed for the duration of a wave as the wave slice decided.
  - Add the way to call a wave early, and pass the real flag into `settleWave` so the existing multiplier applies.
  - Make sure a run of several waves survives a save and a reload, since the wave clock and the run state are persisted separately.
  - Prove a multi-wave run headlessly, from a seed, rather than by playing it.
- Out:
  - The combat balance of any single wave, which the legibility request retunes.
  - Kaiju behaviour, missiles, or anything drawn during a wave.
  - New wave types, abilities or resistances.
  - Changing what science buys.

# Acceptance criteria
- AC1: A held wave and a breached one both schedule the next, and the countdown to it is readable.
- AC2: The threat rises with the city and the wave number, and does not move once a wave has started.
- AC3: A wave can be called early and the science multiplier applies when it is.
- AC4: A run of several waves is proven headlessly from a seed and survives a save and reload.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A held wave and a breached one both schedule the next, and the countdown to it is readable.
- request-AC2 -> This backlog slice. Proof: AC2: The threat rises with the city and the wave number, and does not move once a wave has started.
- request-AC3 -> This backlog slice. Proof: AC3: A wave can be called early and the science multiplier applies when it is.
- request-AC9 -> This backlog slice. Proof: AC4: A run of several waves is proven headlessly from a seed and survives a save and reload.

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

# Tasks
- `task_032_close_the_loops_a_run_of_several_waves_a_city_that_survives_its_first_day_and_resources_that_are_spent`

# Notes
- Task `task_032_close_the_loops_a_run_of_several_waves_a_city_that_survives_its_first_day_and_resources_that_are_spent` was finished via `logics-manager flow finish task` on 2026-09-01.
