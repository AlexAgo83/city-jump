## task_027_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows - A city that has to be fed: food, materials and a population that grows
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
- Summary: Implementing the districts start owing each other something, and a parcel waits for demand.
- Keywords: city, fed, food, materials, population, grows
- Use when: Executing this slice, or checking what it was meant to deliver.
- Skip when: You need the product reasoning -- that is in the linked briefs.

# Context
- It is what makes a city feel alive rather than finished.
- Scope and boundaries are on the linked backlog item; the reasoning is in the linked briefs.

# Plan
- [ ] 1. `sim/economy.ts` grows production: food from staffed farms, materials from staffed
      industry, services and trade from staffed commerce, all per simulation day.
- [ ] 2. Population becomes a stock that grows and falls -- capped by housing, gated by food,
      pulled by jobs and services -- rather than a number derived from parcel area.
- [ ] 3. Population lives in buildings: a home destroyed takes the share it held.
- [ ] 4. `sim/slots.ts`: a zoned parcel waits for demand and fills over time, instead of every
      valid parcel becoming a building on sight.
- [ ] 5. Every rule returns its terms as well as its value, which is what the ledger will display
      in the interface slice -- and what stops the two from ever disagreeing.
- [ ] 6. Tests: a city of nothing but housing stalls; a famine falls; the same seed gives the same
      city.
- [ ] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.

# Backlog
- `item_074_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows`

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
- backlog-AC1 -> This task. Proof: the task stays inside the slice's scope.
- backlog-AC2 -> This task. Proof: the task is the executable surface of the slice.

# Validation
- Expected: `npm run ci`, and `npm run test:e2e` locally -- browser coverage is local, see
  `CONTRIBUTING.md`.
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_025_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows`
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
