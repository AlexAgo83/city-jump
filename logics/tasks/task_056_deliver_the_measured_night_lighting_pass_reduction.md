## task_056_deliver_the_measured_night_lighting_pass_reduction - Deliver the measured night lighting pass reduction
> From version: 0.5.2
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: claw
> Indicators reviewed: 2026-09-07 19:42:05

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: deliver, measured, night, lighting, pass, reduction
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Attribute the container pass cost parameter by parameter before changing anything.
- [ ] 2. Measure maxRange, then lamp count, then a cheaper lighting model, each decided separately against night captures.
- [ ] 3. Run the integrated night A/B, CI, e2e and Logics validation, and record shipped and rejected candidates in docs/performance.md.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_195_attribute_the_clustered_container_pass_cost_before_changing_it`
- `item_196_measure_a_lower_clustered_maxrange_against_night_reach`
- `item_197_measure_fewer_real_lights_against_dark_gaps`
- `item_198_answer_whether_this_scene_needs_a_clustered_container`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_195_attribute_the_clustered_container_pass_cost_before_changing_it`. Proof deferred to slice closeout.
- request-AC5 -> `item_195_attribute_the_clustered_container_pass_cost_before_changing_it`. Proof deferred to slice closeout.
- request-AC2 -> `item_196_measure_a_lower_clustered_maxrange_against_night_reach`. Proof deferred to slice closeout.
- request-AC5 -> `item_196_measure_a_lower_clustered_maxrange_against_night_reach`. Proof deferred to slice closeout.
- request-AC6 -> `item_196_measure_a_lower_clustered_maxrange_against_night_reach`. Proof deferred to slice closeout.
- request-AC3 -> `item_197_measure_fewer_real_lights_against_dark_gaps`. Proof deferred to slice closeout.
- request-AC5 -> `item_197_measure_fewer_real_lights_against_dark_gaps`. Proof deferred to slice closeout.
- request-AC6 -> `item_197_measure_fewer_real_lights_against_dark_gaps`. Proof deferred to slice closeout.
- request-AC4 -> `item_198_answer_whether_this_scene_needs_a_clustered_container`. Proof deferred to slice closeout.
- request-AC5 -> `item_198_answer_whether_this_scene_needs_a_clustered_container`. Proof deferred to slice closeout.
- request-AC6 -> `item_198_answer_whether_this_scene_needs_a_clustered_container`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_055_reduce_the_clustered_night_lighting_pass`
- Product brief(s): `prod_041_a_city_that_stays_readable_at_night_without_paying_twice_for_it`
- Architecture decision(s): (none yet)
