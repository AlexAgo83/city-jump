## task_055_deliver_and_validate_the_distance_aware_performance_slices - Deliver and validate the distance-aware performance slices
> From version: 0.5.2
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 90%
> Progress: 100%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-07 18:53:54
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
- [x] 2. Wave 1 (High): repair every harness readiness assumption, add the isolated diagnostic controls and capture the full comparison baseline; this gates every optimization. Commit source/script hashes and exact conditions with evidence.
- [x] 3. Wave 2 (High): traffic render-only distance policy measured and rejected (evidence committed, prototype removed); automatic building detail measured and retained. Validate paused camera travel, selection/follow, manual options, async arrivals and shadow invalidation after each change.
- [x] 4. Wave 3 (High): workforce cache reuse measured and retained; the night-light experiment measured and closed as an evidenced no-change.
- [x] 5. Wave 4 (Medium): spatial batching and terrain tiling/LOD all measured and rejected before implementation, each decided separately. Next isolate terrain cost, compare full-resolution tiles, and add distant terrain LOD only when its own experiment justifies it.
- [x] 6. Wave 5 (Low): resolution and MSAA costs isolated; one minimal persisted option delivered.
- [x] 7. Per-wave ADR 009 checkpoint: record affected AC proofs and before/after evidence, candidate parameters, rejected variants and visual captures under docs/media only. Use flow progress for task progress and keep the repo commit-ready; do not fabricate completion proof at scaffold time.
- [x] 8. Integrated validation: repeat saved/street/district/overview, day/night and camera travel A/B with running x1; include x4/paused diagnostics and one 30 s real-time combat window after warmup. Run ten load/edit/restore cycles for stable scene/light/texture counts; measure complete road/zone edit latency with deferred rebuild work.
- [x] 9. GATE: each retained optimization satisfies the shared repeated-measurement rule and visual/correctness checks. Every rejected prototype is removed and has committed results; terrain, lighting or resolution cannot disappear from the report because they were inconclusive.
- [x] 10. GATE: npm run ci and npm run test:e2e pass, plus targeted renderer/simulation tests and visual comparisons for changed rendering. Update docs/performance.md with actual shipped distance policies, catalog readiness, knobs, limitations and final evidence. Do not rerun all performance probes concurrently.
- [x] 11. Closeout: validate each backlog slice and all request AC1-AC9 with real proof; run Logics lint/audit/flow validate and context-pack refresh. Use flow closeout/finish to settle completed lineage and consumed product; no hand-edited status/lineage. Commit final results only as authorized by the operator.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

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
- [x] All eight slices are addressed: delivered fixes or documented measured rejection for conditional prototypes; no silent omission.
- [x] Request AC1-AC9 have actual implementation/test/measurement evidence; scaffolded acceptance text is not completion proof.
- [x] Retained optimizations meet the shared A/B frame-time rule and all visual/simulation invariants.
- [x] Current docs and reproducible probes describe shipped policies; final context pack and committed evidence are available.
- [x] npm run ci, npm run test:e2e, visual checks and Logics validation pass; product brief is settled through closeout.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: wave 1 rebuilt harness readiness on a shared manifest and captured 33 baseline samples at a recorded application source hash (`perf/reviews/task055-wave1-baseline/`, `-additional/`).
- request-AC2 -> This task. Proof: the traffic prototype was measured and rejected; the distance behaviour ships as automatic building detail at +28.7% night-overview and +15.5% day-overview over three paired rounds (`perf/reviews/task055-wave2-detail/`).
- request-AC3 -> This task. Proof: `nextDistantDetail` checks in `src/render/buildings.test.ts`, the visual and shadow assertions in `scripts/review/detail.mjs`, and four e2e assertions holding the shipped contract in `scripts/interact.mjs`.
- request-AC4 -> This task. Proof: the evidenced no-change decision this AC allows, from the five-way ablation split in `perf/reviews/task055-wave3-lights-ablation-*`.
- request-AC5 -> This task. Proof: allocation counts in `perf/reviews/task055-wave3-workforce/` and the cached-against-uncached equivalence run in `src/sim/buildingLifecycle.test.ts`.
- request-AC6 -> This task. Proof: separate ceilings for buildings, trees and streetlight geometry plus the perfect-cull ceiling in `perf/reviews/task055-wave4-*`, all rejected before implementation.
- request-AC7 -> This task. Proof: ground-only cost across seven framings including day/night pairs at identical cameras in `perf/reviews/task055-wave4-ceiling-ground*`.
- request-AC8 -> This task. Proof: three measured candidates in `perf/reviews/task055-wave5-*` and the shipped-wiring probe `perf/reviews/task055-wave5-look/`.
- request-AC9 -> This task. Proof: three interleaved rounds per candidate read as per-round paired deltas or a documented rejection; integrated before/after in `perf/reviews/task055-integrated/`, stability in `-soak/`, `npm run ci` and `npm run test:e2e` green.
- request-AC1 -> `item_187_repair_performance_readiness_and_establish_comparable_distance_baselines`. Proof deferred to slice closeout.
- request-AC9 -> `item_187_repair_performance_readiness_and_establish_comparable_distance_baselines`. Proof deferred to slice closeout.
- request-AC2 -> `item_188_cull_distant_traffic_visuals_without_stopping_the_simulation`. NOT satisfied here: the traffic prototype was measured and rejected. Satisfied instead by `item_189` automatic building detail.
- request-AC9 -> `item_188_cull_distant_traffic_visuals_without_stopping_the_simulation`. Proof: documented measured rejection with two complete three-round comparisons in `perf/reviews/task055-wave2-traffic-retry/` and `perf/reviews/task055-wave2-traffic-tuned-full/`.
- request-AC3 -> `item_189_restore_automatic_building_detail_with_a_manual_boxes_override`. Proof: hysteresis, override composition and rebuild paths covered in `src/render/buildings.test.ts`; visual and shadow preservation asserted by `scripts/review/detail.mjs`.
- request-AC9 -> `item_189_restore_automatic_building_detail_with_a_manual_boxes_override`. Proof: `perf/reviews/task055-wave2-detail/`, three complete rounds, +15.5% and +28.2% frame p50 at the two overview framings with flat controls.
- request-AC4 -> `item_190_bound_distant_night_lighting_while_preserving_city_readability`. Proof: the evidenced no-change decision AC4 allows, from the five-way ablation split under `perf/reviews/task055-wave3-lights-ablation-*`.
- request-AC9 -> `item_190_bound_distant_night_lighting_while_preserving_city_readability`. Proof: separate street, car, emitter, bulb and combined measurements, three rounds each, recorded with the reason no distance policy can reach the cost.
- request-AC5 -> `item_191_make_workforce_caching_reusable_across_unchanged_gameplay_frames`. Proof: allocation counts in `perf/reviews/task055-wave3-workforce/` and the cached-against-uncached equivalence run in `src/sim/buildingLifecycle.test.ts`.
- request-AC9 -> `item_191_make_workforce_caching_reusable_across_unchanged_gameplay_frames`. Proof: `perf/reviews/task055-wave3-workforce-ab-retry/`, three complete rounds, recorded as no measurable frame-time change rather than as a gain.
- request-AC6 -> `item_192_batch_static_city_geometry_by_spatial_tiles_with_shared_assets`. Proof: three separate ceiling measurements plus the perfect-cull ceiling under `perf/reviews/task055-wave4-*`, each three rounds.
- request-AC9 -> `item_192_batch_static_city_geometry_by_spatial_tiles_with_shared_assets`. Proof: documented measured rejection with the reason the premise fails, not merely the threshold.
- request-AC7 -> `item_193_evaluate_terrain_tiling_and_distant_geometry_without_changing_the_heightmap`. Proof: ground-only cost across seven framings including day/night pairs at identical cameras, in `perf/reviews/task055-wave4-ceiling-ground*`.
- request-AC9 -> `item_193_evaluate_terrain_tiling_and_distant_geometry_without_changing_the_heightmap`. Proof: documented rejection of tiling and LOD with the recorded cost and reason.
- request-AC8 -> `item_194_evaluate_a_minimal_render_resolution_quality_option`. Proof: three measured candidates under `perf/reviews/task055-wave5-*` and the shipped-wiring probe `perf/reviews/task055-wave5-look/`.
- request-AC9 -> `item_194_evaluate_a_minimal_render_resolution_quality_option`. Proof: the retained option is measured at +21.6% at night-saved across three rounds, with the two rejected candidates recorded.

