## item_193_evaluate_terrain_tiling_and_distant_geometry_without_changing_the_heightmap - Evaluate terrain tiling and distant geometry without changing the heightmap
> From version: 0.5.2
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 15:22:14

# AI Context
- Summary: The 5400 m heightfield is one dense render mesh. Heightmap picking and dirty row uploads already exist and must survive a rendering change.
- Keywords: evaluate, terrain, tiling, distant, geometry, changing, heightmap
- Use when: implementing this bounded performance slice after its stated dependencies and comparing it with the recorded GPU baseline.
- Skip when: Coarsening simulation terrain or changing road/placement rules.

# Problem
- The 5400 m heightfield is one dense render mesh. Heightmap picking and dirty row uploads already exist and must survive a rendering change.
- Full ground rebuild costs roughly 193 ms, while direct dirty ground work is about 0.5 ms; loading cost is not evidence of per-frame dominance.

# Scope
- In:
  - Priority rationale: The ground submits 911250 triangles in one mesh, but its steady-state share is not isolated yet.
  - Depends on: baseline and spatial-batch results; do not couple implementation to a general tile system. First isolate ground-only render cost with simulation and other render settings unchanged.
  - Prototype render tiles aligned to 8 m heightmap cells (start 32x32 or 64x64 cells); retain the authoritative full-resolution heightmap and current exact pickHeightmap path for tools.
  - Compare frustum rejection at full resolution before adding distant LOD. Only when justified, test coarser distant grids with hysteresis and stitched/shared boundaries; retain exact geometry around road cuts/overlays if coarsening would expose roads or alter alignment.
  - Expand dirty regions for normal dependencies and neighboring seams. Account for scene pointer-up ground picking after replacing the single ground mesh; preserve offshore terrain, ground shadows and material ownership.
  - Measure steady frames, camera travel, load/full rebuild and end-to-end road/zone edit latency including deferred work separately. Remove experiments that cannot meet visual/correctness/performance gates.
- Out:
  - Coarsening simulation terrain or changing road/placement rules.
  - World streaming, quadtree infrastructure or physics changes.

# Acceptance criteria
- AC1: Tiling and LOD each receive separate evidence and a keep/reject decision; a cheap full-resolution tile win does not require shipping LOD.
- AC2: Exact picks match the original triangle surface on slopes, coastlines and road cuts; tile boundaries and LOD transitions have no holes, normal discontinuities or exposed road geometry.
- AC3: Partial/full rebuild equivalence and disposal pass targeted tests and rendered e2e checks; nearby detail and saved terrain data remain unchanged.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: Tiling and LOD each receive separate evidence and a keep/reject decision; a cheap full-resolution tile win does not require shipping LOD.
- request-AC9 -> This backlog slice. Proof: AC2: Exact picks match the original triangle surface on slopes, coastlines and road cuts; tile boundaries and LOD transitions have no holes, normal discontinuities or exposed road geometry.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_040_a_smoother_city_near_and_far_without_losing_the_distant_city`
- Architecture decision(s): (none yet)
- Request: `req_054_deliver_measured_distance_aware_city_performance`
- Primary task(s): `task_055_deliver_and_validate_the_distance_aware_performance_slices`

# Priority
- Priority: Medium
- Rationale: The ground submits 911250 triangles in one mesh, but its steady-state share is not isolated yet.
