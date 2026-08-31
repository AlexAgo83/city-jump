## item_074_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows - A city that has to be fed: food, materials and a population that grows
> From version: 0.3.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-31 23:10:29

# AI Context
- Summary: The delivery slice for the districts start owing each other something, and a parcel waits for demand.
- Keywords: city, fed, food, materials, population, grows
- Use when: Planning or reviewing this slice of `road_002_city_jump_a_city_worth_defending`.
- Skip when: You need another slice of the roadmap, or the product reasoning behind this one.

# Problem
- It is what makes a city feel alive rather than finished.

# Scope
- In:
  - Farms make food, industry materials, commerce services and trade -- only while staffed.
  - Population grows over time, capped by housing, gated by food, and falls with famine or with the homes that held it.
  - A zoned parcel waits for demand and fills over time.
  - The gauges start gating rather than reporting.
- Out:
  - Utilities, the wave, the run.

# Acceptance criteria
- AC1: The backlog slice stays bounded for a city that has to be fed: food, materials and a population that grows.
- AC2: The backlog slice is reviewable and promotable into a task.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: production only while staffed; proven by unit tests over staffed and unstaffed parcels.
- request-AC2 -> This backlog slice. Proof: population growing, capped and falling; proven by unit tests including a famine and a destroyed home.
- request-AC3 -> This backlog slice. Proof: a parcel waiting for demand; proven by unit tests on `sim/slots.ts` and an interaction check.
- request-AC4 -> This backlog slice. Proof: a housing-only city stalling; proven by a unit test that builds one and reads the gauges.
- request-AC5 -> This backlog slice. Proof: determinism; proven by replaying the same seed twice with no renderer.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
- Request: `req_025_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows`
- Primary task(s): `task_027_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows`

# Priority
- Priority: Medium
- Rationale: It is what makes a city feel alive rather than finished.

# Notes
- Sequenced by `road_002_city_jump_a_city_worth_defending`; the order there is a risk order.

# Tasks
- `task_027_a_city_that_has_to_be_fed_food_materials_and_a_population_that_grows`
