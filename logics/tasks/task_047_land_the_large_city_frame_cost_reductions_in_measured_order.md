## task_047_land_the_large_city_frame_cost_reductions_in_measured_order - Land the large city frame cost reductions in measured order
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Land the six per-frame cost reductions from req_047 in measured impact order, each validated on the large-demo-v14 fixture.
- Keywords: land, large, city, frame, cost, reductions, measured, order
- Use when: picking up or sequencing any of the large-city frame cost slices.
- Skip when: repairing the measurement scripts, which is task_048.

# Context
- Deliver the six per frame cost slices in impact order, each validated against the large-demo-v14 fixture with scripts repaired by req_045.

# Plan
- [ ] 1. Confirm task_048 has landed: no FPS or ablation number produced before it may be used to accept a slice here (req_047 AC7).
- [ ] 2. item_166 bound terrain picking. Largest measured regression, 42-46 FPS while drawing versus 75 stationary. Verify slopes, road cuts and misses keep their current hit positions.
- [ ] 3. item_167 short-circuit empty rubble maps. One guard in src/sim/rubble.ts; re-run the paired fresh-load comparison that measured 9.6-14.2%.
- [ ] 4. item_168 cache workforce allocations. Keep the three staffing policies distinct; population hysteresis, incumbent staffing, construction and wave semantics stay covered.
- [ ] 5. item_169 defer hidden overlay geometry. Confirm stale geometry cannot reappear when an overlay is revealed after edits made while hidden.
- [ ] 6. item_170 update HUD nodes only on change. Keep construction and selection feedback responsive.
- [ ] 7. item_171 skip empty explosion buffer writes, still clearing the last expired explosion once.
- [ ] 8. Record each slice's before/after as repeated paired measurements on large-demo-v14 with workload, simulation rate, renderer backend and camera state.
- [ ] 9. Apply ADR 009 checkpoints: update affected Logics docs during each meaningful wave and leave the repo commit-ready.

# Backlog
- `item_166_bound_terrain_picking_in_the_drawing_tools`
- `item_167_short_circuit_empty_rubble_maps`
- `item_168_stop_repeating_equivalent_workforce_sorts`
- `item_169_defer_hidden_overlay_geometry_until_reveal`
- `item_170_update_hud_nodes_only_when_displayed_values_change`
- `item_171_skip_replacing_empty_explosion_buffers`

# Definition of Done (DoD)
- [ ] Generated backlog slices are linked and ready for implementation.
- [ ] Slice ownership and next action are clear.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009 without automatic commits or one commit per micro-step.

# AC Traceability
- request-AC2 -> This task. Proof: orchestration task coordinates the AC-aware split.
- request-AC6 -> This task. Proof: generated task keeps split work explicit and bounded.
- request-AC7 -> This task. Proof: generated task is covered by split request tests.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
