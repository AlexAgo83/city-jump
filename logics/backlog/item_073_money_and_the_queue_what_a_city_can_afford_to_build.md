## item_073_money_and_the_queue_what_a_city_can_afford_to_build - Money and the queue: what a city can afford to build
> From version: 0.3.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 45%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 00:57:33

# AI Context
- Summary: The delivery slice for prices, a treasury, a build queue, and a demolition that gives half back.
- Keywords: money, queue, city, can, afford, build
- Use when: Planning or reviewing this slice of `road_002_city_jump_a_city_worth_defending`.
- Skip when: You need another slice of the roadmap, or the product reasoning behind this one.

# Problem
- Meters expansion, which the wave needs to be able to outpace.

# Scope
- In:
  - Roads priced by the metre; buildings priced to build; prices shown before the click.
  - A treasury fed by population tax and by trade in staffed commercial parcels.
  - The city raises what it can afford and queues the rest, readably.
  - Rebuilding proceeds into a negative balance; only new work waits.
  - Demolition takes time and returns half.
- Out:
  - What the money buys the city in production -- that is the food and materials slice.

# Acceptance criteria
- AC1: The backlog slice stays bounded for money and the queue: what a city can afford to build.
- AC2: The backlog slice is reviewable and promotable into a task.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: prices before the click and refusal after it; proven by an interaction check on a road and a zone.
- request-AC2 -> This backlog slice. Proof: the queue and its readout; proven by unit tests on the queue and an interaction check on the line.
- request-AC3 -> This backlog slice. Proof: rebuilding into a negative balance while new work waits; proven by its own unit test.
- request-AC4 -> This backlog slice. Proof: demolition taking time and returning half; proven by unit tests.
- request-AC5 -> This backlog slice. Proof: income from tax and trade; proven by `sim/economy.ts` unit tests from a fixed seed.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
- Request: `req_024_money_and_the_queue_what_a_city_can_afford_to_build`
- Primary task(s): `task_026_money_and_the_queue_what_a_city_can_afford_to_build`

# Priority
- Priority: Medium
- Rationale: Meters expansion, which the wave needs to be able to outpace.

# Notes
- Sequenced by `road_002_city_jump_a_city_worth_defending`; the order there is a risk order.

# Tasks
- `task_026_money_and_the_queue_what_a_city_can_afford_to_build`
