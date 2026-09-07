## item_196_measure_a_lower_clustered_maxrange_against_night_reach - Measure a lower clustered maxRange against night reach
> From version: 0.5.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

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
