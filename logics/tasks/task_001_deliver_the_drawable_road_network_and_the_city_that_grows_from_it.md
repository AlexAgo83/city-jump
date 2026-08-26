## task_001_deliver_the_drawable_road_network_and_the_city_that_grows_from_it - Deliver the drawable road network and the city that grows from it
> From version: 1.0.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 95%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-26 17:54:06
> Owner: claude

# AI Context
- Summary: Orchestrates the seven backlog items in dependency order, from the Babylon scene through the graph, the drawing tool, the road surface, the buildings, the junction rework and finally the heightmap.
- Keywords: orchestration, delivery order, road network, drawing tool, road mesh, thin instances, junctions, heightmap
- Use when: sequencing the work, checking what is done and what is next, or deciding whether a step can start before another finishes.
- Skip when: you need the reasoning behind a decision rather than its order -- that is in the request's Context section.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. 1. Stand up the build, the dev command and the Babylon scene, with simulation logic kept clear of the renderer.
- [x] 2. 2. Model the graph: nodes, quadratic Bezier segments, arc-length parameterisation, three-dimensional positions behind the terrain-height function, and the split operation -- with its tests, headless.
- [x] 3. 3. Build the drawing tool over it: the four snapping rules, draw-time validation with reasons, and the preview; network drawn as bare lines.
- [x] 4. 4. Generate the road surface by extrusion along the arc-length polyline, with flat-disc junctions, regenerated from the graph after each edit.
- [x] 5. 5. Derive building slots from segments, fix and write down the MeshAnvil asset convention, and render buildings as thin instances; measure the frame rate at a thousand buildings and record it.
- [x] 6. 6. Replace the disc junctions with trimmed-back segments and a closing polygon, covering the two-segment and narrow-angle cases.
- [x] 7. 7. Add the heightmap, point the terrain-height function at it, and flatten the terrain beneath the roads with an embankment margin; confirm the graph needed no change.
- [x] 8. 8. Re-run the headless tests and the Logics gates before closeout, and record the measured frame rate and the machine it was measured on.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_001_stand_up_the_babylon_scene_and_the_dev_loop`
- `item_002_model_the_road_network_as_a_graph_of_quadratic_bezier_segments`
- `item_003_draw_roads_with_the_pointer_under_four_snapping_rules`
- `item_004_generate_the_road_surface_from_the_graph_with_covered_junctions`
- `item_005_derive_building_slots_from_segments_and_render_them_as_thin_instances`
- `item_006_replace_disc_junctions_with_trimmed_back_polygons`
- `item_007_put_the_network_on_a_heightmap_and_flatten_the_terrain_beneath_it`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC2 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC3 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC4 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC13 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC5 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC6 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC7 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC13 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC2 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC8 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC10 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC11 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC9 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC4 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`
- request-AC12 -> This task. Proof: Implemented across 29e0c43, 9920317, f8f32f9, 4924135, 8552d6a and 118f6ff; validated with npm test (51 headless tests), npx tsc, npx vite build, and node scripts/shot.mjs driving the built app in headless Chromium. Source: `118f6ff`

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_000_draw_a_road_network_the_city_grows_from`
- Product brief(s): `prod_001_a_city_that_grows_from_the_roads_you_draw`
- Architecture decision(s): (none yet)
