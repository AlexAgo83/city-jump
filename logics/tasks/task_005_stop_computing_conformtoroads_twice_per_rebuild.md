## task_005_stop_computing_conformtoroads_twice_per_rebuild - Stop computing conformToRoads twice per rebuild
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
> Indicators reviewed: 2026-08-29 10:33:44

# AI Context
- Summary: `rebuild()` (`src/app/app.ts:53-54`) calls `heightmap.conformToRoads()` twice; the first call's output is fully discarded by the second (`Heightmap.conformToRoads` resets `current`/`claim` from scratch each call), and `buildableCells`/`buildingParcels` never read the heightmap in between. Delete the redundant call.
- Keywords: conformToRoads, rebuild, redundant computation, heightmap
- Use when: touching `src/app/app.ts`'s `rebuild()` function or `Heightmap.conformToRoads`.
- Skip when: the per-junction flatten cost (`task_006`) or the tree-placement scan (`task_007`) -- separate sibling slices.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_014_stop_computing_conformtoroads_twice_per_rebuild`

# Acceptance criteria
- AC1: `rebuild()` computes the road/parcel-conformed heightmap exactly once per rebuild, not twice.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_005_stop_computing_conformtoroads_twice_per_rebuild.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_005_stop_computing_conformtoroads_twice_per_rebuild.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_005_review_findings_redundant_and_quadratic_rebuild_work`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
