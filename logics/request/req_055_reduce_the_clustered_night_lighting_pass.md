## req_055_reduce_the_clustered_night_lighting_pass - Reduce the clustered night lighting pass
> From version: 0.5.2
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 20:07:46

# AI Context
- Summary: The night cost is the clustered light container's own per-frame pass, measured at +32.1% for streetlights and +14.0% for headlights at the saved night framing, while all 808 emitters inside them are worth +1.0%. Attack the pass, not the lamps.
- Keywords: reduce, clustered, night, lighting, pass
- Use when: night frame time is the target, or a lighting change needs to know where the cost actually sits.
- Skip when: proposing distance-based lamp culling, which `item_190` already rejected on measurement, or a new lighting engine.

# Needs
- Night frames pay for two clustered light containers whose cost is the pass itself, not the lamps in it; find whether any of that is recoverable without losing night readability.

# Context
- Measured in task_055 over three interleaved rounds each, read as per-round paired deltas. Disabling the streetlight clustered container buys +32.1% frame p50 at night-saved, +25.0% night-street and +11.8% night-overview; the headlight container buys +14.0% / +12.3% / +15.3%.
- Disabling all 808 individual emitters while both containers stay enabled buys +1.0%, and dimming the emissive bulb materials buys nothing. The cost is the container's own per-frame pass, not the emitters or the lit bulbs.
- item_190 rejected a distance policy on that evidence and remains correct: a distance policy can only reach individual lamps, which is the +1.0% row. This request does not revisit that decision, it attacks the pass instead.
- Evidence lives in perf/reviews/task055-wave3-lights-ablation-streetlights, -headlights, -emitters, -bulbs and -all. Comparisons must be read with scripts/review/paired.mjs, and any new ablation must fail loudly rather than return a sample when it reaches nothing.
- The ground is the largest receiver of these lights: it costs -0.0% by day and +11.9% by night at the identical saved framing, so a cheaper lighting model would show up there first.

# Acceptance criteria
- AC1: The container pass cost is attributed before anything is changed: maxRange, tile and depth-slice counts, lamp count and receiver area are each varied independently and measured, so the shipped change targets a cause rather than a correlation.
- AC2: Lowering ClusteredLightContainer maxRange, currently 52 m for streetlights and 42 m for headlights, is measured and either retained with night screenshots showing unchanged pool and facade reach, or rejected with its recorded cost and the reach it would have cost.
- AC3: Reducing how many lamps carry a real light, by spacing or by a cap, is measured separately from maxRange and judged on paired night captures at street, district and saved framings; road and facade readability must not regress into dark gaps.
- AC4: Whether this scene needs a clustered container at all is answered with a measured prototype of a cheaper lighting model, or with a recorded reason it cannot be tried; a rejected prototype is removed and keeps its evidence.
- AC5: Each candidate carries three interleaved rounds against the current integrated baseline, read as per-round paired deltas, or a documented measured rejection. No feature ablation is reported as an implemented gain.
- AC6: The player's lights switch keeps its current all-or-nothing behaviour, day frames still pay no night-light pass, and camera travel creates or disposes no emitter pools; npm run ci, npm run test:e2e and Logics validation pass, and docs/performance.md records the shipped policy and the rejected candidates.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_041_a_city_that_stays_readable_at_night_without_paying_twice_for_it`
- Architecture decision(s): (none yet)

# References
- src/render/streetlights.ts
- src/render/vehicleLights.ts
- src/render/postFx.ts
- scripts/review/distance.mjs
- docs/performance.md
- logics/backlog/item_190_bound_distant_night_lighting_while_preserving_city_readability.md

# Backlog
- `item_195_attribute_the_clustered_container_pass_cost_before_changing_it`
- `item_196_measure_a_lower_clustered_maxrange_against_night_reach`
- `item_197_measure_fewer_real_lights_against_dark_gaps`
- `item_198_answer_whether_this_scene_needs_a_clustered_container`
