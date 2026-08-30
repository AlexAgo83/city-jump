## item_024_stop_the_ground_refresh_allocating_per_vertex_and_per_rebuild - Stop the ground refresh allocating per vertex and per rebuild
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:52:52

# AI Context
- Summary: `terrainColor` allocates four constant Color4s plus two Lerps per vertex across 456,976 vertices, and `refresh` allocates a fresh 1.37M-entry `number[]` for normals on every call.
- Keywords: ground, refresh, allocating, per, vertex, rebuild
- Use when: Touching `terrainColor` or `refresh` in `src/render/ground.ts`.
- Skip when: The work narrows which vertices are refreshed (that is item_025) or changes the terrain palette.

# Problem
- `terrainColor` builds four constant `Color4` objects and two `Color4.Lerp` results on every call, and `refresh` calls it once per vertex across 456,976 vertices -- roughly 2.7 million throwaway objects per rebuild, from colours that never change.
- `refresh` allocates a fresh `number[]` for `VertexData.ComputeNormals` on every call: 1.37 million entries, benchmarked at 15-30 ms under a warm V8 before any browser or GPU cost.

# Scope
- In:
  - Hoist the constant colours in `terrainColor` to module scope and write the result into the existing colour buffer without allocating intermediates per vertex.
  - Reuse a preallocated typed array for the normals instead of a new plain array per refresh.
  - Confirm the terrain renders identically with the visual check.
- Out:
  - Narrowing which vertices are refreshed -- that is the dirty-region item.
  - Changing the terrain palette, the heightmap resolution, or the shading.

# Acceptance criteria
- AC1: `terrainColor` allocates no constant colour objects per call, and `refresh` reuses a preallocated buffer for normals rather than allocating one per call.
- AC2: The rendered terrain is visually unchanged, confirmed by the visual shot check.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: `terrainColor` allocates no constant colour objects per call, and `refresh` reuses a preallocated buffer for normals rather than allocating one per call.
- request-AC7 -> This backlog slice. Proof: AC2: The rendered terrain is visually unchanged, confirmed by the visual shot check.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_005_a_city_builder_that_stays_responsive_as_the_city_grows`
- Architecture decision(s): (none yet)
- Request: `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`
- Primary task(s): `task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work`

# Notes
- Task `task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work` was finished via `logics-manager flow finish task` on 2026-08-30.
