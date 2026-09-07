## item_195_attribute_the_clustered_container_pass_cost_before_changing_it - Attribute the clustered container pass cost before changing it
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

# Outcome
- Attribution complete on 2026-09-07, three rounds each, per-round paired deltas at night-saved / night-street / night-overview. Every ablation refuses to run if the value it wants is already in place, so a null reading cannot mean "no measurement".
- `maxRange` 52 and 42 m down to 24 m (`perf/reviews/task056-attrib-range/`): +7.5% / +12.9% / +4.2%. This is the parameter that carries the pass cost.
- Horizontal and vertical tiles halved (`.../task056-attrib-tiles/`): -3.2% / -0.7% / -4.1%. Negative, and consistent with Babylon's own note that fewer tiles make clustering faster and rendering slower.
- Depth slices halved (`.../task056-attrib-slices/`): -2.7% / -4.3% / -7.5%. Also negative.
- Half the lamps keeping a real light (`.../task056-attrib-halflamps/`): +0.5% / -0.7% / +0.8%. Lamp count does not carry the cost, which repeats what task_055 already measured with all 808 emitters disabled.
- Method note kept with the result: the clustered container's own parameters persist, unlike the enabled flags and material colours the game rewrites every hour change. Re-applying them each frame makes the container rebuild its clustering continuously, which fails the probe's own "city and traffic advanced" guard and would have measured that rebuild rather than the parameter. `scripts/review/distance.mjs` applies these three once and the rest every frame.
