## req_022_give_the_player_the_clock_pause_play_and_speed - Give the player the clock: pause, play and speed
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Pause, play, x2 and x4 as first-class controls, with the day running at the chosen rate and the sun slider demoted to a paused-only tool. Everything already moves on elapsed time, so this is controls and plumbing rather than simulation.
- Keywords: player, clock, pause, play, speed
- Use when: Working on the time controls, the simulation clock, or the sun's relationship to it.
- Skip when: You need what happens *in* that time -- the economy, waves or growth.

# Needs
- `prod_018` gives the player the clock, and every slice after this one assumes it: a wave is
  watched, the time between two of them is skipped, and every decision can be made paused.
- The frame cap already proved how easily this goes wrong -- movement read from the engine's own
  delta ran at a quarter speed once frames were skipped. The clock these controls drive is the one
  measured between drawn frames.

# Context
- Generated locally by logics-manager.
- No manual skills bootstrap or bridge editing is required.

# Acceptance criteria
- AC1: Pause, play, x2 and x4 are permanent controls, with the current date and hour beside them.
- AC2: The city covers the same ground per second of wall clock at every speed, measured.
- AC3: The sun follows the simulation clock; the slider sets the hour while paused and is
  unavailable while the city runs.
- AC4: Every action a player can take is available while paused.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)

# References
- `src/sim/` -- the deterministic rules this slice adds to.
- `src/render/` -- where they become something on screen.
- `docs/performance.md` -- the budget every slice is measured against.

# Backlog
- `item_071_give_the_player_the_clock_pause_play_and_speed`
