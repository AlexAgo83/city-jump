## task_039_orchestrate_the_per_frame_cost_work - Orchestrate the per-frame cost work
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 75%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-09-03 14:37:19

# AI Context
- Summary: Gate the uploads, step the sun, index the yielding -- each measured against the clean baseline req_036 records.
- Keywords: signature gate, sun step, occupancy index, mover resolution, perf measurement
- Use when: implementing req_037, once a clean baseline exists.
- Skip when: no clean perf baseline has been recorded yet: without it nothing here can be shown.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Do not start until req_036 item_110 has recorded a clean baseline; without it nothing here can be shown.
- [ ] 2. Wave 1: the building state signature and the distant-loop map, measured immediately -- this is the largest single cost.
- [ ] 3. Wave 2: the sun step and the signals allocation, minding the midnight wrap.
- [ ] 4. Wave 3: the supplied-utility memo, after req_035's restake exists so the invalidation has something to hook.
- [ ] 5. Wave 4: the traffic occupancy index, and elucidate the discarded entry radius before touching it.
- [ ] 6. Wave 5: the mover segment re-resolution.
- [ ] 7. Wave 6: the after measurement and the docs/performance.md note.
- [ ] 8. Run npm run test:e2e after any wave touching the render loop, per CONTRIBUTING.md:53.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_113_gate_the_building_state_upload_on_a_change_signature`
- `item_114_derive_the_supplied_utility_set_only_when_it_can_have_changed`
- `item_115_fan_the_sun_out_once_per_visible_step`
- `item_116_build_the_yield_and_crossing_occupancy_once_per_frame`
- `item_117_re_resolve_a_mover_s_segment_after_a_rebuild`
- `item_118_show_the_frame_cost_came_down`
- `item_133_make_the_performance_scenario_measure_a_city_with_buildings_in_it`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_113_gate_the_building_state_upload_on_a_change_signature`. Proof deferred to slice closeout.
- request-AC2 -> `item_113_gate_the_building_state_upload_on_a_change_signature`. Proof deferred to slice closeout.
- request-AC3 -> `item_114_derive_the_supplied_utility_set_only_when_it_can_have_changed`. Proof deferred to slice closeout.
- request-AC4 -> `item_115_fan_the_sun_out_once_per_visible_step`. Proof deferred to slice closeout.
- request-AC5 -> `item_116_build_the_yield_and_crossing_occupancy_once_per_frame`. Proof deferred to slice closeout.
- request-AC7 -> `item_116_build_the_yield_and_crossing_occupancy_once_per_frame`. Proof deferred to slice closeout.
- request-AC6 -> `item_117_re_resolve_a_mover_s_segment_after_a_rebuild`. Proof deferred to slice closeout.
- request-AC8 -> `item_118_show_the_frame_cost_came_down`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_037_stop_paying_every_frame_for_a_city_that_is_not_changing`
- Product brief(s): `prod_028_a_city_that_costs_what_it_is_changing`
- Architecture decision(s): (none yet)

# Notes
- Arbitration for the runner. May decide alone: (1) abandon any optimisation here whose measurement shows no gain -- a null result closes the item, and item_133 exists so that the measurement can be trusted. (2) In item_116, if ring lanes turn out not to be meant to block each other, raise the fix against req_035 and close the perf half separately rather than fixing right-of-way inside a performance change. Reserved for the owner: whether a 10.5 s startup and a 2.5 s demo build are acceptable. That number surfaced while measuring, belongs to no slice here, and needs its own decision rather than being folded into per-frame work.
