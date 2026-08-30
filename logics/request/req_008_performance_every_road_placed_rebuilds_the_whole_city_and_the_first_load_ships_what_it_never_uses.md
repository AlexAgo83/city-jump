## req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses - Performance: every road placed rebuilds the whole city, and the first load ships what it never uses
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:52:51

# AI Context
- Summary: A road placement costs a whole-city rebuild (full heightmap re-stamp, a 456,976-vertex ground refresh allocating ~2.7M colour objects and a 1.37M-entry normals array, every road mesh and mover disposed), while the first load ships 561 KB gz of JS including 93 KB of unused gaussian splatting and blocks the first frame on 1.8 MB of building models.
- Keywords: performance, road, placed, rebuilds, whole, city, first, load, ships, never, uses
- Use when: Working on the cost of `rebuild()` in `src/app/app.ts`, `conformToRoads`, `ground.refresh`, the road/traffic rebuild granularity, the glTF loader import, model loading at startup, or the traffic `registerBeforeRender` loop.
- Skip when: The work is about what `rebuild()` computes internally (req_005, Done), about when it is triggered by a visibility toggle (the visibility-toggle slice under req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene), or about changing how the city looks.

# Needs
- Placing one road costs a whole-city rebuild. `createDrawTool`'s `onCommitted` (`src/render/drawTool.ts:341`) runs `rebuild()` in `src/app/app.ts`, which resets and re-stamps the entire heightmap (`conformToRoads` starts with `current.set(this.base)` and `claim.fill(Infinity)`, then re-samples every segment in the graph), refreshes the whole ground mesh, disposes and recreates every road mesh (`roadMesh.ts:133`), disposes and re-instantiates every traffic mover, and rebuilds the buildable-grid line system. The cost of each placement scales with the size of the city already built, so a session's total cost grows quadratically with the number of placements.
- The ground refresh is the single heaviest step in that rebuild. `GROUND_SIZE 5400 / GROUND_CELL 8 + 1` gives a 676x676 grid: 456,976 vertices and 911,250 triangles, all re-walked on every rebuild. Normals are recomputed into a freshly allocated plain `number[]` of 1.37 million entries (measured at 15-30 ms per call under a warm V8, before any browser or GPU cost), and the two `updateVerticesData` calls re-upload roughly 5.5 MB of positions and 7.3 MB of colours each time.
- `terrainColor` (`src/render/ground.ts:249`) allocates four constant `Color4` objects plus two `Color4.Lerp` results on every call, and it is called once per vertex during `refresh` -- around 2.7 million short-lived objects per ground refresh, from four colours that never change.
- The first load ships 561 KB of gzipped JavaScript, 93 KB of which (17%) is the gaussian splatting mesh implementation the app never uses. `import "@babylonjs/loaders/glTF"` (`src/render/buildings.ts:1`) registers every glTF extension, pulling `gaussianSplattingMesh` (93 KB gz), ten `flowGraph` chunks for KHR_interactivity (13 KB gz), `glTFLoaderAnimation` (10 KB gz), the OpenPBR material adapter (7 KB gz), `bone`, `environmentTextureTools` and `workerPool` into the eager import graph. The project's own models are static, unanimated and untextured.
- The first frame waits on every building model. `createBuildingRenderer` (`src/render/buildings.ts:171`) `Promise.all`s all 20 GLBs -- 1.8 MB uncompressed, no Draco or meshopt, up to 250 KB for a single lot -- and `startApp` awaits it, then each model pays a main-thread `convertToFlatShadedMesh` and `enableEdgesRendering` before anything renders.
- The traffic frame loop allocates per frame at 60 fps. `scene.registerBeforeRender` (`src/render/traffic.ts:937`) builds a queue `Map` keyed by a freshly interpolated string (`` `${segment.id}:${direction}:${lane.offset}` ``) for every car every frame, a second `ahead` Map, a sort per queue, and then `roundaboutRooms` which allocates another flatMap, Map and sort. Queue order only changes when a mover boards or arrives -- the model has no overtaking, as the code's own comment states.

