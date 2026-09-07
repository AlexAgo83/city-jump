## task_055_deliver_and_validate_the_distance_aware_performance_slices - Deliver and validate the distance-aware performance slices
> From version: 0.5.2
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 85%
> Progress: 38%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-07 15:46:13
> Owner: Codex

# AI Context
- Summary: Deliver the eight slices in dependency and priority order, keeping repeatable measurements and correctness proof for each retained or rejected optimization.
- Keywords: deliver, validate, distance, aware, performance, slices
- Use when: starting or resuming the implementation; item_187 is the first executable slice and gates every later measurement.
- Skip when: reviewing without implementation authorization or measuring two GPU variants concurrently.

# Context
- Application baseline: 4d81541, reference city with 1287 buildings and 107 loaded models. Historical evidence: perf/reviews/fps-distance-2026-09-07.json. Wave 1 repairs the harnesses; application optimizations follow its measured baseline.
- Execution order: item_187, item_188, item_189, item_190, item_191, item_192, item_193, item_194. Dependency details and rejection criteria live in each slice.
- Check all main-pass and shadow-pass visibility consumers together; do not infer world streaming or simulation throttling from a render-distance requirement.

# Plan
- [x] 1. Preparation: read the request, product, source review, evidence and all eight slices; inspect LOGICS.md and run_008/run_009. Use flow start before implementation. No application work is included in corpus scaffolding.
- [ ] 2. Wave 1 (High): repair every harness readiness assumption, add the isolated diagnostic controls and capture the full comparison baseline; this gates every optimization. Commit source/script hashes and exact conditions with evidence.
- [x] 3. Wave 2 (High): traffic render-only distance policy measured and rejected (evidence committed, prototype removed); automatic building detail measured and retained. Validate paused camera travel, selection/follow, manual options, async arrivals and shadow invalidation after each change.
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
- request-AC2 -> `item_188_cull_distant_traffic_visuals_without_stopping_the_simulation`. NOT satisfied here: the traffic prototype was measured and rejected. Satisfied instead by `item_189` automatic building detail.
- request-AC9 -> `item_188_cull_distant_traffic_visuals_without_stopping_the_simulation`. Proof: documented measured rejection with two complete three-round comparisons in `perf/reviews/task055-wave2-traffic-retry/` and `perf/reviews/task055-wave2-traffic-tuned-full/`.
- request-AC3 -> `item_189_restore_automatic_building_detail_with_a_manual_boxes_override`. Proof: hysteresis, override composition and rebuild paths covered in `src/render/buildings.test.ts`; visual and shadow preservation asserted by `scripts/review/detail.mjs`.
- request-AC9 -> `item_189_restore_automatic_building_detail_with_a_manual_boxes_override`. Proof: `perf/reviews/task055-wave2-detail/`, three complete rounds, +15.5% and +28.2% frame p50 at the two overview framings with flat controls.
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
- Wave 1: `npm run ci` passed on 2026-09-07 (386 tests, architecture checks, deterministic scenarios, build and Logics validation). After final harness metadata edits, `node --test tests/perf-review.mjs`, targeted Biome lint and `git diff --check` passed.