# Validation
- Wave 1: `npm run ci` passed on 2026-09-07 (386 tests, architecture checks, deterministic scenarios, build and Logics validation). After final harness metadata edits, `node --test tests/perf-review.mjs`, targeted Biome lint and `git diff --check` passed.
- Finish workflow executed on 2026-09-07.
- Linked backlog/request close verification passed.

# Report
- Wave 1: shared manifest-based readiness replaces historical model-count assumptions in perf, ablate and all seven existing review probes. The new distance probe records interleaved comparisons, running simulation/traffic proof, frame tails, CPU, draw calls, active meshes and actual GPU/camera/buffer conditions.
- `perf/reviews/task055-wave1-baseline/` completed 24 samples (eight scenarios, three rounds) against unchanged application source hash `7db1037c665b0f666ee306a3aabb0c131dace50b205e02dbf43338aab07736fa`. Later feature diagnostics must use the same protocol; these baseline numbers are not optimization gains.
- `perf/reviews/task055-wave1-additional/` completed nine samples covering saved/day and street/overview night, with explicit viewport/toolbar/cap metadata and readiness helper hash. Both manifests report complete; wave-specific diagnostics remain part of subsequent delivery.
- Wave 2 / item_188 REJECTED by measurement. Render-only traffic distance culling was prototyped twice and removed; both candidates are recorded, neither is retained.
  - Conservative reach `clamp(camera.radius * 2.3, 320, 2000)` m, 15% exit hysteresis: `perf/reviews/task055-wave2-traffic-retry/`, 42 samples, three rounds, complete. Best case day-street +2.1% frame p50; every other view within noise.
  - Tuned reach `clamp(camera.radius * 1.2, 180, 1100)` m, same hysteresis and selection exemption: `perf/reviews/task055-wave2-traffic-tuned-full/`, 42 samples, three rounds, complete, application source hash `d9b16b966826ee74cf1b5b7e0bd81d0e49387924189615aa473c5e4b48571082`. Frame p50 day-street +1.0%, follow +0.6%, night-saved +1.1%, paused 0.0%, day-district -0.9%, day-overview -0.9%, moving -1.9%.
  - Correction to the figures above, made when `scripts/review/paired.mjs` was added later in wave 3: the day-street number was first read as a median of each side's medians, which gave +1.0%. Read as the median of the per-round paired deltas it is +8.2%, from rounds of -2.1%, +8.2% and +13.4% against baselines of 9.6, 9.8 and 11.2 ms. That spread is not a result, it is an unstable view. The rejection does not depend on it: every other framing is flat or negative under either reading, and one unstable narrow view is not the distance behavior request AC2 asks for.
  - The tuned candidate does cull: active meshes fall 20.9% at follow and 15.6% at day-street, and follow CPU p50 improves 5.2% (11.50 -> 10.90 ms). None of it reaches the frame. At 9-19 ms per frame these scenarios are not bound by traffic mesh count, so removing traffic meshes buys nothing; two views regress slightly. No variant reaches the 5% retention threshold.
  - Superseded partial evidence is kept, not hidden: `perf/reviews/task055-wave2-traffic/` failed at reference-server startup (no samples), and `perf/reviews/task055-wave2-traffic-tuned/` was interrupted after two of three rounds at the same source hash as the complete tuned run. Its two-round day-street figure of +5.2% collapsed to +1.0% once the third round landed -- the reason the shared repeated-measurement rule exists.
  - Request AC2 is NOT satisfied by this slice. Per item_188 AC3 a rejected traffic prototype alone does not deliver the required distance behavior; the distance policy must come from `item_189` automatic building detail, where the mesh population actually lives (1287 buildings against 166 vehicles).
  - The prototype is fully removed from `src/`, including the pedestrian-cull removal in `src/render/detail.ts` it had introduced to compose with itself; the 900 m `pedestrian_` level is restored.
