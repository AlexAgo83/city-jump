## item_030_make_rebuild_and_startup_cost_measurable_against_a_known_city - Make rebuild and startup cost measurable against a known city
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 82%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:19:50

# AI Context
- Summary: Nothing in the repo reports what a road placement or a cold start costs, so the numbers in req_008 had to be derived by hand and a regression would be invisible.
- Keywords: rebuild, startup, cost, measurable, against, known, city
- Use when: Adding placement-cost or time-to-first-frame measurement to the browser debug surface, or recording a baseline against the bundled Demo save.
- Skip when: The work adds a CI performance gate, a profiling UI, or a new dependency.

# Problem
- There is no way to see whether a change made a rebuild cheaper or put the whole-city cost back; the findings in this request had to be derived by reading the code and benchmarking by hand.
- The debug surface already reports scene counts, but nothing reports what a placement costs.

# Scope
- In:
  - Capture a repeatable measurement against a known city -- the bundled Demo save is the obvious subject -- covering the cost of one road placement and the time to first frame.
  - Expose it through the existing browser debug surface rather than a new tool, and record a baseline the other items in this request can be compared against.
  - Keep it cheap enough to leave switched off by default.
- Out:
  - A CI performance gate that fails a build on a timing threshold -- shared runners are too noisy for that.
  - A profiling UI, a flamegraph viewer, or a new dependency.

# Acceptance criteria
- AC1: A repeatable measurement of one road placement's cost and of time to first frame can be taken against the bundled Demo save through the existing debug surface.
- AC2: A baseline is recorded before the other items land, so their effect and any later regression are both visible.
- AC3: The measurement is off by default and costs nothing in a normal session.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: A repeatable measurement of one road placement's cost and of time to first frame can be taken against the bundled Demo save through the existing debug surface.
- request-AC7 -> This backlog slice. Proof: AC2: A baseline is recorded before the other items land, so their effect and any later regression are both visible.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_005_a_city_builder_that_stays_responsive_as_the_city_grows`
- Architecture decision(s): (none yet)
- Request: `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`
- Primary task(s): `task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
