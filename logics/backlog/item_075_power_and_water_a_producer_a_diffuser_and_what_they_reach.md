## item_075_power_and_water_a_producer_a_diffuser_and_what_they_reach - Power and water: a producer, a diffuser and what they reach
> From version: 0.3.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 08:34:23

# AI Context
- Summary: The delivery slice for the second placement verb: a producer, a network on the roads, and a diffuser with a radius.
- Keywords: power, water, producer, diffuser, they, reach
- Use when: Planning or reviewing this slice of `road_002_city_jump_a_city_worth_defending`.
- Skip when: You need another slice of the roadmap, or the product reasoning behind this one.

# Problem
- It gives the kaiju something to break that costs more than the building it broke.

# Scope
- In:
  - A Build tool: a producer and a diffuser, priced, placed and staffed.
  - Power and water carried by road segments, from producer to diffuser.
  - Per-district needs: water for homes and farms, power for industry and the military, both for commerce.
  - A Utilities view, and an alert when a diffuser falls and a district goes dark.
- Out:
  - A free-form buried network with its own graph -- option B, deliberately in reserve.

# Acceptance criteria
- AC1: The backlog slice stays bounded for power and water: a producer, a diffuser and what they reach.
- AC2: The backlog slice is reviewable and promotable into a task.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: producer, diffuser and radius; proven by `sim/utilities.ts` unit tests.
- request-AC2 -> This backlog slice. Proof: the network over road segments, saved and restored; proven by unit tests and a save round trip.
- request-AC3 -> This backlog slice. Proof: a building idle for a missing utility, and saying which; proven by an interaction check.
- request-AC4 -> This backlog slice. Proof: the Utilities view; proven by an interaction check and a screenshot.
- request-AC5 -> This backlog slice. Proof: a destroyed diffuser putting its district out, with its alert; proven by an interaction check.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_018_a_city_that_has_to_survive_what_comes_out_of_the_sea`
- Architecture decision(s): (none yet)
- Request: `req_026_power_and_water_a_producer_a_diffuser_and_what_they_reach`
- Primary task(s): `task_028_power_and_water_a_producer_a_diffuser_and_what_they_reach`

# Priority
- Priority: Medium
- Rationale: It gives the kaiju something to break that costs more than the building it broke.

# Notes
- Sequenced by `road_002_city_jump_a_city_worth_defending`; the order there is a risk order.
- Task `task_028_power_and_water_a_producer_a_diffuser_and_what_they_reach` was finished via `logics-manager flow finish task` on 2026-09-01.

# Tasks
- `task_028_power_and_water_a_producer_a_diffuser_and_what_they_reach`
