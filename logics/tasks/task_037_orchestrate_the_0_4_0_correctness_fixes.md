## task_037_orchestrate_the_0_4_0_correctness_fixes - Orchestrate the 0.4.0 correctness fixes
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-09-03 13:13:53

# AI Context
- Summary: Six waves landing the 0.4.0 correctness fixes, starting from the reproduced crossing throw and ending with the comment-and-test bundle.
- Keywords: wave plan, crossing fix, utility restake, economy reset, workforce authority, undo pairing
- Use when: implementing req_035 or choosing the next correctness slice.
- Skip when: the work belongs to the performance, gate, release or structural chain.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Wave 1: reproduce finding 1 with the geometry in the request context and land the crossing fix behind its regression tests.
- [x] 2. Wave 2: the utility restake and the economy and lifecycle resets, each with the tests that fail without it.
- [x] 3. Wave 3: prove the workforce divergence with a test, then give it one authority, and record npm run balance before and after.
- [x] 4. Wave 4: the heightmap idempotence, the plantings bound, and the addressing determinism.
- [x] 5. Wave 5: the deferred-demolition undo pairing and revision guard.
- [x] 6. Wave 6: the comment-and-test bundle.
- [x] 7. Run npm run ci after each wave, and npm run test:e2e after wave 5 because it touches pointer input and persistence.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

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
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: wave 1 commit ec3701c re-resolves repeated crossing cuts; `npm run ci` passed.
- request-AC2 -> This task. Proof: wave 1 commit ec3701c rejects missing live segment ids; `npm run ci` passed.
- request-AC3 -> This task. Proof: wave 2 commit ed56b4c derives utility masks by restaking placements; `npm run ci` passed.
- request-AC4 -> This task. Proof: wave 2 commit ed56b4c resets economy/lifecycle load state and keeps shortage reads pure; `npm run ci` passed.
- request-AC5 -> This task. Proof: wave 3 commit 6d35a28 makes production use lifecycle staffing; `npm run ci` passed.
- request-AC6 -> This task. Proof: wave 4 commit 8cda2f0 makes parcel height stamps order-stable; `npm run ci` passed.
- request-AC7 -> This task. Proof: wave 5 commit c06edbf delays undo snapshots until demolition lands and guards graph revision; `npm run ci` and `npm run test:e2e` passed.
- request-AC8 -> This task. Proof: wave 4 commit 8cda2f0 bounds and deduplicates generated tree clearing records; `npm run ci` passed.
- request-AC9 -> This task. Proof: wave 4 commit 8cda2f0 makes addressing locale-independent and reuses the street map; `npm run ci` passed.
- request-AC10 -> This task. Proof: wave 6 commit 1abe5c2 guards `pointsEvery`, drains kaiju ticks, validates playthrough expansion atomically, removes dead graph helpers, and centralizes sim math helpers; `npm run ci` passed.

# Validation
- (no validation recorded yet)
- npm run ci passed after wave 6; npm run test:e2e passed after wave 5 for deferred demolition interaction coverage
- Finish workflow executed on 2026-09-03.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-09-03.
- Linked backlog item(s): `item_099_cut_a_segment_as_many_times_as_one_road_crosses_it`, `item_100_derive_the_utility_mask_from_the_item_list_instead_of_owning_it`, `item_101_reset_the_whole_economy_on_a_load_and_stop_the_shortage_getter_mutating`, `item_102_give_the_workforce_one_authority`, `item_103_make_a_building_pad_stamp_idempotent_between_neighbours`, `item_104_bound_the_cleared_tree_record`, `item_105_make_house_numbering_locale_independent_and_stop_rebuilding_every_street_per_parcel`, `item_106_take_the_undo_snapshot_when_the_wrecking_ball_lands_not_when_the_player_clicks`, `item_107_the_sim_fixes_whose_record_is_a_comment_and_a_test`
- Related request(s): `req_035_fix_the_correctness_defects_the_0_4_0_review_found`

# Links
- Request: `req_035_fix_the_correctness_defects_the_0_4_0_review_found`
- Product brief(s): `prod_026_a_city_that_survives_the_roads_you_draw_on_it`
- Architecture decision(s): (none yet)

# Notes
- Arbitration for the runner. May decide alone: (1) close item_102, item_103, item_104 or item_105 as no-change when the failing test written first turns out to pass -- those four are reported, not reproduced, and a passing test means the finding was wrong; record which. (2) In item_107, whether node()/allNodes() returns a read-only view or only documents the invariant at the declaration: take the view if it stays under roughly twenty call sites, otherwise document and say why. Reserved for the owner: nothing in this chain. Every item here is a defect with an objective test.
