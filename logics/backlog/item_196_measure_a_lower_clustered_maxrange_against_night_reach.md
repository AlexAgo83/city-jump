## item_196_measure_a_lower_clustered_maxrange_against_night_reach - Measure a lower clustered maxRange against night reach
> From version: 0.5.2
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 19:42:05

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: measure, lower, clustered, maxrange, against, night, reach
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- maxRange bounds every light for clustering at 52 m and 42 m; a smaller bound may cost pool and facade reach.

# Scope
- In:
  - Candidate ranges measured at street, district and saved night framings, with paired captures of pool and facade reach.
- Out:
  - Changing light intensities or the lamp model to compensate.

# Acceptance criteria
- AC1: Retained only with night captures showing unchanged usable reach, or rejected with the recorded cost and the reach it would have cost.
- AC2: Day frames still pay no night-light pass and the player's lights switch is unchanged.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Retained only with night captures showing unchanged usable reach, or rejected with the recorded cost and the reach it would have cost.
- request-AC5 -> This backlog slice. Proof: AC2: Day frames still pay no night-light pass and the player's lights switch is unchanged.
- request-AC6 -> This backlog slice. Proof: AC2: Day frames still pay no night-light pass and the player's lights switch is unchanged.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_041_a_city_that_stays_readable_at_night_without_paying_twice_for_it`
- Architecture decision(s): (none yet)
- Request: `req_055_reduce_the_clustered_night_lighting_pass`
- Primary task(s): `task_056_deliver_the_measured_night_lighting_pass_reduction`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Outcome
- Rejected on 2026-09-07. `maxRange` stays at 52 m for streetlights and 42 m for headlights.
- The candidates, three rounds each at night-saved / night-street / night-overview:
  - 24 m (`perf/reviews/task056-attrib-range/`): +7.5% / +12.9% / +4.2%, and the facades go dark. `docs/media/nightrange-max24.png` against `nightrange-current.png`: the warm lit fronts are gone and only small ground pools remain. This is the blackout the slice was scoped to avoid.
  - 32 m (`perf/reviews/task056-range32/`): +4.3% / +7.1% / +0.8%, facades still lit, ground pools visibly smaller (`docs/media/nightrange-max32.png`).
  - Fitted to the longest light each container actually holds, 44 m and 38 m (`perf/reviews/task056-rangefit/`): +0.5% / +0.0% / +0.0%.
- AC1 asks for retention only with captures showing unchanged pool and facade reach. The fitted value is the only candidate that clips nothing, and it buys nothing: the headroom between 52 and 44 costs no frame time. Every candidate that pays does so by cutting real light reach, and 32 m changes the pools even though it keeps the facades.
- So the cost is not slack in the parameter, it is the volume each light occupies in the cluster. Buying frame time here means buying it from the picture, which this slice was not scoped to spend.
