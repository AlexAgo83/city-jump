## task_017_close_the_ten_review_findings_from_the_dirty_region_rebuild_and_zoning_work - Close the ten review findings from the dirty-region rebuild and zoning work
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Orchestration for req_015: fix the road-mesh dispose/recreate asymmetry first because the predicate it settles on constrains the rest, then the zone-brush throttle, then the overlay and statistics fixes, then the queue, invariant, share-guard and centroid cleanups.
- Keywords: close, ten, review, findings, dirty, region, rebuild, zoning, work
- Use when: Implementing any of the four backlog slices under req_015, in the plan's order. File and line references were taken at commit 25d5121 — lines drift, the described mechanism identifies each finding.
- Skip when: The change adds gameplay, new assets, or widens the dirty-region optimisation to renderers that still rebuild in full.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Read this request and its four backlog slices before touching code. The findings carry file and line references taken at commit 25d5121; lines drift, the described mechanism is what identifies each one.
- [ ] 2. Establish the baseline first: `npm test`, `npm run test:architecture`, `npm run build`. All are green today, which is the point -- nothing that runs catches any of these.
- [ ] 3. Start with the road-mesh dispose/recreate asymmetry. It is the only finding that destroys player-visible geometry, and the predicate it settles on is what the rest of the dirty-region reasoning has to match.
- [ ] 4. Then the zoning brush throttle and the disposed-mesh reference, measuring with the `measureCosts` debug hook before and after.
- [ ] 5. Then the overlay-state and statistics fixes, which are small and independent.
- [ ] 6. Then the queue pruning, the lane-order assertion, the share-button guard and the centroid deduplication.
- [ ] 7. Each of the two player-visible defects leaves behind one check that fails without its fix -- a pure unit test where a helper can be extracted, otherwise a browser-level check in the interaction suite. The smaller findings do not each need a test; the ones listed in the slices do.
- [ ] 8. Run the fast gate and the visual check, and confirm the bundled Demo save still renders as it does today.
- [ ] 9. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [ ] 10. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_052_make_a_partial_rebuild_unable_to_lose_geometry`
- `item_053_make_the_zoning_brush_cost_what_the_tree_brush_costs`
- `item_054_stop_the_overlay_state_and_the_debug_statistics_from_lying`
- `item_055_prune_the_traffic_queues_assert_the_ordering_they_rely_on_and_clear_the_small_debris`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_052_make_a_partial_rebuild_unable_to_lose_geometry`. Proof deferred to slice closeout.
- request-AC10 -> `item_052_make_a_partial_rebuild_unable_to_lose_geometry`. Proof deferred to slice closeout.
- request-AC2 -> `item_053_make_the_zoning_brush_cost_what_the_tree_brush_costs`. Proof deferred to slice closeout.
- request-AC3 -> `item_053_make_the_zoning_brush_cost_what_the_tree_brush_costs`. Proof deferred to slice closeout.
- request-AC10 -> `item_053_make_the_zoning_brush_cost_what_the_tree_brush_costs`. Proof deferred to slice closeout.
- request-AC4 -> `item_054_stop_the_overlay_state_and_the_debug_statistics_from_lying`. Proof deferred to slice closeout.
- request-AC5 -> `item_054_stop_the_overlay_state_and_the_debug_statistics_from_lying`. Proof deferred to slice closeout.
- request-AC10 -> `item_054_stop_the_overlay_state_and_the_debug_statistics_from_lying`. Proof deferred to slice closeout.
- request-AC6 -> `item_055_prune_the_traffic_queues_assert_the_ordering_they_rely_on_and_clear_the_small_debris`. Proof deferred to slice closeout.
- request-AC7 -> `item_055_prune_the_traffic_queues_assert_the_ordering_they_rely_on_and_clear_the_small_debris`. Proof deferred to slice closeout.
- request-AC8 -> `item_055_prune_the_traffic_queues_assert_the_ordering_they_rely_on_and_clear_the_small_debris`. Proof deferred to slice closeout.
- request-AC9 -> `item_055_prune_the_traffic_queues_assert_the_ordering_they_rely_on_and_clear_the_small_debris`. Proof deferred to slice closeout.
- request-AC10 -> `item_055_prune_the_traffic_queues_assert_the_ordering_they_rely_on_and_clear_the_small_debris`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work`
- Product brief(s): `prod_012_a_city_that_keeps_drawing_itself_correctly`
- Architecture decision(s): (none yet)