# Context
- These findings come from a performance-focused review of city-jump 0.2.0, measured against the repository: vertex and triangle counts derived from `GROUND_SIZE`/`GROUND_CELL`, normal-recompute timing benchmarked directly, and bundle attribution taken chunk by chunk from a real `npm run build` output.
- `req_005_review_findings_redundant_and_quadratic_rebuild_work` (Done) removed redundant and quadratic work from inside `rebuild()`. This request is about the granularity of the rebuild itself -- how much of the city a single placement should touch -- and about payload and per-frame cost, none of which req_005 covered.
- The visibility-toggle slice under `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene` stops those toggles from calling `rebuild()` at all. That is a different trigger: this request is about what `rebuild()` costs when it genuinely does need to run, after a road is actually placed. The two are complementary and neither supersedes the other.
- The rendering layer already does the expensive things well: thin instances for buildings, trees and ground shadows; a `ClusteredLightContainer` for headlights and streetlights; junction geometry, rings and signal cycles memoised per node; `alwaysSelectAsActiveMesh` where frustum culling cannot help; a 1024 CSM at QUALITY_LOW. The problem is rebuild granularity and startup payload, not the rendering approach.
- Any change here has to keep the visual result identical -- the terrain conformance, road surfaces, traffic and buildings must look the same as they do today, which the visual shot script and the browser interaction suite are the tools for confirming.

# Acceptance criteria
- AC1: Placing a road on a large city costs work proportional to what that placement actually changed, not to the size of the whole city -- the heightmap re-stamp, the ground refresh and the road mesh rebuild are all bounded to the affected region or the affected segments.
- AC2: A ground refresh no longer allocates a fresh multi-million-element array for normals, and no longer allocates constant colour objects per vertex; the terrain renders exactly as it does today.
- AC3: The eager first-load JavaScript payload no longer includes the gaussian splatting implementation or the other glTF extensions the project's models do not use, and every building model still loads and renders as it does today.
- AC4: The first frame no longer waits on all 20 building models being downloaded and post-processed; a restored city still shows the right building for every parcel.
- AC5: The traffic frame loop no longer rebuilds its queue grouping, string keys and sort order from scratch on every frame, and traffic behaves as it does today (queueing behind the car in front, stopping at lights, taking roundabouts).
- AC6: There is a repeatable way to see whether these costs regress -- a measurement captured against a known city, so a later change that puts the whole-city rebuild back is visible rather than invisible.
- AC7: The existing checks still pass unchanged: unit tests, architecture tests, typecheck, build, and the browser interaction and visual checks confirming the city looks the same.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_005_a_city_builder_that_stays_responsive_as_the_city_grows`
- Architecture decision(s): (none yet)

# References
- src/render/ground.ts
- src/render/roadMesh.ts
- src/render/traffic.ts
- src/render/buildings.ts
- src/render/drawTool.ts
- src/sim/heightmap.ts
- src/app/app.ts
- logics/architecture/adr_003_rebuild_terrain_roads_plots_and_buildings_as_derived_views.md
- logics/runbook/run_003_cut_terrain_under_a_road_or_a_junction_without_raw_ground_poking_through.md
- logics/runbook/run_005_add_lights_to_the_scene_without_freezing_the_rebuild.md
- logics/request/req_005_review_findings_redundant_and_quadratic_rebuild_work.md
- logics/request/req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene.md

# Backlog
- `item_024_stop_the_ground_refresh_allocating_per_vertex_and_per_rebuild`
- `item_025_bound_the_terrain_re_stamp_and_ground_refresh_to_the_region_a_placement_changed`
- `item_026_rebuild_only_the_road_meshes_and_movers_a_placement_touched`
- `item_027_ship_only_the_gltf_loader_features_the_models_actually_use`
- `item_028_draw_the_first_frame_without_waiting_on_all_20_building_models`
- `item_029_stop_rebuilding_the_traffic_queue_bookkeeping_every_frame`
- `item_030_make_rebuild_and_startup_cost_measurable_against_a_known_city`
