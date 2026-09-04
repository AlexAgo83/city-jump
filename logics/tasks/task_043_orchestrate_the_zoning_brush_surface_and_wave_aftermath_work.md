## task_043_orchestrate_the_zoning_brush_surface_and_wave_aftermath_work - Orchestrate the zoning, brush surface and wave aftermath work
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Nine slices: the rubble battery and the opening treasury first because both move the balance band, then the bulldozer's second, the click-only brushes, the levelled-city message, evacuation, the zoning surface, and the brush minimum last.
- Keywords: rubble battery, balance band, starting treasury, demolition delay, click-only brush, levelled city, evacuate, zoning fill
- Use when: implementing the 0.4.0 play findings, in the order the plan sets.
- Skip when: reordering to do the zoning work first; the balance band has to be re-measured once, for both slices that move it, before the rest can be judged.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Fix the rubble battery first: it is a live defect, it changes combat balance, and everything else is easier to judge once a flattened barracks stops shooting.
- [ ] 2. Take the opening treasury in the same pass, since both move the balance band, then re-run npm run scenarios once and record the band for both.
- [ ] 3. Drop the bulldozer's second next -- establish what it was buying before removing it, and retire the deferred-commit guard with it.
- [ ] 4. Then the brushes: click-only, which is the same change as giving the left drag back to the camera, and decide what one undo entry covers.
- [ ] 5. Then the levelled-city message and the decision about the kaiju, which the rubble fix makes reachable sooner in a run.
- [ ] 6. Then evacuation, deciding where the upgrade step lives before wiring evacuate to a new island.
- [ ] 7. Then the zoning surface: the tool-choice panel, then the fill itself once the contiguity rule is settled against segment, side and block.
- [ ] 8. Close with the brush minimum, folding it into the same pass that gives the radius one source of truth.
- [ ] 9. Verify with npm run ci, and with npm run test:e2e on demand since the tool surface and the pointer contract both changed.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_143_zone_a_contiguous_run_of_lots_from_one_click`
- `item_144_put_the_zoning_tool_choice_in_its_own_panel`
- `item_145_make_the_brushes_click_only_and_give_the_left_drag_back_to_the_camera`
- `item_146_open_the_zone_brush_at_the_minimum_of_its_own_slider`
- `item_147_make_evacuating_leave_the_island`
- `item_148_say_that_the_city_was_levelled_and_decide_what_happens_to_the_kaiju`
- `item_149_stop_a_barracks_in_rubble_from_firing_and_from_holding_its_workers`
- `item_150_drop_the_second_the_bulldozer_waits_for_nothing`
- `item_151_open_a_run_with_a_treasury_that_can_build_a_city`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_143_zone_a_contiguous_run_of_lots_from_one_click`. Proof deferred to slice closeout.
- request-AC2 -> `item_143_zone_a_contiguous_run_of_lots_from_one_click`. Proof deferred to slice closeout.
- request-AC8 -> `item_144_put_the_zoning_tool_choice_in_its_own_panel`. Proof deferred to slice closeout.
- request-AC9 -> `item_145_make_the_brushes_click_only_and_give_the_left_drag_back_to_the_camera`. Proof deferred to slice closeout.
- request-AC3 -> `item_146_open_the_zone_brush_at_the_minimum_of_its_own_slider`. Proof deferred to slice closeout.
- request-AC4 -> `item_147_make_evacuating_leave_the_island`. Proof deferred to slice closeout.
- request-AC5 -> `item_148_say_that_the_city_was_levelled_and_decide_what_happens_to_the_kaiju`. Proof deferred to slice closeout.
- request-AC6 -> `item_149_stop_a_barracks_in_rubble_from_firing_and_from_holding_its_workers`. Proof deferred to slice closeout.
- request-AC7 -> `item_149_stop_a_barracks_in_rubble_from_firing_and_from_holding_its_workers`. Proof deferred to slice closeout.
- request-AC10 -> `item_150_drop_the_second_the_bulldozer_waits_for_nothing`. Proof deferred to slice closeout.
- request-AC11 -> `item_151_open_a_run_with_a_treasury_that_can_build_a_city`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_041_what_playing_0_4_0_turned_up_in_the_zoning_tools_the_brush_surface_and_the_wave_s_aftermath`
- Product brief(s): `prod_032_tools_that_stay_out_of_the_way_and_a_wave_whose_aftermath_the_player_can_read`
- Architecture decision(s): (none yet)