- Wave 2 / item_189 RETAINED. Automatic building detail: boxes above camera radius 1100 m, models again only below 1000 m, with the manual override composed as `forced || automatic` in one `applyDistance()` that also resets the shadow-map refresh counter.
  - `perf/reviews/task055-wave2-detail/`, 48 samples, eight scenarios, three rounds, complete. Frame p50 night-overview +28.2% (17.00 -> 12.20 ms) and day-overview +15.5% (11.00 -> 9.30 ms). Re-read later through `scripts/review/paired.mjs`, the evidence holds under the stricter lens: baselines are stable across rounds (17.0/17.1/17.0 and 11.0/11.0/11.0) and the per-round paired deltas repeat (+28.2/+28.7/+28.8 and +15.5/+12.7/+16.4). Controls: day-street, day-district, follow, moving, night-saved and paused stay flat with unchanged active-mesh counts, which is the control the thresholds owe.
  - This is where request AC2 lands after the traffic rejection: the 1287 buildings are the mesh population that answers to distance, not the 166 vehicles.
  - Visual and correctness proof is a probe, not a claim: `scripts/review/detail.mjs` walks near -> far -> back and asserts models near, boxes far, boxes surviving between the thresholds on the way down, every model restored with no stale boxes, the override winning close in and releasing cleanly, boxes after a rebuild far out, shadow casters at both details, and no page errors. Evidence in `perf/reviews/task055-wave2-detail-visual/`, captures in `docs/media/detail-*.png`.
  - Thresholds are tuned against the real camera limit of 1200 m, so the automatic band is the top 100 m of zoom. A lower pair was rejected on sight: at 950 m the boxes lose towers, roof colours and farm rows still legible as models.
  - Recorded trade, not hidden: at 1200 m the swap is visible. State and construction colours carry over intact and the distant city stays readable, but tower silhouettes flatten. `docs/media/detail-1200-models-before.png` against `docs/media/detail-far-boxes.png`.
