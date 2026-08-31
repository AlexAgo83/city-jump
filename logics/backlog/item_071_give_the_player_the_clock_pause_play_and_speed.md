## item_071_give_the_player_the_clock_pause_play_and_speed - Give the player the clock: pause, play and speed
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The delivery slice for time controls, and a day that runs at the rate the player chose.
- Keywords: player, clock, pause, play, speed
- Use when: Planning or reviewing this slice of `road_002_city_jump_a_city_worth_defending`.
- Skip when: You need another slice of the roadmap, or the product reasoning behind this one.

# Problem
- Every slice after this one assumes the player owns the clock.

# Scope
- In:
  - Pause, play, x2, x4 as permanent controls with the date and hour.
  - A simulation clock the sun follows, driven by the delta between drawn frames.
  - The sun slider becomes a paused-only control.
- Out:
  - What happens during that time -- waves, growth, economy.

# Acceptance criteria
- AC1: The backlog slice stays bounded for give the player the clock: pause, play and speed.
- AC2: The backlog slice is reviewable and promotable into a task.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: in scope above.
- request-AC2 -> This backlog slice. Proof: in scope above.
- request-AC3 -> This backlog slice. Proof: in scope above.
- request-AC4 -> This backlog slice. Proof: in scope above.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
- Request: `req_022_give_the_player_the_clock_pause_play_and_speed`
- Primary task(s): `task_024_give_the_player_the_clock_pause_play_and_speed`

# Priority
- Priority: High
- Rationale: Every slice after this one assumes the player owns the clock.

# Notes
- Sequenced by `road_002_city_jump_a_city_worth_defending`; the order there is a risk order.

# Tasks
- `task_024_give_the_player_the_clock_pause_play_and_speed`
