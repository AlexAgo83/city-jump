## task_017_close_the_ten_review_findings_from_the_dirty_region_rebuild_and_zoning_work - Close the ten review findings from the dirty-region rebuild and zoning work
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-08-30 14:54:21

# AI Context
- Summary: Orchestration for req_015: fix the road-mesh dispose/recreate asymmetry first because the predicate it settles on constrains the rest, then the zone-brush throttle, then the overlay and statistics fixes, then the queue, invariant, share-guard and centroid cleanups.
- Keywords: close, ten, review, findings, dirty, region, rebuild, zoning, work
- Use when: Implementing any of the four backlog slices under req_015, in the plan's order. File and line references were taken at commit 25d5121 — lines drift, the described mechanism identifies each finding.
- Skip when: The change adds gameplay, new assets, or widens the dirty-region optimisation to renderers that still rebuild in full.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Read this request and its four backlog slices before touching code. The findings carry file and line references taken at commit 25d5121; lines drift, the described mechanism is what identifies each one.
- [x] 2. Establish the baseline first: `npm test`, `npm run test:architecture`, `npm run build`. All are green today, which is the point -- nothing that runs catches any of these.
- [x] 3. Start with the road-mesh dispose/recreate asymmetry. It is the only finding that destroys player-visible geometry, and the predicate it settles on is what the rest of the dirty-region reasoning has to match.
- [x] 4. Then the zoning brush throttle and the disposed-mesh reference, measuring with the `measureCosts` debug hook before and after.
- [x] 5. Then the overlay-state and statistics fixes, which are small and independent.
- [x] 6. Then the queue pruning, the lane-order assertion, the share-button guard and the centroid deduplication.
- [x] 7. Each of the two player-visible defects leaves behind one check that fails without its fix -- a pure unit test where a helper can be extracted, otherwise a browser-level check in the interaction suite. The smaller findings do not each need a test; the ones listed in the slices do.
- [x] 8. Run the fast gate and the visual check, and confirm the bundled Demo save still renders as it does today.
- [x] 9. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [x] 10. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_052_make_a_partial_rebuild_unable_to_lose_geometry`
- `item_053_make_the_zoning_brush_cost_what_the_tree_brush_costs`
- `item_054_stop_the_overlay_state_and_the_debug_statistics_from_lying`
- `item_055_prune_the_traffic_queues_assert_the_ordering_they_rely_on_and_clear_the_small_debris`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`
- request-AC10 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`
- request-AC2 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`
- request-AC3 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`
- request-AC10 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`
- request-AC4 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`
- request-AC5 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`
- request-AC10 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`
- request-AC6 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`
- request-AC7 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`
- request-AC8 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`
- request-AC9 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`
- request-AC10 -> This task. Proof: Implemented across commits 98c1d2e, 30364e4, 1bcd9c0, 27b7fdb and 79286d5; validated with npm run ci, npm run test:e2e and npm run test:visual. Source: `79286d5`

# Validation
- (no validation recorded yet)
- command: `npm run ci && npm run test:e2e && npm run test:visual` | result: passed | date: 2026-08-30
- Finish workflow executed on 2026-08-30.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-30.
- Linked backlog item(s): `item_052_make_a_partial_rebuild_unable_to_lose_geometry`, `item_053_make_the_zoning_brush_cost_what_the_tree_brush_costs`, `item_054_stop_the_overlay_state_and_the_debug_statistics_from_lying`, `item_055_prune_the_traffic_queues_assert_the_ordering_they_rely_on_and_clear_the_small_debris`
- Related request(s): `req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work`

# Links
- Request: `req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work`
- Product brief(s): `prod_012_a_city_that_keeps_drawing_itself_correctly`
- Architecture decision(s): (none yet)
