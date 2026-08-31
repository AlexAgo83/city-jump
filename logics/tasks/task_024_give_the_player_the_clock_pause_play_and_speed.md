## task_024_give_the_player_the_clock_pause_play_and_speed - Give the player the clock: pause, play and speed
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-31 23:10:30

# AI Context
- Summary: Implementing time controls, and a day that runs at the rate the player chose.
- Keywords: player, clock, pause, play, speed
- Use when: Executing this slice, or checking what it was meant to deliver.
- Skip when: You need the product reasoning -- that is in the linked briefs.

# Context
- Every slice after this one assumes the player owns the clock.
- Scope and boundaries are on the linked backlog item; the reasoning is in the linked briefs.

# Plan
- [ ] 1. `render/scene.ts`: a simulation clock beside the frame cap -- the day advances by the
      delta between drawn frames times the chosen rate, and the rate is what pause, play, x2 and
      x4 set. `frameDelta` already measures the right thing; this is what reads it.
- [ ] 2. `index.html` and `ui/controls.ts`: the controls themselves, with the date and hour beside
      them, and Space keeping its meaning as pause.
- [ ] 3. The sun follows that clock: `setSun` is driven by it rather than by the slider, and the
      slider writes the hour only while paused, disabled otherwise.
- [ ] 4. Settings persistence keeps the chosen rate, and a reload comes back paused rather than
      resuming at x4 into a wave.
- [ ] 5. An interaction check that the city covers the same ground per second at every rate --
      the check that already exists for the frame cap, extended to the speeds.
- [ ] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.

# Backlog
- `item_071_give_the_player_the_clock_pause_play_and_speed`

# Definition of Done (DoD)
- [ ] Code is implemented and reviewed.
- [ ] Validation passes.
- [ ] Linked docs are synchronized.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: the controls and the readout; proven by an interaction check on each rate.
- request-AC2 -> This task. Proof: equal ground per second at every rate; proven by the existing frame-cap measurement extended to the speeds.
- request-AC3 -> This task. Proof: the sun following the clock and the slider gated by pause; proven by an interaction check.
- request-AC4 -> This task. Proof: every action available while paused; proven by an interaction check that builds a road paused.
- backlog-AC1 -> This task. Proof: the task stays inside the slice's scope.
- backlog-AC2 -> This task. Proof: the task is the executable surface of the slice.

# Validation
- Expected: `npm run ci`, and `npm run test:e2e` locally -- browser coverage is local, see
  `CONTRIBUTING.md`.
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_022_give_the_player_the_clock_pause_play_and_speed`
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