- Wave 3 / item_191 RETAINED, on reuse evidence rather than frame time. One bounded allocator per policy owner: `BuildingLifecycle` keeps its own, `buildingNeeds` keeps another. Both validate the parcel list by identity plus the fields that can move in place, and the whole-resident workforce, which is the only path population takes into `allocateWorkforce`.
  - `perf/reviews/task055-wave3-workforce/` counts allocations against drawn frames. Paused 353 frames / 0 / 0. Running x1 351 frames / 0 lifecycle / 9 needs. Running x4 336 frames / 1 / 94. Before, the panel recomputed every frame because it handed a freshly mapped array to a cache keyed on array identity.
  - `perf/reviews/task055-wave3-workforce-ab-retry/`, 42 samples, three rounds, complete. Frame time does not move: paired deltas run -6.2% to +4.3% with no consistent direction. CPU p50 is +10.5% paused, mixed elsewhere. No frame-time gain is claimed, and the retention does not need one -- request AC5 asks for correct independent reuse, not a threshold.
  - Method correction recorded in the same wave: the first attempt `perf/reviews/task055-wave3-workforce-ab/` ran under machine contention, with every case baseline varying 1.45x to 1.89x across rounds. Read as a median per side it produced a spurious +36.6% on day-street. `scripts/review/paired.mjs` now reads any distance run as per-round paired deltas and flags a baseline that moves across rounds; it was written because of that run and has been applied back over the retained wave 2 evidence.
- Wave 3 / item_190 NO-CHANGE, evidenced. No distance-based night-lighting prototype is shipped; the player's lights switch is untouched.
  - AC3's separate measurements, three rounds each against the integrated baseline, night-saved / night-street / night-overview frame p50: streetlight container disabled +32.1% / +25.0% / +11.8%; headlight container disabled +14.0% / +12.3% / +15.3%; all 808 individual emitters disabled with both containers still enabled +1.0% / +0.0% / -2.3%; emissive bulbs dimmed -0.5% / +0.7% / -2.5%; the player switch, which does all of it at once, +39.5% / +32.1% / +21.7%.
  - The night cost is the clustered container's own pass, not the emitters in it. A distance policy can only reach individual lamps, so it can only buy that +1.0% while paying for a substitute pool and a distance scan. The scoped risk -- "removing distant emitters may still leave a costly clustered pass" -- is now settled by measurement.
  - The emissive-substitute prototype was therefore never ported. Its appearance was not the blocker; there was no gain for it to preserve.
  - Two measurement bugs were found and fixed here, and the runs they produced were deleted rather than kept, because they measured nothing rather than measuring a rejected candidate: a clustered container removes its lights from `scene.lights`, so an ablation filtering that array silently hit zero lights; and the running clock calls `updateLights()` every hour change, which undoes any one-shot lighting mutation within a frame or two. `scripts/review/distance.mjs` now reaches emitters through `container.lights` and re-applies every lighting ablation each frame.
- Wave 4 / item_192 REJECTED before implementation, on measurement. No spatial tile batching ships for buildings, trees or streetlight geometry.
  - Buildings: hiding the geometry outright costs day-street +12.6%, day-district +19.3%, day-overview +3.1%, moving +39.5% (`perf/reviews/task055-wave4-ceiling-buildings/`). In-frustum shares are 609/1287 at radius 140, 1102/1287 at 600 and all of them at 1200, so a perfect scheme could reject at most 53% / 14% / 0%.
  - The exact ceiling, `perf/reviews/task055-wave4-perfectcull/`: keeping only in-frustum instances at a still camera -- ideal granularity, no added draw calls, strictly better than any tile grid -- removes 1316 of 2574 instances and buys -0.0% at day-district and -4.3% at day-street.
  - Trees (`.../ceiling-trees/`) cost nothing at three of four framings and +24.7% at `moving`, which is the framing with only 14% offscreen. Streetlight geometry (`.../ceiling-streetgeo/`) costs nothing anywhere.
  - The premise fails, not just the threshold: removing 49% of building instances buys nothing while removing 100% buys 12.6%, so the cost is fixed per mesh and per material rather than proportional to submitted instances. Tile batching multiplies meshes to reduce instances whose reduction is free.
  - Probe rule added here: an ablation that reaches no instances now throws rather than returning a sample, so a null result cannot mean "no measurement".
