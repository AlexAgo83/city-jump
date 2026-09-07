## task_052_fix_terrain_crossing_roads_and_zones - Fix terrain crossing roads and zones
> From version: 0.5.1
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-09-07 12:20:59

# AI Context
- Summary: Road and pad height claims do not protect the outside vertices of an 8 m terrain triangle; cached zone heights also predate final earthworks.
- Keywords: fix, terrain, crossing, roads, zones
- Use when: Terrain hides pavement or zone cells after construction or on slopes.
- Skip when: Investigating lighting, building models, or road connectivity.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Reproduce coarse-grid road and stale-zone intersections with regression checks.
- [x] 2. Correct terrain support and zone geometry, inspect slopes and validate CI/E2E, record evidence.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_175_correct_road_terrain_support_and_drape_zoning_over_final_ground`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Road and overlay geometry regressions passed in src/render/terrain-surfaces.test.ts and src/render/overlayReveal.test.ts; npm test passed 369 tests on 2026-09-07. The run_003 terrain runbook records failing-before fixtures, browser clearance and reload checks, and retained visual evidence. Source: `src/render/terrain-surfaces.test.ts, src/render/overlayReveal.test.ts, logics/runbook/run_003_cut_terrain_under_a_road_or_a_junction_without_raw_ground_poking_through.md`
- request-AC2 -> This task. Proof: Road and overlay geometry regressions passed in src/render/terrain-surfaces.test.ts and src/render/overlayReveal.test.ts; npm test passed 369 tests on 2026-09-07. The run_003 terrain runbook records failing-before fixtures, browser clearance and reload checks, and retained visual evidence. Source: `src/render/terrain-surfaces.test.ts, src/render/overlayReveal.test.ts, logics/runbook/run_003_cut_terrain_under_a_road_or_a_junction_without_raw_ground_poking_through.md`
- request-AC3 -> This task. Proof: Road and overlay geometry regressions passed in src/render/terrain-surfaces.test.ts and src/render/overlayReveal.test.ts; npm test passed 369 tests on 2026-09-07. The run_003 terrain runbook records failing-before fixtures, browser clearance and reload checks, and retained visual evidence. Source: `src/render/terrain-surfaces.test.ts, src/render/overlayReveal.test.ts, logics/runbook/run_003_cut_terrain_under_a_road_or_a_junction_without_raw_ground_poking_through.md`

# Validation
- (no validation recorded yet)
- command: `npm run ci; npm run test:e2e; node scripts/with-dev-server.mjs scripts/terrain-shot.mjs /tmp/city-jump-terrain-final` | result: passed | date: 2026-09-07 | note: 2026-09-07: 369 unit tests, architecture/scenario/build/Logics gates and all interaction checks passed. Browser measured zero road/terrain overlaps before and after verified Demo autosave reload; day/night/zone captures inspected.
- Finish workflow executed on 2026-09-07.
- Linked backlog/request close verification passed.

# Report
- Added a lowering-only pavement support pass after earthworks, preserving local road grade and elevated/tunnel rules.
- Zone colours, occupied-cell fills and outlines now follow clipped final-ground triangles.
- The regression fixtures failed before their fixes; CI passed. The populated Demo browser check measured zero terrain overlaps before and after save reload; day/night/zone captures are retained in docs/media.
- E2E interaction validation passed after updating the grid-perimeter measurement and selecting node-hover points inside the actual 8 m road snap radius. Demolition, rebuilding and save reload checks passed.
- Finished on 2026-09-07.
- Linked backlog item(s): `item_175_correct_road_terrain_support_and_drape_zoning_over_final_ground`
- Related request(s): `req_050_keep_roads_and_zone_overlays_clear_of_terrain`

# Links
- Request: `req_050_keep_roads_and_zone_overlays_clear_of_terrain`
- Product brief(s): `prod_037_continuous_roads_and_legible_terrain_zoning`
- Architecture decision(s): (none yet)
