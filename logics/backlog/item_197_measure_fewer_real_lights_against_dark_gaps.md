## item_197_measure_fewer_real_lights_against_dark_gaps - Measure fewer real lights against dark gaps
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
- Keywords: measure, fewer, real, lights, against, dark, gaps
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- Every lamp carries a real pool and facade light; the city may not need one per lamp to read as lit.

# Scope
- In:
  - Spacing or a cap on how many lamps carry real lights, measured separately from maxRange, with paired night captures at three framings.
- Out:
  - Removing lamp geometry or emissive bulbs, which measured free.

# Acceptance criteria
- AC1: Road and facade readability show no dark gaps in paired captures, or the candidate is rejected with them.
- AC2: Camera travel creates or disposes no emitter pools.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: Road and facade readability show no dark gaps in paired captures, or the candidate is rejected with them.
- request-AC5 -> This backlog slice. Proof: AC2: Camera travel creates or disposes no emitter pools.
- request-AC6 -> This backlog slice. Proof: AC2: Camera travel creates or disposes no emitter pools.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_041_a_city_that_stays_readable_at_night_without_paying_twice_for_it`
- Architecture decision(s): (none yet)
- Request: `req_055_reduce_the_clustered_night_lighting_pass`
- Primary task(s): `task_056_deliver_the_measured_night_lighting_pass_reduction`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Outcome
- Rejected on 2026-09-07. Every lamp keeps its real pool and facade light.
- Half the lamps disabled while both containers stay enabled (`perf/reviews/task056-attrib-halflamps/`), three rounds: +0.5% night-saved, -0.7% night-street, +0.8% night-overview.
- That repeats what task_055 measured from the other end: disabling all 808 emitters bought +1.0%. Lamp count is not what the pass costs, so thinning the lamps trades dark gaps for nothing.
- No captures were needed to reject it: with no gain to weigh, there was no trade to judge.
