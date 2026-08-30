## task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work - Implement the rebuild-granularity and startup-payload performance work
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 55%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:19:50
> Owner: codex

# AI Context
- Summary: Orchestration for req_008: measure first, then cut the ground-refresh allocations, bound the terrain and ground work to the changed region, narrow the road and traffic rebuilds, trim the glTF loader, unblock the first frame, and stop the per-frame queue rebuild.
- Keywords: implement, rebuild, granularity, startup, payload, performance, work
- Use when: Implementing any of the seven backlog slices under req_008, in the order the plan sets out — the measurement item comes first.
- Skip when: The change belongs to req_005's rebuild internals, req_007's toggle and load scope, or alters how the city looks.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.
- `adr_003_rebuild_terrain_roads_plots_and_buildings_as_derived_views` governs this task. It already set the precondition for doing this work at all ("keep the full rebuild until measured frame time shows that it misses the interaction budget" -- which is why the measurement slice runs first) and the constraint on doing it ("any later incremental path must produce the same result as a clean rebuild" -- which is the equality test in `item_025_bound_the_terrain_re_stamp_and_ground_refresh_to_the_region_a_placement_changed`). The ADR needs updating once the incremental path lands, since its fixed rebuild order stops being the only path.
- Sequencing against the sibling tasks, which touch the same files:
  - `task_009_implement_the_load_rollback_and_rendering_hygiene_review_findings` removes the toggle callers of `rebuild()` in `src/app/app.ts`, and gives `src/render/traffic.ts`, `roadMesh.ts` and `drawTool.ts` their first unit coverage. Land that task before this one: the rebuild surface is then already smaller, and the road-mesh and traffic-loop reworks here have a safety net instead of only a screenshot.
  - `task_011_implement_one_source_of_truth_for_building_model_geometry` restructures where `src/render/buildings.ts` gets a model's geometry, and this task's first-frame slice restructures how the same file loads models. Do not run them in parallel; take task_011 first, since it decides what the loading change then has to preserve.

# Plan
- [ ] 1. Read this request and its seven backlog slices; confirm req_005's rebuild internals and req_007's toggle/load scope stay closed and untouched.
- [ ] 2. Build the measurement first, and record the baseline -- every item after this one is judged against it.
- [ ] 3. Take the two cheap allocation fixes in the ground refresh, and re-measure.
- [ ] 4. Bound the heightmap re-stamp and ground refresh to the changed region, with the test that pins it to the full-map result.
- [ ] 5. Narrow the road mesh and traffic rebuilds to the segments a placement touched.
- [ ] 6. Trim the glTF loader to the extensions the models use, and record the before/after payload.
- [ ] 7. Unblock the first frame from the full model catalogue.
- [ ] 8. Make the traffic frame loop stop rebuilding its queue bookkeeping every frame.
- [ ] 9. Run the fast gate, then the browser interaction and visual checks, and confirm the city is visually identical throughout.
- [ ] 10. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [ ] 11. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_024_stop_the_ground_refresh_allocating_per_vertex_and_per_rebuild`
- `item_025_bound_the_terrain_re_stamp_and_ground_refresh_to_the_region_a_placement_changed`
- `item_026_rebuild_only_the_road_meshes_and_movers_a_placement_touched`
- `item_027_ship_only_the_gltf_loader_features_the_models_actually_use`
- `item_028_draw_the_first_frame_without_waiting_on_all_20_building_models`
- `item_029_stop_rebuilding_the_traffic_queue_bookkeeping_every_frame`
- `item_030_make_rebuild_and_startup_cost_measurable_against_a_known_city`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC2 -> `item_024_stop_the_ground_refresh_allocating_per_vertex_and_per_rebuild`. Proof deferred to slice closeout.
- request-AC7 -> `item_024_stop_the_ground_refresh_allocating_per_vertex_and_per_rebuild`. Proof deferred to slice closeout.
- request-AC1 -> `item_025_bound_the_terrain_re_stamp_and_ground_refresh_to_the_region_a_placement_changed`. Proof deferred to slice closeout.
- request-AC6 -> `item_025_bound_the_terrain_re_stamp_and_ground_refresh_to_the_region_a_placement_changed`. Proof deferred to slice closeout.
- request-AC7 -> `item_025_bound_the_terrain_re_stamp_and_ground_refresh_to_the_region_a_placement_changed`. Proof deferred to slice closeout.
- request-AC1 -> `item_026_rebuild_only_the_road_meshes_and_movers_a_placement_touched`. Proof deferred to slice closeout.
- request-AC7 -> `item_026_rebuild_only_the_road_meshes_and_movers_a_placement_touched`. Proof deferred to slice closeout.
- request-AC3 -> `item_027_ship_only_the_gltf_loader_features_the_models_actually_use`. Proof deferred to slice closeout.
- request-AC7 -> `item_027_ship_only_the_gltf_loader_features_the_models_actually_use`. Proof deferred to slice closeout.
- request-AC4 -> `item_028_draw_the_first_frame_without_waiting_on_all_20_building_models`. Proof deferred to slice closeout.
- request-AC7 -> `item_028_draw_the_first_frame_without_waiting_on_all_20_building_models`. Proof deferred to slice closeout.
- request-AC5 -> `item_029_stop_rebuilding_the_traffic_queue_bookkeeping_every_frame`. Proof deferred to slice closeout.
- request-AC7 -> `item_029_stop_rebuilding_the_traffic_queue_bookkeeping_every_frame`. Proof deferred to slice closeout.
- request-AC6 -> `item_030_make_rebuild_and_startup_cost_measurable_against_a_known_city`. Proof deferred to slice closeout.
- request-AC7 -> `item_030_make_rebuild_and_startup_cost_measurable_against_a_known_city`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`
- Product brief(s): `prod_005_a_city_builder_that_stays_responsive_as_the_city_grows`
- Architecture decision(s): `adr_003_rebuild_terrain_roads_plots_and_buildings_as_derived_views`

# Evidence
- AC6 | date: 2026-08-30 | command: `npm run test:e2e` | result: passed on 2026-08-30; sample startupms=6816.2, demobuildms=5490.5, placementms=581.3, segments=238 | Debug surface exposes window.cityjump.measureCosts() for startup, demo build, and one placement cost against the existing demo-city path.
- AC2 | date: 2026-08-30 | command: `npm run ci` | result: passed on 2026-08-30: vitest, architecture tests, build/typecheck, logics lint/audit passed | Ground refresh no longer creates Color4 constants/Lerp results per terrain vertex and reuses its normal Float32Array for recomputation.