- Wave 4 / item_193 REJECTED, both tiling and distant LOD, before implementation. The heightmap, the single ground mesh, `pickHeightmap` and the dirty-row uploads are untouched.
  - Ground-only cost (`perf/reviews/task055-wave4-ceiling-ground/` and `.../-daynight/`): day-street -1.1%, day-district +1.9%, day-overview -6.6%, day-saved -0.0%, moving +7.0%, night-street +7.9%, night-saved +11.9%.
  - The single-variable pairs decide it: day-saved -0.0% against night-saved +11.9%, day-street -1.1% against night-street +7.9%. The ground costs nothing by day. Its cost is per-pixel shading as the largest receiver of the clustered lights, not its 911250 triangles -- the same cost `item_190` characterised. Tiling rejects geometry that produces no pixels; LOD reduces triangles that cost nothing. AC1 asks for separate tiling and LOD decisions; both fall to this one measurement, and that is recorded as one measurement rather than dressed up as two.
- Wave 5 / item_194 RETAINED as one minimal persisted option: an "Extra AA" checkbox, on by default, dropping scene multisampling from four samples to one. The FXAA pass behind "Smooth" is untouched and still smooths edges.
  - Measured first, three rounds each, night-saved / day-district / moving: multisampling off +21.6% / +4.7% / +7.0%; two-thirds render resolution +18.6% / +9.1% / +4.7%; multisampling halved to two +10.3% / +3.7% / +2.6%.
  - Multisampling was chosen over resolution scaling on that evidence: the larger win where it matters, and it costs edge quality only rather than blurring text and road markings. `pipeline.samples = 4` had no player control before this, so the slice's gap was a missing option, not a missing optimisation.
  - `scripts/review/look.mjs` proves the shipped wiring end to end -- four samples by default, one unchecked, four re-checked, and the choice persisted. Its first `scale` measurement was invalid rather than null: `setHardwareScalingLevel(1)` at device pixel ratio 1 changed nothing. It now renders at two thirds and throws if the level does not move.
- Integrated validation. `perf/reviews/task055-integrated/` compares the delivered build against the pre-task application baseline `071ae34` over eleven framings, three rounds each: night-overview +29.2%, day-overview +11.3%, and every other framing flat, which is what shipping a policy that only fires above 1100 m should look like. `Extra AA` off adds +21.6% at the saved night framing at the player's choice, and is not added to those numbers because it is not the default.
- `perf/reviews/task055-integrated-soak/` ran the edit/restore cycles and three minutes at x4: meshes hold at 2716 and lights at 1397 from the first restore to the paused flush, so nothing leaks across load, edit and restore.
- `npm run ci` and `npm run test:e2e` both pass (1166 unit tests, 30 node tests, 280 e2e checks). The e2e suite caught the one real conflict in this task: two assertions held the opposite contract, because `6d390f3` had deliberately removed the automatic detail this task restored. They were rewritten to the new contract with both commits named, and the gap that reversal leaves -- no "never boxes" state -- is recorded on `item_189` as a follow-up rather than dropped.
- Remaining: spatial and terrain experiments, resolution experiments, integrated visual/gameplay gates and final closeout. No application optimization is validated yet.
- Finished on 2026-09-07.
- Linked backlog item(s): `item_187_repair_performance_readiness_and_establish_comparable_distance_baselines`, `item_188_cull_distant_traffic_visuals_without_stopping_the_simulation`, `item_189_restore_automatic_building_detail_with_a_manual_boxes_override`, `item_190_bound_distant_night_lighting_while_preserving_city_readability`, `item_191_make_workforce_caching_reusable_across_unchanged_gameplay_frames`, `item_192_batch_static_city_geometry_by_spatial_tiles_with_shared_assets`, `item_193_evaluate_terrain_tiling_and_distant_geometry_without_changing_the_heightmap`, `item_194_evaluate_a_minimal_render_resolution_quality_option`
- Related request(s): `req_054_deliver_measured_distance_aware_city_performance`

# Links
- Request: `req_054_deliver_measured_distance_aware_city_performance`
- Product brief(s): `prod_040_a_smoother_city_near_and_far_without_losing_the_distant_city`
- Architecture decision(s): (none yet)
