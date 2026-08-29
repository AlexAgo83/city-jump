## item_015_stamp_junction_ground_flatten_once_instead_of_per_grid_cell - Stamp junction ground flatten once instead of per grid cell
> From version: 0.1.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-29 10:33:28

# AI Context
- Summary: The per-junction ground-flatten loop added this session (`aa8167e`) stamps ~111 small discs per junction where one `stamp()` call at the junction's own radius produces the same shape.
- Keywords: heightmap, junction flatten, stamp, performance
- Use when: touching `Heightmap.conformToRoads`'s junction-flattening loop.
- Skip when: the double `conformToRoads` call (`item_014`) or the tree-placement scan (`item_016`) -- separate slices of the same review.

# Problem
The per-junction ground-flatten loop should not cost far more than the flattened shape needs. `src/sim/heightmap.ts:149-159` (added in `aa8167e`, this session) stamps a junction's disc by looping over every grid point inside `radius` and calling `stamp()` once per point with `half = step` (`step = max(1, cell/2)`), each `stamp()` call re-scanning its own bounding box. One `stamp(node.pos.x, node.pos.z, node.pos.y, radius, radius + EMBANKMENT)` call produces the same flatten-then-blend shape (`stamp`'s own `distance <= half` / smoothstep logic, `src/sim/heightmap.ts:180-186`, composes correctly across overlapping calls via `this.claim`) at a fraction of the cost. With this repo's actual constants (`GROUND_CELL = 8` in `src/render/ground.ts:14` so `cell/2 = 4`; `EMBANKMENT = 10`; avenue width 14 in `src/sim/roadTypes.ts` giving `roundaboutRadius = 14 * 1.7 = 23.8`), the current loop runs roughly 111 `stamp()` calls per junction touching roughly 25 cells each, versus one call touching roughly 75 cells directly -- about 35-40x more work than necessary, on every `rebuild()`, for every junction on the map.

# Scope
- In:
  - Replace the per-grid-point loop with a single `stamp()` call per junction at the junction's own `radius`/`radius + EMBANKMENT`, verified to produce the same visible terrain (existing junction/roundabout e2e and unit coverage).
- Out:
  - The double `conformToRoads` call (`item_014`) and the tree-placement scan (`item_016`) -- separate, independent fixes.

# Acceptance criteria
- AC2: The per-junction ground flatten produces the same visible result (verified against the existing e2e/unit coverage that exercises junction and roundabout terrain) while making a bounded number of `stamp()` calls per junction rather than one per interior grid point.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: The per-junction ground flatten produces the same visible result (verified against the existing e2e/unit coverage that exercises junction and roundabout terrain) while making a bounded number of `stamp()` calls per junction rather than one per interior grid point.

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
- Request: `req_005_review_findings_redundant_and_quadratic_rebuild_work`
- Primary task(s): `task_006_stamp_junction_ground_flatten_once_instead_of_per_grid_cell`

# Priority
- Priority: Medium
- Rationale: My own regression-in-efficiency from earlier this session (`aa8167e`); low risk to fix (same `stamp()` primitive, just called once instead of ~111 times) but scales with junction count as maps grow, so worth catching before it compounds with more content.

# Notes
- Hybrid rationale: Derived from request `req_005_review_findings_redundant_and_quadratic_rebuild_work` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_005_review_findings_redundant_and_quadratic_rebuild_work.md`.
- Generated locally by logics-manager.
- Task `task_006_stamp_junction_ground_flatten_once_instead_of_per_grid_cell` was finished via `logics-manager flow finish task` on 2026-08-29.

# Tasks
- `task_006_stamp_junction_ground_flatten_once_instead_of_per_grid_cell`
