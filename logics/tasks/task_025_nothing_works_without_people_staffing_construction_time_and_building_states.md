## task_025_nothing_works_without_people_staffing_construction_time_and_building_states - Nothing works without people: staffing, construction time and building states
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 00:56:12
> Owner: Codex

# AI Context
- Summary: Implementing staffing from one shared workforce, construction time, and a building whose state reads on the map.
- Keywords: nothing, works, people, staffing, construction, time, building, states
- Use when: Executing this slice, or checking what it was meant to deliver.
- Skip when: You need the product reasoning -- that is in the linked briefs.

# Context
- The keystone: without it, building is free and the game is a painting exercise.
- Scope and boundaries are on the linked backlog item; the reasoning is in the linked briefs.

# Plan
- [x] 1. `sim/workforce.ts`: population to workforce, a demand per parcel derived from its kind and
      size, and an allocation from one global stock in a fixed priority. Pure, tested from a seed.
- [x] 2. `sim/buildingKinds.ts`: the needs gauges read staffing rather than parcel counts, so what
      the panel shows and what the city does stop being two different things.
- [x] 3. A parcel gains a lifecycle -- rising, working, idle, rebuilding -- carried in the same
      derived state as the parcels themselves and saved with the city.
- [x] 4. `render/buildings.ts`: scaffolding for a parcel that is rising, an unlit and lifeless one
      for idle, rubble for rebuilding. Instance colour already exists as the seam for this.
- [x] 5. The selection panel says why a building is idle, which is where the diagnosis lives until
      the interface slice moves it.
- [x] 6. Measure: a city of 2,800 buildings changing state must not cost a full rebuild.
- [x] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.

# Backlog
- `item_072_nothing_works_without_people_staffing_construction_time_and_building_states`

# Definition of Done (DoD)
- [x] Code is implemented and reviewed.
- [x] Validation passes.
- [x] Linked docs are synchronized.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: the workforce and its demand; proven by `sim/workforce.ts` unit tests from a fixed seed.
- request-AC2 -> This task. Proof: the building lifecycle on the map; proven by an interaction check reading instance state.
- request-AC3 -> This task. Proof: determinism; proven by replaying the same seed twice with no renderer.
- request-AC4 -> This task. Proof: a district going idle being visible; proven by an interaction check plus a screenshot.
- backlog-AC1 -> This task. Proof: the task stays inside the slice's scope.
- backlog-AC2 -> This task. Proof: the task is the executable surface of the slice.

# Validation
- Expected: `npm run ci`, and `npm run test:e2e` locally -- browser coverage is local, see
- command: `npm run ci && npm run test:e2e` | result: passed | date: 2026-09-01
- Finish workflow executed on 2026-09-01.
- Linked backlog/request close verification passed.
  `CONTRIBUTING.md`.
- 2026-09-01: `npx vitest run src/sim/workforce.test.ts src/sim/buildingKinds.test.ts` passed.
- 2026-09-01: `npm run ci` passed.
- 2026-09-01: `npm run test:e2e` passed.
- 2026-09-01: `npx vitest run src/sim/buildingLifecycle.test.ts src/sim/workforce.test.ts src/sim/save.test.ts src/render/buildings.test.ts` passed.
- 2026-09-01: `npm run test:e2e` passed after lifecycle rendering and share payload checks.
- 2026-09-01: Large-city debug measurement: 2,836 buildings changed lifecycle state in 5.8 ms; full rebuild of the same city took 1,989 ms.

# Report
- 2026-09-01: Added pure workforce allocation from population, parcel kind and parcel size; non-residential parcels are staffed or idle from one shared worker pool.
- 2026-09-01: Needs gauges now read workforce/staffed demand instead of raw parcel counts.
- 2026-09-01: Added saved building lifecycle state; buildings now progress through construction to working/idle from the shared workforce.
- 2026-09-01: Building renderer now refreshes lifecycle colour/height state without a full city rebuild, and the selection panel shows state/reason.
- 2026-09-01: Share links omit derived lifecycle rows so large cities remain shareable; named saves and autosaves still persist lifecycle state.
- Finished on 2026-09-01.
- Linked backlog item(s): `item_072_nothing_works_without_people_staffing_construction_time_and_building_states`
- Related request(s): `req_023_nothing_works_without_people_staffing_construction_time_and_building_states`

# Links
- Request: `req_023_nothing_works_without_people_staffing_construction_time_and_building_states`
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
