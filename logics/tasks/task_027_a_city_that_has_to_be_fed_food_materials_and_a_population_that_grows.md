## task_027_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows - A city that has to be fed: food, materials and a population that grows
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-01 08:12:54
> Owner: Codex

# AI Context
- Summary: Implementing the districts start owing each other something, and a parcel waits for demand.
- Keywords: city, fed, food, materials, population, grows
- Use when: Executing this slice, or checking what it was meant to deliver.
- Skip when: You need the product reasoning -- that is in the linked briefs.

# Context
- It is what makes a city feel alive rather than finished.
- Scope and boundaries are on the linked backlog item; the reasoning is in the linked briefs.

# Plan
- [x] 1. `sim/economy.ts` grows production: food from staffed farms, materials from staffed
      industry, services and trade from staffed commerce, all per simulation day.
- [x] 2. Population becomes a stock that grows and falls -- capped by housing, gated by food,
      pulled by jobs and services -- rather than a number derived from parcel area.
- [x] 3. Population lives in buildings: a home destroyed takes the share it held.
- [x] 4. `sim/slots.ts`: a zoned parcel waits for demand and fills over time, instead of every
      valid parcel becoming a building on sight.
- [x] 5. Every rule returns its terms as well as its value, which is what the ledger will display
      in the interface slice -- and what stops the two from ever disagreeing.
- [x] 6. Tests: a city of nothing but housing stalls; a famine falls; the same seed gives the same
      city.
- [x] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.

# Backlog
- `item_074_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows`

# Definition of Done (DoD)
- [x] Code is implemented and reviewed.
- [x] Validation passes.
- [x] Linked docs are synchronized.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: production only while staffed; proven by unit tests over staffed and unstaffed parcels.
- request-AC2 -> This task. Proof: population growing, capped and falling; proven by unit tests including a famine and a destroyed home.
- request-AC3 -> This task. Proof: a parcel waiting for demand; proven by unit tests on `sim/slots.ts` and an interaction check.
- request-AC4 -> This task. Proof: a housing-only city stalling; proven by a unit test that builds one and reads the gauges.
- request-AC5 -> This task. Proof: determinism; proven by replaying the same seed twice with no renderer.
- backlog-AC1 -> This task. Proof: the task stays inside the slice's scope.
- backlog-AC2 -> This task. Proof: the task is the executable surface of the slice.

# Validation
- Expected: `npm run ci`, and `npm run test:e2e` locally -- browser coverage is local, see
- command: `npm run ci && npm run test:e2e` | result: passed | date: 2026-09-01
- Finish workflow executed on 2026-09-01.
- Linked backlog/request close verification passed.
  `CONTRIBUTING.md`.
- (no validation recorded yet)

# Report
- Added deterministic resources, population persistence, demand-gated zoning, and unit/browser validation.
- Finished on 2026-09-01.
- Linked backlog item(s): `item_074_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows`
- Related request(s): `req_025_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows`

# Links
- Request: `req_025_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows`
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
