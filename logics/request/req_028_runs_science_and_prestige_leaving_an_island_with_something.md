## req_028_runs_science_and_prestige_leaving_an_island_with_something - Runs, science and prestige: leaving an island with something
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-31 23:01:18

# AI Context
- Summary: The loop closes: a defeated kaiju leaves science, evacuation ends a run as a decision, panels open and close a run, a first upgrade web spends what was carried off, a hardcore option deletes the save, and a balance harness turns every constant into an output.
- Keywords: runs, science, prestige, leaving, island, something
- Use when: Working on runs, evacuation, science, prestige, the upgrade web, or balancing.
- Skip when: You need a rule inside a single run -- the economy and the wave are earlier slices.

# Needs
- Science comes only from waves and only leaves the island with the player, which is the tension
  the whole game is built on: never let a wave land and never progress.
- Leaving is a decision with a price on both sides. If a defeat carries as much as a departure,
  nobody will ever choose to leave.
- Balance stops being taste here: the harness runs the simulation headless over many seeds against
  scripted policies, and the constants are its outputs.

# Context
- Generated locally by logics-manager.
- No manual skills bootstrap or bridge editing is required.

# Acceptance criteria
- AC1: A defeated kaiju leaves science; calling a wave early multiplies what a defeated one leaves
  and pays nothing if it is not.
- AC2: A run ends by evacuation or by the population reaching zero, and both are explicable.
- AC3: Science carried off an island becomes prestige, spent on a web of capabilities, starting
  conditions and information -- never on multipliers over the loop's own scarcities.
- AC4: A run's city and the profile that outlives it are separate saves, and a hardcore setting
  deletes the run's save on defeat.
- AC5: A run opens at the bridge, with a road inland to a starter kit -- the few buildings that
  make the first minutes possible -- and no scripted sequence beyond it: the gauges are what tells
  the player what to build next.
- AC6: `npm run balance` reports the distribution of runs across seeds and policies, and every
  balance constant traces to one of its runs.

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
- `item_077_runs_science_and_prestige_leaving_an_island_with_something`
