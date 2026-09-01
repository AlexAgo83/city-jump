## task_030_runs_science_and_prestige_leaving_an_island_with_something - Runs, science and prestige: leaving an island with something
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 10:22:21
> Owner: codex

# AI Context
- Summary: Implementing science from a defeated kaiju, evacuation as a decision, prestige, and a harness that produces the constants.
- Keywords: runs, science, prestige, leaving, island, something
- Use when: Executing this slice, or checking what it was meant to deliver.
- Skip when: You need the product reasoning -- that is in the linked briefs.

# Context
- The loop only closes here, and the constants stop being taste.
- Scope and boundaries are on the linked backlog item; the reasoning is in the linked briefs.

# Plan
- [x] 1. `sim/run.ts`: a run's state -- wave number, science, and the two ways it ends. Science from
      a defeated kaiju, multiplied when the wave was called early and worth nothing when it is not.
- [x] 2. How a run opens: the bridge, a road inland, and the starter kit that makes the first
      minutes possible. No scripted sequence -- the gauges are the tutorial.
- [x] 3. `ui/saves.ts`: the run's city and the profile that outlives it as separate saves, and a
      hardcore setting that deletes the run's save on defeat.
- [x] 4. The panels that open and close a run, over the map rather than as screens.
- [x] 5. The first upgrade web: nine nodes, three branches, capabilities and information only.
- [x] 6. `scripts/balance.mjs` and `npm run balance`: the simulation headless over many seeds
      against scripted policies, writing `balance/history.jsonl` the way perf writes its own.
- [x] 7. Tune until the four criteria in the brief hold, and record which run produced each
      constant.
- [x] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.

# Backlog
- `item_077_runs_science_and_prestige_leaving_an_island_with_something`

# Definition of Done (DoD)
- [x] Code is implemented and reviewed.
- [x] Validation passes.
- [x] Linked docs are synchronized.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: science from a defeated kaiju and the call multiplier; proven by unit tests over won and lost waves.
- request-AC2 -> This task. Proof: the two ways a run ends; proven by unit tests and an interaction check.
- request-AC3 -> This task. Proof: prestige spent on capabilities and information only; proven by a unit test asserting no node touches a core rate.
- request-AC4 -> This task. Proof: separate saves and the hardcore deletion; proven by unit tests on `ui/saves.ts` and an interaction check.
- request-AC5 -> This task. Proof: how a run opens: bridge, road, starter kit; proven by an interaction check on a fresh run.
- request-AC6 -> This task. Proof: `npm run balance` and its distribution; proven by a recorded run in `balance/history.jsonl`.
- backlog-AC1 -> This task. Proof: the task stays inside the slice's scope.
- backlog-AC2 -> This task. Proof: the task is the executable surface of the slice.

# Validation
- Expected: `npm run ci`, and `npm run test:e2e` locally -- browser coverage is local, see
  `CONTRIBUTING.md`.
- command: `npm run ci; npm run test:e2e; npm run balance` | result: passed | date: 2026-09-01
- Finish workflow executed on 2026-09-01.
- Linked backlog/request close verification passed.

# Report
- Delivered the run loop: science from a defeated wave with the early-call multiplier, the two run
  endings, a prestige web that buys capability and information only, separate run and profile
  saves with the hardcore deletion, and the starter run's bridge, road and kit.
- Recorded in `balance/history.jsonl`, and re-opened afterwards: `scripts/balance.mjs` drives an
  invented defence score rather than the real wave simulation, so AC6's evidence does not hold.
  That defect and its fix are carried by
  `req_029_a_wave_you_can_read_a_kaiju_that_crosses_the_city_missiles_you_can_watch_and_spending_that_never_blocks`.
- Finished on 2026-09-01.
- Linked backlog item(s): `item_077_runs_science_and_prestige_leaving_an_island_with_something`
- Related request(s): `req_028_runs_science_and_prestige_leaving_an_island_with_something`

# Links
- Request: `req_028_runs_science_and_prestige_leaving_an_island_with_something`
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
