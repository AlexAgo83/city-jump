## task_025_nothing_works_without_people_staffing_construction_time_and_building_states - Nothing works without people: staffing, construction time and building states
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-31 23:04:49

# AI Context
- Summary: Implementing staffing from one shared workforce, construction time, and a building whose state reads on the map.
- Keywords: nothing, works, people, staffing, construction, time, building, states
- Use when: Executing this slice, or checking what it was meant to deliver.
- Skip when: You need the product reasoning -- that is in the linked briefs.

# Context
- The keystone: without it, building is free and the game is a painting exercise.
- Scope and boundaries are on the linked backlog item; the reasoning is in the linked briefs.

# Plan
- [ ] 1. `sim/workforce.ts`: population to workforce, a demand per parcel derived from its kind and
      size, and an allocation from one global stock in a fixed priority. Pure, tested from a seed.
- [ ] 2. `sim/buildingKinds.ts`: the needs gauges read staffing rather than parcel counts, so what
      the panel shows and what the city does stop being two different things.
- [ ] 3. A parcel gains a lifecycle -- rising, working, idle, rebuilding -- carried in the same
      derived state as the parcels themselves and saved with the city.
- [ ] 4. `render/buildings.ts`: scaffolding for a parcel that is rising, an unlit and lifeless one
      for idle, rubble for rebuilding. Instance colour already exists as the seam for this.
- [ ] 5. The selection panel says why a building is idle, which is where the diagnosis lives until
      the interface slice moves it.
- [ ] 6. Measure: a city of 2,800 buildings changing state must not cost a full rebuild.
- [ ] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.

# Backlog
- `item_072_nothing_works_without_people_staffing_construction_time_and_building_states`

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
- backlog-AC1 -> This task. Proof: the task stays inside the slice's scope.
- backlog-AC2 -> This task. Proof: the task is the executable surface of the slice.

# Validation
- Expected: `npm run ci`, and `npm run test:e2e` locally -- browser coverage is local, see
  `CONTRIBUTING.md`.
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_023_nothing_works_without_people_staffing_construction_time_and_building_states`
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
