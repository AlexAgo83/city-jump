## task_032_close_the_loops_a_run_of_several_waves_a_city_that_survives_its_first_day_and_resources_that_are_spent - Close the loops: a run of several waves, a city that survives its first day, and resources that are spent
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 12:06:39
> Owner: Codex

# AI Context
- Summary: The executable surface of `req_030`: the run loop first, then the starving start, then the resources, then the military zone.
- Keywords: close, loops, run, several, waves, city, survives, first, day, resources, spent
- Use when: Implementing or reviewing the connective work across the survival slices.
- Skip when: You need a single slice's own design rather than what falls between them.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Read this request and its four slices, then read the survival brief the survival brief beside the code. Every defect here is a promise in that brief that no single slice's acceptance criteria was shaped to catch.
- [x] 2. Measure before changing, the way these findings were found: run the real modules headlessly over a starter city and read what comes out. Every number in this request came from executing `src/sim/workforce.ts`, `src/sim/economy.ts` and `src/sim/slots.ts`, not from reading them.
- [x] 3. Take the run loop first. Until a second wave exists, nothing downstream of a verdict can be observed at all, and the threat scaling has nothing to scale across.
- [x] 4. Then the starving start, because every later balance question is asked from a city that currently cannot exist.
- [x] 5. Then the resources, which is the slice with a real product decision in it: materials get a sink or stop being produced, and carrying them unspent is not one of the options.
- [x] 6. Then the military zone, which is small and is the one place the brush and the rules openly contradict each other.
- [x] 7. Coordinate with the wave legibility request: the wave scaling here and the combat retune there are the same numbers from two sides, and whichever runs second inherits the other's constants. The balance harness that request rewrites onto the real simulation is what checks both.
- [x] 8. Leave a headless test behind for each defect. Every one of these survived seven closeouts because nothing was watching the loop as a whole; a test that plays a run is the thing that was missing.
- [x] 9. Run `npm run ci`, `npm run test:e2e` and `npm run balance` locally; the browser suite is the local gate.
- [x] 10. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. The acceptance criteria this request finds unmet belong in the closeout by name.
- [x] 11. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_082_a_run_that_keeps_going_the_next_wave_a_threat_that_scales_and_a_wave_the_player_can_call`
- `item_083_a_starting_city_that_can_staff_a_building_and_feed_itself`
- `item_084_resources_that_something_spends_counted_once`
- `item_085_a_military_zone_that_builds_something`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
> Shared proof: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9. The four linked slices form one integrated survival loop, validated as one run.

- request-AC1 -> This task. Proof: Implemented across commits caef5dd, 1fe4f2e, 21ce13b, 503b5e2, 77eb07c, b39eb39, and 90e7972. Verified on 2026-09-01 with npm run ci (36 Vitest files, 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit OK), npm run test:e2e (all interaction checks passed, dynamic Kaiju HP banner 1140/1140 observed), and npm run balance (6 runs avg=25.5s salvos=7.0). Source: `90e7972`
- request-AC2 -> This task. Proof: Implemented across commits caef5dd, 1fe4f2e, 21ce13b, 503b5e2, 77eb07c, b39eb39, and 90e7972. Verified on 2026-09-01 with npm run ci (36 Vitest files, 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit OK), npm run test:e2e (all interaction checks passed, dynamic Kaiju HP banner 1140/1140 observed), and npm run balance (6 runs avg=25.5s salvos=7.0). Source: `90e7972`
- request-AC3 -> This task. Proof: Implemented across commits caef5dd, 1fe4f2e, 21ce13b, 503b5e2, 77eb07c, b39eb39, and 90e7972. Verified on 2026-09-01 with npm run ci (36 Vitest files, 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit OK), npm run test:e2e (all interaction checks passed, dynamic Kaiju HP banner 1140/1140 observed), and npm run balance (6 runs avg=25.5s salvos=7.0). Source: `90e7972`
- request-AC9 -> This task. Proof: Implemented across commits caef5dd, 1fe4f2e, 21ce13b, 503b5e2, 77eb07c, b39eb39, and 90e7972. Verified on 2026-09-01 with npm run ci (36 Vitest files, 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit OK), npm run test:e2e (all interaction checks passed, dynamic Kaiju HP banner 1140/1140 observed), and npm run balance (6 runs avg=25.5s salvos=7.0). Source: `90e7972`
- request-AC4 -> This task. Proof: Implemented across commits caef5dd, 1fe4f2e, 21ce13b, 503b5e2, 77eb07c, b39eb39, and 90e7972. Verified on 2026-09-01 with npm run ci (36 Vitest files, 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit OK), npm run test:e2e (all interaction checks passed, dynamic Kaiju HP banner 1140/1140 observed), and npm run balance (6 runs avg=25.5s salvos=7.0). Source: `90e7972`
- request-AC9 -> This task. Proof: Implemented across commits caef5dd, 1fe4f2e, 21ce13b, 503b5e2, 77eb07c, b39eb39, and 90e7972. Verified on 2026-09-01 with npm run ci (36 Vitest files, 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit OK), npm run test:e2e (all interaction checks passed, dynamic Kaiju HP banner 1140/1140 observed), and npm run balance (6 runs avg=25.5s salvos=7.0). Source: `90e7972`
- request-AC5 -> This task. Proof: Implemented across commits caef5dd, 1fe4f2e, 21ce13b, 503b5e2, 77eb07c, b39eb39, and 90e7972. Verified on 2026-09-01 with npm run ci (36 Vitest files, 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit OK), npm run test:e2e (all interaction checks passed, dynamic Kaiju HP banner 1140/1140 observed), and npm run balance (6 runs avg=25.5s salvos=7.0). Source: `90e7972`
- request-AC6 -> This task. Proof: Implemented across commits caef5dd, 1fe4f2e, 21ce13b, 503b5e2, 77eb07c, b39eb39, and 90e7972. Verified on 2026-09-01 with npm run ci (36 Vitest files, 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit OK), npm run test:e2e (all interaction checks passed, dynamic Kaiju HP banner 1140/1140 observed), and npm run balance (6 runs avg=25.5s salvos=7.0). Source: `90e7972`
- request-AC8 -> This task. Proof: Implemented across commits caef5dd, 1fe4f2e, 21ce13b, 503b5e2, 77eb07c, b39eb39, and 90e7972. Verified on 2026-09-01 with npm run ci (36 Vitest files, 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit OK), npm run test:e2e (all interaction checks passed, dynamic Kaiju HP banner 1140/1140 observed), and npm run balance (6 runs avg=25.5s salvos=7.0). Source: `90e7972`
- request-AC9 -> This task. Proof: Implemented across commits caef5dd, 1fe4f2e, 21ce13b, 503b5e2, 77eb07c, b39eb39, and 90e7972. Verified on 2026-09-01 with npm run ci (36 Vitest files, 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit OK), npm run test:e2e (all interaction checks passed, dynamic Kaiju HP banner 1140/1140 observed), and npm run balance (6 runs avg=25.5s salvos=7.0). Source: `90e7972`
- request-AC7 -> This task. Proof: Implemented across commits caef5dd, 1fe4f2e, 21ce13b, 503b5e2, 77eb07c, b39eb39, and 90e7972. Verified on 2026-09-01 with npm run ci (36 Vitest files, 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit OK), npm run test:e2e (all interaction checks passed, dynamic Kaiju HP banner 1140/1140 observed), and npm run balance (6 runs avg=25.5s salvos=7.0). Source: `90e7972`
- request-AC9 -> This task. Proof: Implemented across commits caef5dd, 1fe4f2e, 21ce13b, 503b5e2, 77eb07c, b39eb39, and 90e7972. Verified on 2026-09-01 with npm run ci (36 Vitest files, 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit OK), npm run test:e2e (all interaction checks passed, dynamic Kaiju HP banner 1140/1140 observed), and npm run balance (6 runs avg=25.5s salvos=7.0). Source: `90e7972`

# Validation
- `npm run ci` passed: 36 Vitest files / 251 tests, 6 architecture tests, build/typecheck, Logics lint/audit.
- `npm run test:e2e` passed.
- `npm run balance` passed: 6 runs, average 25.5 s and 7.0 salvos.
- command: `npm run ci && npm run test:e2e && npm run balance` | result: passed | date: 2026-09-01
- Finish workflow executed on 2026-09-01.
- Linked backlog/request close verification passed.

# Report
- Delivered repeat waves, a survivable starter economy, material spending, and the military-zone build path across commits `caef5dd` through `90e7972`.
- Finished on 2026-09-01.
- Linked backlog item(s): `item_082_a_run_that_keeps_going_the_next_wave_a_threat_that_scales_and_a_wave_the_player_can_call`, `item_083_a_starting_city_that_can_staff_a_building_and_feed_itself`, `item_084_resources_that_something_spends_counted_once`, `item_085_a_military_zone_that_builds_something`
- Related request(s): `req_030_the_loops_that_never_close_a_run_of_one_wave_a_city_that_starves_on_day_one_and_resources_nothing_consumes`

# Links
- Request: `req_030_the_loops_that_never_close_a_run_of_one_wave_a_city_that_starves_on_day_one_and_resources_nothing_consumes`
- Product brief(s): `prod_021_a_run_that_is_more_than_one_wave`
- Architecture decision(s): (none yet)
