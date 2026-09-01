## task_032_close_the_loops_a_run_of_several_waves_a_city_that_survives_its_first_day_and_resources_that_are_spent - Close the loops: a run of several waves, a city that survives its first day, and resources that are spent
> From version: 0.3.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 85%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 11:47:46
> Owner: Codex

# AI Context
- Summary: The executable surface of `req_030`: the run loop first, then the starving start, then the resources, then the military zone.
- Keywords: close, loops, run, several, waves, city, survives, first, day, resources, spent
- Use when: Implementing or reviewing the connective work across the survival slices.
- Skip when: You need a single slice's own design rather than what falls between them.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Read this request and its four slices, then read the survival brief the survival brief beside the code. Every defect here is a promise in that brief that no single slice's acceptance criteria was shaped to catch.
- [ ] 2. Measure before changing, the way these findings were found: run the real modules headlessly over a starter city and read what comes out. Every number in this request came from executing `src/sim/workforce.ts`, `src/sim/economy.ts` and `src/sim/slots.ts`, not from reading them.
- [ ] 3. Take the run loop first. Until a second wave exists, nothing downstream of a verdict can be observed at all, and the threat scaling has nothing to scale across.
- [ ] 4. Then the starving start, because every later balance question is asked from a city that currently cannot exist.
- [ ] 5. Then the resources, which is the slice with a real product decision in it: materials get a sink or stop being produced, and carrying them unspent is not one of the options.
- [ ] 6. Then the military zone, which is small and is the one place the brush and the rules openly contradict each other.
- [ ] 7. Coordinate with the wave legibility request: the wave scaling here and the combat retune there are the same numbers from two sides, and whichever runs second inherits the other's constants. The balance harness that request rewrites onto the real simulation is what checks both.
- [ ] 8. Leave a headless test behind for each defect. Every one of these survived seven closeouts because nothing was watching the loop as a whole; a test that plays a run is the thing that was missing.
- [ ] 9. Run `npm run ci`, `npm run test:e2e` and `npm run balance` locally; the browser suite is the local gate.
- [ ] 10. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. The acceptance criteria this request finds unmet belong in the closeout by name.
- [ ] 11. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_082_a_run_that_keeps_going_the_next_wave_a_threat_that_scales_and_a_wave_the_player_can_call`
- `item_083_a_starting_city_that_can_staff_a_building_and_feed_itself`
- `item_084_resources_that_something_spends_counted_once`
- `item_085_a_military_zone_that_builds_something`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_082_a_run_that_keeps_going_the_next_wave_a_threat_that_scales_and_a_wave_the_player_can_call`. Proof deferred to slice closeout.
- request-AC2 -> `item_082_a_run_that_keeps_going_the_next_wave_a_threat_that_scales_and_a_wave_the_player_can_call`. Proof deferred to slice closeout.
- request-AC3 -> `item_082_a_run_that_keeps_going_the_next_wave_a_threat_that_scales_and_a_wave_the_player_can_call`. Proof deferred to slice closeout.
- request-AC9 -> `item_082_a_run_that_keeps_going_the_next_wave_a_threat_that_scales_and_a_wave_the_player_can_call`. Proof deferred to slice closeout.
- request-AC4 -> `item_083_a_starting_city_that_can_staff_a_building_and_feed_itself`. Proof deferred to slice closeout.
- request-AC9 -> `item_083_a_starting_city_that_can_staff_a_building_and_feed_itself`. Proof deferred to slice closeout.
- request-AC5 -> `item_084_resources_that_something_spends_counted_once`. Proof deferred to slice closeout.
- request-AC6 -> `item_084_resources_that_something_spends_counted_once`. Proof deferred to slice closeout.
- request-AC8 -> `item_084_resources_that_something_spends_counted_once`. Proof deferred to slice closeout.
- request-AC9 -> `item_084_resources_that_something_spends_counted_once`. Proof deferred to slice closeout.
- request-AC7 -> `item_085_a_military_zone_that_builds_something`. Proof deferred to slice closeout.
- request-AC9 -> `item_085_a_military_zone_that_builds_something`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_030_the_loops_that_never_close_a_run_of_one_wave_a_city_that_starves_on_day_one_and_resources_nothing_consumes`
- Product brief(s): `prod_021_a_run_that_is_more_than_one_wave`
- Architecture decision(s): (none yet)
