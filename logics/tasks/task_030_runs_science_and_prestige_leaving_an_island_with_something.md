## task_030_runs_science_and_prestige_leaving_an_island_with_something - Runs, science and prestige: leaving an island with something
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-31 23:04:50

# AI Context
- Summary: Implementing science from a defeated kaiju, evacuation as a decision, prestige, and a harness that produces the constants.
- Keywords: runs, science, prestige, leaving, island, something
- Use when: Executing this slice, or checking what it was meant to deliver.
- Skip when: You need the product reasoning -- that is in the linked briefs.

# Context
- The loop only closes here, and the constants stop being taste.
- Scope and boundaries are on the linked backlog item; the reasoning is in the linked briefs.

# Plan
- [ ] 1. `sim/run.ts`: a run's state -- wave number, science, and the two ways it ends. Science from
      a defeated kaiju, multiplied when the wave was called early and worth nothing when it is not.
- [ ] 2. How a run opens: the bridge, a road inland, and the starter kit that makes the first
      minutes possible. No scripted sequence -- the gauges are the tutorial.
- [ ] 3. `ui/saves.ts`: the run's city and the profile that outlives it as separate saves, and a
      hardcore setting that deletes the run's save on defeat.
- [ ] 4. The panels that open and close a run, over the map rather than as screens.
- [ ] 5. The first upgrade web: nine nodes, three branches, capabilities and information only.
- [ ] 6. `scripts/balance.mjs` and `npm run balance`: the simulation headless over many seeds
      against scripted policies, writing `balance/history.jsonl` the way perf writes its own.
- [ ] 7. Tune until the four criteria in the brief hold, and record which run produced each
      constant.
- [ ] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.

# Backlog
- `item_077_runs_science_and_prestige_leaving_an_island_with_something`

# Definition of Done (DoD)
- [ ] Code is implemented and reviewed.
- [ ] Validation passes.
- [ ] Linked docs are synchronized.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: implemented and validated here.
- request-AC2 -> This task. Proof: implemented and validated here.
- request-AC3 -> This task. Proof: implemented and validated here.
- request-AC4 -> This task. Proof: implemented and validated here.
- request-AC5 -> This task. Proof: implemented and validated here.
- request-AC6 -> This task. Proof: implemented and validated here.
- backlog-AC1 -> This task. Proof: the task stays inside the slice's scope.
- backlog-AC2 -> This task. Proof: the task is the executable surface of the slice.

# Validation
- Expected: `npm run ci`, and `npm run test:e2e` locally -- browser coverage is local, see
  `CONTRIBUTING.md`.
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_028_runs_science_and_prestige_leaving_an_island_with_something`
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