# Report
- Wave 1: shared manifest-based readiness replaces historical model-count assumptions in perf, ablate and all seven existing review probes. The new distance probe records interleaved comparisons, running simulation/traffic proof, frame tails, CPU, draw calls, active meshes and actual GPU/camera/buffer conditions.
- `perf/reviews/task055-wave1-baseline/` completed 24 samples (eight scenarios, three rounds) against unchanged application source hash `7db1037c665b0f666ee306a3aabb0c131dace50b205e02dbf43338aab07736fa`. Later feature diagnostics must use the same protocol; these baseline numbers are not optimization gains.
- `perf/reviews/task055-wave1-additional/` completed nine samples covering saved/day and street/overview night, with explicit viewport/toolbar/cap metadata and readiness helper hash. Both manifests report complete; wave-specific diagnostics remain part of subsequent delivery.
- Wave 2 / item_188 REJECTED by measurement. Render-only traffic distance culling was prototyped twice and removed; both candidates are recorded, neither is retained.
  - Conservative reach `clamp(camera.radius * 2.3, 320, 2000)` m, 15% exit hysteresis: `perf/reviews/task055-wave2-traffic-retry/`, 42 samples, three rounds, complete. Best case day-street +2.1% frame p50; every other view within noise.
  - Tuned reach `clamp(camera.radius * 1.2, 180, 1100)` m, same hysteresis and selection exemption: `perf/reviews/task055-wave2-traffic-tuned-full/`, 42 samples, three rounds, complete, application source hash `d9b16b966826ee74cf1b5b7e0bd81d0e49387924189615aa473c5e4b48571082`. Frame p50 day-street +1.0%, follow +0.6%, night-saved +1.1%, paused 0.0%, day-district -0.9%, day-overview -0.9%, moving -1.9%.
  - The tuned candidate does cull: active meshes fall 20.9% at follow and 15.6% at day-street, and follow CPU p50 improves 5.2% (11.50 -> 10.90 ms). None of it reaches the frame. At 9-19 ms per frame these scenarios are not bound by traffic mesh count, so removing traffic meshes buys nothing; two views regress slightly. No variant reaches the 5% retention threshold.
  - Superseded partial evidence is kept, not hidden: `perf/reviews/task055-wave2-traffic/` failed at reference-server startup (no samples), and `perf/reviews/task055-wave2-traffic-tuned/` was interrupted after two of three rounds at the same source hash as the complete tuned run. Its two-round day-street figure of +5.2% collapsed to +1.0% once the third round landed -- the reason the shared repeated-measurement rule exists.
  - Request AC2 is NOT satisfied by this slice. Per item_188 AC3 a rejected traffic prototype alone does not deliver the required distance behavior; the distance policy must come from `item_189` automatic building detail, where the mesh population actually lives (1287 buildings against 166 vehicles).
  - The prototype is fully removed from `src/`, including the pedestrian-cull removal in `src/render/detail.ts` it had introduced to compose with itself; the 900 m `pedestrian_` level is restored.
- Wave 2 / item_189 RETAINED. Automatic building detail: boxes above camera radius 1100 m, models again only below 1000 m, with the manual override composed as `forced || automatic` in one `applyDistance()` that also resets the shadow-map refresh counter.
  - `perf/reviews/task055-wave2-detail/`, 48 samples, eight scenarios, three rounds, complete. Frame p50 night-overview +28.2% (17.00 -> 12.20 ms) and day-overview +15.5% (11.00 -> 9.30 ms); day-street, day-district, follow, moving, night-saved and paused stay flat with unchanged active-mesh counts, which is the control the thresholds owe.
  - This is where request AC2 lands after the traffic rejection: the 1287 buildings are the mesh population that answers to distance, not the 166 vehicles.
  - Visual and correctness proof is a probe, not a claim: `scripts/review/detail.mjs` walks near -> far -> back and asserts models near, boxes far, boxes surviving between the thresholds on the way down, every model restored with no stale boxes, the override winning close in and releasing cleanly, boxes after a rebuild far out, shadow casters at both details, and no page errors. Evidence in `perf/reviews/task055-wave2-detail-visual/`, captures in `docs/media/detail-*.png`.
  - Thresholds are tuned against the real camera limit of 1200 m, so the automatic band is the top 100 m of zoom. A lower pair was rejected on sight: at 950 m the boxes lose towers, roof colours and farm rows still legible as models.
  - Recorded trade, not hidden: at 1200 m the swap is visible. State and construction colours carry over intact and the distant city stays readable, but tower silhouettes flatten. `docs/media/detail-1200-models-before.png` against `docs/media/detail-far-boxes.png`.
- Remaining: independent lighting/cache experiments, spatial and terrain experiments, resolution experiments, integrated visual/gameplay gates and final closeout. No application optimization is validated yet.

# Links
- Request: `req_054_deliver_measured_distance_aware_city_performance`
- Product brief(s): `prod_040_a_smoother_city_near_and_far_without_losing_the_distant_city`
- Architecture decision(s): (none yet)
