## item_166_bound_terrain_picking_in_the_drawing_tools - Bound terrain picking in the drawing tools
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Bound the terrain intersection work that every pointer move performs against a 911,250-triangle ground mesh.
- Keywords: bound, terrain, picking, drawing, tools
- Use when: changing pointer picking in the road, zone, nature or bulldoze tools.
- Skip when: changing what the tools do once a hit position is known.

# Problem
- src/render/drawTool.ts:400 calls scene.pick against the ground from the pointer-move observer at line 639, reached by the road, zone, nature and bulldoze tools.
- src/render/ground.ts:30 creates one terrain mesh; runtime inspection confirmed a single submesh of 911,250 triangles, and the nearest-triangle picker walks all its indices.
- Measured 42/46 FPS for road/zone pointer movement versus 75 FPS stationary or in selection mode, at 18-19 ms per pick; two fresh-load confirmations measured 43 FPS and 17.7/17.5 ms per pick.

# Scope
- In:
  - the shared terrain picking path used by drawTool pointer movement
  - bounded intersection work that keeps hit positions correct on slopes and road cuts
- Out:
  - disabling accurate picking or substituting an infinite plane, which would change behaviour
  - the other five per-frame cost slices

# Acceptance criteria
- AC1: Pointer movement in road, zone, nature and bulldoze tools no longer performs unbounded terrain intersection work; slopes, road cuts and misses keep their current hit positions, and a miss is still a miss.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Pointer movement in road, zone, nature and bulldoze tools no longer performs unbounded terrain intersection work; slopes, road cuts and misses keep their current hit positions, and a miss is still a miss.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits.md`
- Primary task(s): (none yet)

# Priority
- Priority: High
- Rationale: Largest measured interactive regression: 42-46 FPS while drawing versus 75 FPS stationary.

# Notes
- Hybrid rationale: Derived from request `req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits.md`.
- Generated locally by logics-manager.

# Tasks
- `task_047_land_the_large_city_frame_cost_reductions_in_measured_order`
