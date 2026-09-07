## task_055_deliver_and_validate_the_distance_aware_performance_slices - Deliver and validate the distance-aware performance slices
> From version: 0.5.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-07 15:19:46

# AI Context
- Summary: Deliver the eight slices in dependency and priority order, keeping repeatable measurements and correctness proof for each retained or rejected optimization.
- Keywords: deliver, validate, distance, aware, performance, slices
- Use when: starting or resuming the implementation; item_187 is the first executable slice and gates every later measurement.
- Skip when: reviewing without implementation authorization or measuring two GPU variants concurrently.

# Context
- Application baseline: 4d81541, reference city with 1287 buildings and 107 loaded models. Evidence: perf/reviews/fps-distance-2026-09-07.json. No performance implementation has started.
- Execution order: item_187, item_188, item_189, item_190, item_191, item_192, item_193, item_194. Dependency details and rejection criteria live in each slice.
- Check all main-pass and shadow-pass visibility consumers together; do not infer world streaming or simulation throttling from a render-distance requirement.

# Plan
- [ ] 1. Preparation: read the request, product, source review, evidence and all eight slices; inspect LOGICS.md and run_008/run_009. Use flow start before implementation. No application work is included in corpus scaffolding.
- [ ] 2. Wave 1 (High): repair every harness readiness assumption, add the isolated diagnostic controls and capture the full comparison baseline; this gates every optimization. Commit source/script hashes and exact conditions with evidence.
- [ ] 3. Wave 2 (High): traffic render-only distance policy, then automatic building detail. Validate paused camera travel, selection/follow, manual options, async arrivals and shadow invalidation after each change.
- [ ] 4. Wave 3 (High): night-light experiment and policy-specific workforce cache reuse, independently measured against the current integrated baseline; preserve existing simulation timing and policy differences.
- [ ] 5. Wave 4 (Medium): prototype spatial building batches, then trees and streetlight geometry, deciding each separately. Next isolate terrain cost, compare full-resolution tiles, and add distant terrain LOD only when its own experiment justifies it.
- [ ] 6. Wave 5 (Low): isolate resolution/MSAA costs after higher-priority changes and either deliver one minimal persisted option or record the measured no-change verdict.
- [ ] 7. Per-wave ADR 009 checkpoint: record affected AC proofs and before/after evidence, candidate parameters, rejected variants and visual captures under docs/media only. Use flow progress for task progress and keep the repo commit-ready; do not fabricate completion proof at scaffold time.
- [ ] 8. Integrated validation: repeat saved/street/district/overview, day/night and camera travel A/B with running x1; include x4/paused diagnostics and one 30 s real-time combat window after warmup. Run ten load/edit/restore cycles for stable scene/light/texture counts; measure complete road/zone edit latency with deferred rebuild work.
- [ ] 9. GATE: each retained optimization satisfies the shared repeated-measurement rule and visual/correctness checks. Every rejected prototype is removed and has committed results; terrain, lighting or resolution cannot disappear from the report because they were inconclusive.
- [ ] 10. GATE: npm run ci and npm run test:e2e pass, plus targeted renderer/simulation tests and visual comparisons for changed rendering. Update docs/performance.md with actual shipped distance policies, catalog readiness, knobs, limitations and final evidence. Do not rerun all performance probes concurrently.
- [ ] 11. Closeout: validate each backlog slice and all request AC1-AC9 with real proof; run Logics lint/audit/flow validate and context-pack refresh. Use flow closeout/finish to settle completed lineage and consumed product; no hand-edited status/lineage. Commit final results only as authorized by the operator.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_187_repair_performance_readiness_and_establish_comparable_distance_baselines`
- `item_188_cull_distant_traffic_visuals_without_stopping_the_simulation`
- `item_189_restore_automatic_building_detail_with_a_manual_boxes_override`
- `item_190_bound_distant_night_lighting_while_preserving_city_readability`
- `item_191_make_workforce_caching_reusable_across_unchanged_gameplay_frames`
- `item_192_batch_static_city_geometry_by_spatial_tiles_with_shared_assets`
- `item_193_evaluate_terrain_tiling_and_distant_geometry_without_changing_the_heightmap`
- `item_194_evaluate_a_minimal_render_resolution_quality_option`

# Definition of Done (DoD)
- [ ] All eight slices are addressed: delivered fixes or documented measured rejection for conditional prototypes; no silent omission.
- [ ] Request AC1-AC9 have actual implementation/test/measurement evidence; scaffolded acceptance text is not completion proof.
- [ ] Retained optimizations meet the shared A/B frame-time rule and all visual/simulation invariants.
- [ ] Current docs and reproducible probes describe shipped policies; final context pack and committed evidence are available.
- [ ] npm run ci, npm run test:e2e, visual checks and Logics validation pass; product brief is settled through closeout.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_187_repair_performance_readiness_and_establish_comparable_distance_baselines`. Proof deferred to slice closeout.
- request-AC9 -> `item_187_repair_performance_readiness_and_establish_comparable_distance_baselines`. Proof deferred to slice closeout.
- request-AC2 -> `item_188_cull_distant_traffic_visuals_without_stopping_the_simulation`. Proof deferred to slice closeout.
- request-AC9 -> `item_188_cull_distant_traffic_visuals_without_stopping_the_simulation`. Proof deferred to slice closeout.
- request-AC3 -> `item_189_restore_automatic_building_detail_with_a_manual_boxes_override`. Proof deferred to slice closeout.
- request-AC9 -> `item_189_restore_automatic_building_detail_with_a_manual_boxes_override`. Proof deferred to slice closeout.
- request-AC4 -> `item_190_bound_distant_night_lighting_while_preserving_city_readability`. Proof deferred to slice closeout.
- request-AC9 -> `item_190_bound_distant_night_lighting_while_preserving_city_readability`. Proof deferred to slice closeout.
- request-AC5 -> `item_191_make_workforce_caching_reusable_across_unchanged_gameplay_frames`. Proof deferred to slice closeout.
- request-AC9 -> `item_191_make_workforce_caching_reusable_across_unchanged_gameplay_frames`. Proof deferred to slice closeout.
- request-AC6 -> `item_192_batch_static_city_geometry_by_spatial_tiles_with_shared_assets`. Proof deferred to slice closeout.
- request-AC9 -> `item_192_batch_static_city_geometry_by_spatial_tiles_with_shared_assets`. Proof deferred to slice closeout.
- request-AC7 -> `item_193_evaluate_terrain_tiling_and_distant_geometry_without_changing_the_heightmap`. Proof deferred to slice closeout.
- request-AC9 -> `item_193_evaluate_terrain_tiling_and_distant_geometry_without_changing_the_heightmap`. Proof deferred to slice closeout.
- request-AC8 -> `item_194_evaluate_a_minimal_render_resolution_quality_option`. Proof deferred to slice closeout.
- request-AC9 -> `item_194_evaluate_a_minimal_render_resolution_quality_option`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_054_deliver_measured_distance_aware_city_performance`
- Product brief(s): `prod_040_a_smoother_city_near_and_far_without_losing_the_distant_city`
- Architecture decision(s): (none yet)
