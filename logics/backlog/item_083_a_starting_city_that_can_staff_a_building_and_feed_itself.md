## item_083_a_starting_city_that_can_staff_a_building_and_feed_itself - A starting city that can staff a building and feed itself
> From version: 0.3.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 85%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-01 11:47:46

# AI Context
- Summary: The delivery slice for the opening: a starting city whose workforce can staff a building, so a fresh run does not starve to zero in its first simulated day.
- Keywords: starting, city, can, staff, building, feed, itself
- Use when: Working on the starting balance, the workforce rules, or the starter kit's viability.
- Skip when: You need the wave, or resources beyond what survival requires.

# Problem
- A new run starts with twelve people, so `workforceFromPopulation` gives six workers. The smallest parcel a farm may occupy is 1x4, because agricultural, industrial and military are all restricted to `INDUSTRIAL_SIZES`, and a 1x4 farm demands twelve workers.
- Run against the starter kit's own parcels, `allocateWorkforce` returns `staffed=0`. No farm can be staffed by anyone, at any point, in a fresh city.
- With no food produced and twelve consumed, `CityEconomy.advance` reports a shortage of twelve and a change of minus twelve: the population reaches zero within one simulated day of ninety-six seconds, which ends the run through `endIfPopulationZero`.
- `allocateWorkforce` is all-or-nothing per parcel, so a building one worker short produces exactly as much as an empty one -- which is what turns a small shortfall into a dead city rather than a slow one.

# Scope
- In:
  - Make the opening survivable, and choose the lever deliberately rather than by whichever constant is nearest: the minimum parcel size for farms, the starting population, the workforce fraction, or partial staffing instead of all-or-nothing.
  - Price the all-or-nothing rule specifically -- a partly staffed building producing partly is both gentler and more legible, and it changes every later shortage as well as this one.
  - Check the whole opening, not the single number: the starter kit's parcels, the first sixty seconds before the wave, and what the gauges say while it happens.
  - Leave a headless test that fails if a fresh run starves again, since this is a defect that no slice's own acceptance criteria would have caught.
  - Record the chosen numbers and the reasoning, so the next change to them starts from a stated intent.
- Out:
  - New resources or new production rules.
  - Difficulty options -- the opening is either survivable or it is not.
  - The wave's own balance.
  - Reworking what the starter kit contains beyond what survival requires.

# Acceptance criteria
- AC1: A fresh run can staff at least one producing building with its starting workforce.
- AC2: A fresh run does not fall to zero population in its first simulated day, proven by a headless test over the real economy.
- AC3: The staffing rule's all-or-nothing behaviour is either changed or kept with the reasoning recorded.
- AC4: The chosen numbers and the lever they were chosen over are written down.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: A fresh run can staff at least one producing building with its starting workforce.
- request-AC9 -> This backlog slice. Proof: AC2: A fresh run does not fall to zero population in its first simulated day, proven by a headless test over the real economy.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_021_a_run_that_is_more_than_one_wave`
- Architecture decision(s): (none yet)
- Request: `req_030_the_loops_that_never_close_a_run_of_one_wave_a_city_that_starves_on_day_one_and_resources_nothing_consumes`
- Primary task(s): `task_032_close_the_loops_a_run_of_several_waves_a_city_that_survives_its_first_day_and_resources_that_are_spent`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
