## task_037_orchestrate_the_0_4_0_correctness_fixes - Orchestrate the 0.4.0 correctness fixes
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 90%
> Progress: 16%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-09-03 12:50:27

# AI Context
- Summary: Six waves landing the 0.4.0 correctness fixes, starting from the reproduced crossing throw and ending with the comment-and-test bundle.
- Keywords: wave plan, crossing fix, utility restake, economy reset, workforce authority, undo pairing
- Use when: implementing req_035 or choosing the next correctness slice.
- Skip when: the work belongs to the performance, gate, release or structural chain.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Wave 1: reproduce finding 1 with the geometry in the request context and land the crossing fix behind its regression tests.
- [ ] 2. Wave 2: the utility restake and the economy and lifecycle resets, each with the tests that fail without it.
- [ ] 3. Wave 3: prove the workforce divergence with a test, then give it one authority, and record npm run balance before and after.
- [ ] 4. Wave 4: the heightmap idempotence, the plantings bound, and the addressing determinism.
- [ ] 5. Wave 5: the deferred-demolition undo pairing and revision guard.
- [ ] 6. Wave 6: the comment-and-test bundle.
- [ ] 7. Run npm run ci after each wave, and npm run test:e2e after wave 5 because it touches pointer input and persistence.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_099_cut_a_segment_as_many_times_as_one_road_crosses_it`
- `item_100_derive_the_utility_mask_from_the_item_list_instead_of_owning_it`
- `item_101_reset_the_whole_economy_on_a_load_and_stop_the_shortage_getter_mutating`
- `item_102_give_the_workforce_one_authority`
- `item_103_make_a_building_pad_stamp_idempotent_between_neighbours`
- `item_104_bound_the_cleared_tree_record`
- `item_105_make_house_numbering_locale_independent_and_stop_rebuilding_every_street_per_parcel`
- `item_106_take_the_undo_snapshot_when_the_wrecking_ball_lands_not_when_the_player_clicks`
- `item_107_the_sim_fixes_whose_record_is_a_comment_and_a_test`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_099_cut_a_segment_as_many_times_as_one_road_crosses_it`. Proof deferred to slice closeout.
- request-AC2 -> `item_099_cut_a_segment_as_many_times_as_one_road_crosses_it`. Proof deferred to slice closeout.
- request-AC3 -> `item_100_derive_the_utility_mask_from_the_item_list_instead_of_owning_it`. Proof deferred to slice closeout.
- request-AC4 -> `item_101_reset_the_whole_economy_on_a_load_and_stop_the_shortage_getter_mutating`. Proof deferred to slice closeout.
- request-AC5 -> `item_102_give_the_workforce_one_authority`. Proof deferred to slice closeout.
- request-AC6 -> `item_103_make_a_building_pad_stamp_idempotent_between_neighbours`. Proof deferred to slice closeout.
- request-AC8 -> `item_104_bound_the_cleared_tree_record`. Proof deferred to slice closeout.
- request-AC9 -> `item_105_make_house_numbering_locale_independent_and_stop_rebuilding_every_street_per_parcel`. Proof deferred to slice closeout.
- request-AC7 -> `item_106_take_the_undo_snapshot_when_the_wrecking_ball_lands_not_when_the_player_clicks`. Proof deferred to slice closeout.
- request-AC10 -> `item_107_the_sim_fixes_whose_record_is_a_comment_and_a_test`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_035_fix_the_correctness_defects_the_0_4_0_review_found`
- Product brief(s): `prod_026_a_city_that_survives_the_roads_you_draw_on_it`
- Architecture decision(s): (none yet)

# Notes
- Arbitration for the runner. May decide alone: (1) close item_102, item_103, item_104 or item_105 as no-change when the failing test written first turns out to pass -- those four are reported, not reproduced, and a passing test means the finding was wrong; record which. (2) In item_107, whether node()/allNodes() returns a read-only view or only documents the invariant at the declaration: take the view if it stays under roughly twenty call sites, otherwise document and say why. Reserved for the owner: nothing in this chain. Every item here is a defect with an objective test.
