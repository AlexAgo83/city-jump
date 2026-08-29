## task_005_stop_computing_conformtoroads_twice_per_rebuild - Stop computing conformToRoads twice per rebuild
> From version: 0.1.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-08-29 10:35:13

# AI Context
- Summary: `rebuild()` (`src/app/app.ts:53-54`) calls `heightmap.conformToRoads()` twice; the first call's output is fully discarded by the second (`Heightmap.conformToRoads` resets `current`/`claim` from scratch each call), and `buildableCells`/`buildingParcels` never read the heightmap in between. Delete the redundant call.
- Keywords: conformToRoads, rebuild, redundant computation, heightmap
- Use when: touching `src/app/app.ts`'s `rebuild()` function or `Heightmap.conformToRoads`.
- Skip when: the per-junction flatten cost (`task_006`) or the tree-placement scan (`task_007`) -- separate sibling slices.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_014_stop_computing_conformtoroads_twice_per_rebuild`

# Acceptance criteria
- AC1: `rebuild()` computes the road/parcel-conformed heightmap exactly once per rebuild, not twice.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_005_stop_computing_conformtoroads_twice_per_rebuild.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_005_stop_computing_conformtoroads_twice_per_rebuild.md` after implementation.

# Validation
- (no validation recorded yet)
- command: `rg -n conformToRoads src/app/app.ts src/sim/heightmap.ts src/sim/heightmap.test.ts; npm run ci` | result: passed | date: 2026-08-29
- Finish workflow executed on 2026-08-29.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-29.
- Linked backlog item(s): `item_014_stop_computing_conformtoroads_twice_per_rebuild`
- Related request(s): `req_005_review_findings_redundant_and_quadratic_rebuild_work`

# Links
- Request: `req_005_review_findings_redundant_and_quadratic_rebuild_work`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in 185c007; src/app/app.ts rebuild now calls heightmap.conformToRoads(graph, parcels) exactly once. Verified with rg -n conformToRoads src/app/app.ts src/sim/heightmap.ts src/sim/heightmap.test.ts and npm run ci. Source: `185c007`
