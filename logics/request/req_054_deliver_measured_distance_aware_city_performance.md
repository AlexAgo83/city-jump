## req_054_deliver_measured_distance_aware_city_performance - Deliver measured distance-aware city performance
> From version: 0.5.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 15:21:08

# AI Context
- Summary: Execute eight measured performance slices from the September 7 review; preserve distant simulation and visual quality, with explicit rejection evidence for prototypes that do not earn their cost.
- Keywords: deliver, measured, distance, aware, city, performance
- Use when: choosing and delivering the remaining distance, lighting, CPU, terrain and resolution improvements against the current model catalog.
- Skip when: proposing asset streaming, changing simulation rules or citing historical ablations as an implemented gain.

# Needs
- Turn the September 7 performance review into an executable delivery chain covering every candidate, preserving city appearance and offscreen gameplay.
- Restore missing distance policies, investigate spatial rendering and night lighting, finish the confirmed workforce cache gap, and repair measurement/documentation drift.
- Every speculative rendering change includes a prototype and measured keep/reject outcome; no unmeasured FPS promise or silent omission. Keep shared assets resident; loading/streaming needs memory evidence outside this chain.

# Context
- Source review is req_053; application baseline 4d81541, 107 loaded models and 1287 buildings on the reference fixture. The source review remains historical evidence, not a competing implementation request.
- Three GPU rounds at saved framing measured day 93.2 FPS, night 58.6, night lights-off 91.7, night buildings-hidden 93.2, bloom-off 59.0. These diagnostic ablations overlap and cannot predict partial culling gains.
- Full rebuild median 363.7 ms; direct dirty 23.7 ms excludes deferred parcel rebuilding. Distinguish loading/edit stalls, steady frames and memory throughout.
- Architecture remains deterministic browser-free src/sim, Babylon in src/render, DOM in src/ui and composition in src/app. No ECS, engine facade or new dependency is required.
- Resolved choices: manual force-boxes overrides auto; simulation continues outside view; no asset streaming or adaptive resolution; experiment thresholds/tile sizes are initial candidates subject to the common evidence gate.
- This corpus scopes all eight investigations and their necessary tests/docs; no application optimization has been implemented yet. Negative results are completed investigations only with committed measurements and an explicit verdict.

# Acceptance criteria
- AC1: All performance harnesses use current asset/fixture readiness with explicit missing-asset diagnostics, record the actual renderer and workload, and reproduce fresh baseline measurements without temporary script edits.
- AC2: Traffic visibility follows camera distance at bounded cadence while routes, queues, simulation time and gameplay outcomes continue offscreen; child meshes, headlights, selection and follow remain coherent.
- AC3: Automatic building detail uses hysteresis and the existing simplified geometry, retains a manual force-boxes override, composes with all view/tool toggles and preserves selection and shadow invalidation.
- AC4: Night lighting receives a measured distance-based implementation or an explicitly evidenced no-change decision; accepted changes preserve visible road/facade illumination and avoid per-camera light creation/disposal.
- AC5: Lifecycle and needs allocations reuse results for unchanged semantic inputs independently; policy-specific population bands, incumbency and rebuilding exclusions remain correct and deterministic.
- AC6: Spatial batching is prototyped for buildings and trees, with streetlight geometry evaluated separately, and either retained with measured frame-time benefit or removed with evidence; retained batches share assets, preserve identity, shadows and bounded rebuild equivalence.
- AC7: Terrain rendering is tested separately for tiling and distant LOD; any retained implementation preserves the authoritative heightmap, picking, road cuts, seams, dirty-update equivalence and disposal. A rejected experiment includes its recorded cost and reason.
- AC8: Render resolution and multisampling are evaluated at DPR 1 and 2; either ship one measured, persisted quality control with the current quality as default or document a measured no-change decision. Do not silently change existing look controls.
- AC9: Every candidate has repeated comparable before/after evidence or a documented rejection; no feature-ablation ratio is claimed as an implemented gain. Correctness, visual/input checks, CI, workflow validation and updated performance documentation pass before closeout.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_040_a_smoother_city_near_and_far_without_losing_the_distant_city`
- Architecture decision(s): (none yet)

# References
- logics/request/req_053_review_findings_distance_culling_and_remaining_frame_costs.md
- perf/reviews/fps-distance-2026-09-07.json
- perf/cities/ma-ville.json
- docs/performance.md
- scripts/review/config.mjs
- scripts/review/profile.mjs
- scripts/review/run.mjs
- scripts/perf.mjs
- scripts/ablate.mjs
- tests/perf-review.mjs
- src/render/detail.ts
- src/render/buildings.ts
- src/render/trees.ts
- src/render/streetlights.ts
- src/render/vehicleLights.ts
- src/render/trafficMovers.ts
- src/render/ground.ts
- src/render/terrainPick.ts
- src/render/scene.ts
- src/render/postFx.ts
- src/sim/buildingLifecycle.ts
- src/sim/workforce.ts
- src/sim/buildingKinds.ts
- src/app/app.ts
- src/ui/controls.ts
- logics/runbook/run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint.md
- logics/runbook/run_009_rerun_the_large_city_performance_review.md

# Backlog
- `item_187_repair_performance_readiness_and_establish_comparable_distance_baselines`
- `item_188_cull_distant_traffic_visuals_without_stopping_the_simulation`
- `item_189_restore_automatic_building_detail_with_a_manual_boxes_override`
- `item_190_bound_distant_night_lighting_while_preserving_city_readability`
- `item_191_make_workforce_caching_reusable_across_unchanged_gameplay_frames`
- `item_192_batch_static_city_geometry_by_spatial_tiles_with_shared_assets`
- `item_193_evaluate_terrain_tiling_and_distant_geometry_without_changing_the_heightmap`
- `item_194_evaluate_a_minimal_render_resolution_quality_option`
