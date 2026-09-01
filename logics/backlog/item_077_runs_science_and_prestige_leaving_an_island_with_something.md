## item_077_runs_science_and_prestige_leaving_an_island_with_something - Runs, science and prestige: leaving an island with something
> From version: 0.3.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 08:51:36

# AI Context
- Summary: The delivery slice for science from a defeated kaiju, evacuation as a decision, prestige, and a harness that produces the constants.
- Keywords: runs, science, prestige, leaving, island, something
- Use when: Planning or reviewing this slice of `road_002_city_jump_a_city_worth_defending`.
- Skip when: You need another slice of the roadmap, or the product reasoning behind this one.

# Problem
- The loop only closes here, and the constants stop being taste.

# Scope
- In:
  - Science left by a defeated kaiju, multiplied when the wave was called early.
  - Evacuation, and the population reaching zero -- the two ways a run ends.
  - Panels that open and close a run, and a first upgrade web of nine nodes.
  - Separate saves for the run and the profile, and a hardcore option that deletes the run's save.
  - How a run opens: the bridge, the road inland, and the starter kit that makes the first minutes
    possible -- the onboarding this game has instead of a tutorial.
  - `npm run balance`: seeds, scripted policies, and the distribution of runs.
- Out:
  - More nodes than the first web needs; a prestige shop; anything the harness has not measured.

# Acceptance criteria
- AC1: The backlog slice stays bounded for runs, science and prestige: leaving an island with something.
- AC2: The backlog slice is reviewable and promotable into a task.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: science from a defeated kaiju and the call multiplier; proven by unit tests over won and lost waves.
- request-AC2 -> This backlog slice. Proof: the two ways a run ends; proven by unit tests and an interaction check.
- request-AC3 -> This backlog slice. Proof: prestige spent on capabilities and information only; proven by a unit test asserting no node touches a core rate.
- request-AC4 -> This backlog slice. Proof: separate saves and the hardcore deletion; proven by unit tests on `ui/saves.ts` and an interaction check.
- request-AC5 -> This backlog slice. Proof: how a run opens: bridge, road, starter kit; proven by an interaction check on a fresh run.
- request-AC6 -> This backlog slice. Proof: `npm run balance` and its distribution; proven by a recorded run in `balance/history.jsonl`.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
- Request: `req_028_runs_science_and_prestige_leaving_an_island_with_something`
- Primary task(s): `task_030_runs_science_and_prestige_leaving_an_island_with_something`

# Priority
- Priority: Medium
- Rationale: The loop only closes here, and the constants stop being taste.

# Notes
- Sequenced by `road_002_city_jump_a_city_worth_defending`; the order there is a risk order.

# Tasks
- `task_030_runs_science_and_prestige_leaving_an_island_with_something`
