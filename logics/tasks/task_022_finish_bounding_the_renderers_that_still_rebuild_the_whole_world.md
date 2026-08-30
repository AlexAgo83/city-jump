## task_022_finish_bounding_the_renderers_that_still_rebuild_the_whole_world - Finish bounding the renderers that still rebuild the whole world
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 14:56:54
> Owner: Codex

# AI Context
- Summary: Orchestration for req_020: measure, then the duplicated junction geometry, then the trees, then the remaining three on their numbers. Runs after task_017 -- that chain settles the dispose/recreate predicate this one would otherwise copy wrong four more times.
- Keywords: finish, bounding, renderers, still, rebuild, whole, world
- Use when: Implementing any of the four backlog slices under req_020, in the plan's order.
- Skip when: The change alters what these renderers draw, or optimises by reducing detail rather than by bounding work.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Read this request, its four backlog slices, and `run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint` in full. This chain is positioned to repeat that runbook's rung 3 four more times, and a lost tree is far harder to notice than a lost road.
- [ ] 2. Run after task_017. That chain fixes the dispose/recreate asymmetry in the road mesh and settles the predicate every renderer here has to follow; starting before it means copying the defect.
- [ ] 3. Measure first. The first slice gates the third and fourth, and the honest outcome for at least one renderer is a number and no code.
- [ ] 4. Then the junction geometry, which needs no measurement to justify: it is the same work solved five times, and the codebase already applies the fix to the parcel layout one line away.
- [ ] 5. Then the trees, which the measurement is expected to show as the largest -- but take the measurement's answer, not this sentence's.
- [ ] 6. Then the world grid, streetlights and signals, each decided on its own number.
- [ ] 7. Re-measure after every slice and record the figures; the closeout should show the placement cost falling slice by slice.
- [ ] 8. Confirm the Demo city is pixel-identical throughout, and run the fast gate and the visual check.
- [ ] 9. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. Anything deliberately left rebuilding whole gets a `ponytail:` comment with its measurement.
- [ ] 10. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_066_measure_what_each_full_rebuild_renderer_actually_costs`
- `item_067_solve_the_junction_geometry_once_per_rebuild_instead_of_five_times`
- `item_068_stop_rescanning_the_whole_island_for_trees_that_cannot_have_changed`
- `item_069_decide_the_world_grid_the_streetlights_and_the_signals_on_their_numbers`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_066_measure_what_each_full_rebuild_renderer_actually_costs`. Proof deferred to slice closeout.
- request-AC2 -> `item_067_solve_the_junction_geometry_once_per_rebuild_instead_of_five_times`. Proof deferred to slice closeout.
- request-AC6 -> `item_067_solve_the_junction_geometry_once_per_rebuild_instead_of_five_times`. Proof deferred to slice closeout.
- request-AC7 -> `item_067_solve_the_junction_geometry_once_per_rebuild_instead_of_five_times`. Proof deferred to slice closeout.
- request-AC3 -> `item_068_stop_rescanning_the_whole_island_for_trees_that_cannot_have_changed`. Proof deferred to slice closeout.
- request-AC5 -> `item_068_stop_rescanning_the_whole_island_for_trees_that_cannot_have_changed`. Proof deferred to slice closeout.
- request-AC6 -> `item_068_stop_rescanning_the_whole_island_for_trees_that_cannot_have_changed`. Proof deferred to slice closeout.
- request-AC7 -> `item_068_stop_rescanning_the_whole_island_for_trees_that_cannot_have_changed`. Proof deferred to slice closeout.
- request-AC4 -> `item_069_decide_the_world_grid_the_streetlights_and_the_signals_on_their_numbers`. Proof deferred to slice closeout.
- request-AC5 -> `item_069_decide_the_world_grid_the_streetlights_and_the_signals_on_their_numbers`. Proof deferred to slice closeout.
- request-AC6 -> `item_069_decide_the_world_grid_the_streetlights_and_the_signals_on_their_numbers`. Proof deferred to slice closeout.
- request-AC8 -> `item_069_decide_the_world_grid_the_streetlights_and_the_signals_on_their_numbers`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_020_four_renderers_still_rebuild_the_whole_world_on_every_edit`
- Product brief(s): `prod_017_an_edit_that_costs_what_it_changed_everywhere`
- Architecture decision(s): (none yet)
