## req_035_fix_the_correctness_defects_the_0_4_0_review_found - Fix the correctness defects the 0.4.0 review found
> From version: 0.4.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: City simulation core
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Nine live defects found reviewing 0.4.0 at f2e2070, from a road crossing that throws with the graph half-cut to a reload that inherits the previous run's shortage latch.
- Keywords: crossing split, segment id zero, utility mask, shortage latch, workforce allocation, heightmap stamp, undo pairing, load reset
- Use when: fixing a correctness defect in src/sim/ or the demolition path, or checking whether a reported city bug is already recorded.
- Skip when: the work is per-frame cost (req_037), balance tuning (req_036), release hardening (req_038) or module structure (req_039).

# Needs
- A road drawn across another splits it, however many times it crosses, and never leaves the city half-cut.
- A city reloaded is the city that was saved, with none of the previous run's latches.
- A demolition undone is the demolition the player just made, not the pair of them.
- One authority decides which lot is staffed, so the ledger and the building agree.

# Context
- These defects come from a full review of the repo at commit f2e2070 (0.4.0). Every one is a live defect, not a style preference. The chain exists because each changes what the product asserts or has a cause spanning layers; the one-line fixes whose record is a comment and a test are gathered in a single slice rather than given chains of their own, per ADR 030.
- Finding 1 is reproduced. A quadratic street from (-60,0) to (60,0) with control (0,0,240) crossed by a straight road at z=60 makes two intersections on one segment. allCrossings (src/sim/rules.ts:168) returns one entry per intersection without deduping by segmentId; the loop at :133 calls graph.splitSegment for each; the first split deletes the segment (src/sim/graph.ts:312) so the second throws `unknown segment: 1`. Observed: segments before [1], after [2,3] -- the existing road is cut and the drawn road is never added. commitSegment returns {ok:false, reason} everywhere else so no caller wraps it, and the throw escapes into the render loop.
- Do not carry the crossing distance across a split arithmetically. splitSegment re-samples each half from its own curve on purpose (the comment at src/sim/graph.ts:300 explains what slicing the parent's samples cost: only 249 of 1806 lots came back in place). Re-locate the point with graph.nearestOnSegment instead.
- Do not return {ok:false} once a split has been committed: that moves the partial mutation rather than removing it. Every path must degrade gracefully -- a crossing that cannot be served is dropped and the road spans it.
- Do not subtract utility bits on removal. Two diffusers can share a run of road, so subtracting one path cuts the other's. The mask on a segment is derived from the item list, which is what ADR 003 already says about derived views: clear and re-lay.
- The economy shortage getter mutates on read (src/sim/economy.ts:111). It also rewrites shortSince on every read while materials are at zero, so the recovery window the comment at :107 describes can never elapse while the stock stays empty. Two defects, one fix.

# Acceptance criteria
- AC1: A road crossing one segment twice commits without throwing and leaves no partial mutation.
- AC2: commitSegment never reports success with a segment id that does not exist.
- AC3: Removing a utility leaves no segment carrying its mask, and a diffuser sharing a run of road with another stays supplied.
- AC4: A reload starts the economy and the building lifecycle with no inherited latch, flag or clock.
- AC5: One authority allocates the workforce, and production and lifecycle agree on which lot is staffed.
- AC6: Stamping two adjacent building pads gives the same terrain in either order.
- AC7: A bulldoze within a second of another records its own undo entry, and a demolition scheduled against a replaced city does not run.
- AC8: Cleared-tree records stay bounded across a long session and survive a save round-trip.
- AC9: House numbering does not depend on the runtime locale.
- AC10: The fixes whose record is a comment and a test carry that comment and that test.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_026_a_city_that_survives_the_roads_you_draw_on_it`
- Architecture decision(s): (none yet)

# References
- src/sim/rules.ts
- src/sim/utilities.ts
- src/sim/economy.ts
- src/sim/buildingLifecycle.ts
- src/sim/heightmap.ts
- src/sim/plantings.ts
- src/sim/streets.ts
- src/render/drawTool.ts
- src/sim/graph.ts

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
