## task_006_stamp_junction_ground_flatten_once_instead_of_per_grid_cell - Stamp junction ground flatten once instead of per grid cell
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-08-29 10:28:55

# AI Context
- Summary: The per-junction flatten loop (`src/sim/heightmap.ts:149-159`, added `aa8167e`) calls `stamp()` once per interior grid point (~111 calls/junction) instead of once at the junction's own radius, ~35-40x more work than needed for the same flatten-then-blend shape. Replace the loop with one `stamp(node.pos.x, node.pos.z, node.pos.y, radius, radius + EMBANKMENT)` call and verify against existing junction/roundabout terrain coverage.
- Keywords: heightmap, junction flatten, stamp, performance
- Use when: touching `Heightmap.conformToRoads`'s junction-flattening loop.
- Skip when: the double `conformToRoads` call (`task_005`) or the tree-placement scan (`task_007`) -- separate sibling slices.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_015_stamp_junction_ground_flatten_once_instead_of_per_grid_cell`

# Acceptance criteria
- AC2: The per-junction ground flatten produces the same visible result (verified against the existing e2e/unit coverage that exercises junction and roundabout terrain) while making a bounded number of `stamp()` calls per junction rather than one per interior grid point.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_006_stamp_junction_ground_flatten_once_instead_of_per_grid_cell.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_006_stamp_junction_ground_flatten_once_instead_of_per_grid_cell.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_005_review_findings_redundant_and_quadratic_rebuild_work`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
