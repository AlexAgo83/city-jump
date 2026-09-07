## item_195_attribute_the_clustered_container_pass_cost_before_changing_it - Attribute the clustered container pass cost before changing it
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
- Keywords: attribute, clustered, container, pass, cost, before, changing
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- The container pass is known to cost 32.1% at night-saved, but not which of its parameters carries that cost.

# Scope
- In:
  - Vary maxRange, tile counts, depth slices, lamp count and receiver area independently, each three rounds, each ablation failing loudly if it reaches nothing.
- Out:
  - Shipping any change; revisiting the distance policy item_190 rejected.

# Acceptance criteria
- AC1: Each parameter is varied alone and measured over three interleaved rounds, with the ablation proving it applied.
- AC2: The report names which parameter carries the cost and which do not, so later slices target a cause.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Each parameter is varied alone and measured over three interleaved rounds, with the ablation proving it applied.
- request-AC5 -> This backlog slice. Proof: AC2: The report names which parameter carries the cost and which do not, so later slices target a cause.

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
