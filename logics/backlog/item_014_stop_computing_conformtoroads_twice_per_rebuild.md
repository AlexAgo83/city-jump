## item_014_stop_computing_conformtoroads_twice_per_rebuild - Stop computing conformToRoads twice per rebuild
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-29 10:33:44

# AI Context
- Summary: `rebuild()` calls `heightmap.conformToRoads()` twice; the first call's output is fully discarded by the second, and nothing reads it in between.
- Keywords: conformToRoads, rebuild, redundant computation, heightmap
- Use when: touching `src/app/app.ts`'s `rebuild()` function or `Heightmap.conformToRoads`.
- Skip when: the per-junction flatten cost (`item_015`) or the tree-placement scan (`item_016`) -- separate slices of the same review.

# Problem
`rebuild()` should not compute the same expensive answer twice for no reason. `src/app/app.ts:53-54` calls `heightmap.conformToRoads(graph)` and then immediately `heightmap.conformToRoads(graph, parcels)`. `Heightmap.conformToRoads` (`src/sim/heightmap.ts:120-122`) starts by resetting `this.current` from `this.base` and `this.claim` to `Infinity`, then re-stamps every segment and junction from scratch -- the second call fully overwrites everything the first call produced, and nothing reads `heightmap` in between. `buildableCells`/`buildingParcels` (`src/sim/slots.ts`) do not read the heightmap at all, so there is no ordering reason for the first call either. The comment directly above these two lines (`src/app/app.ts:49-50`) calls this "the most expensive step in here" -- the code runs it twice anyway.

# Scope
- In:
  - Remove the redundant first `conformToRoads(graph)` call (or merge the two calls into one), so `rebuild()` conforms the heightmap to roads and parcels exactly once.
- Out:
  - The per-junction flatten loop's own cost (`item_015`) and the tree-placement scan (`item_016`) -- separate, independent fixes.

# Acceptance criteria
- AC1: `rebuild()` computes the road/parcel-conformed heightmap exactly once per rebuild, not twice.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `rebuild()` computes the road/parcel-conformed heightmap exactly once per rebuild, not twice.

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
- Request: `logics/request/req_005_review_findings_redundant_and_quadratic_rebuild_work.md`
- Primary task(s): (none yet)

# Priority
- Priority: Low
- Rationale: A one-line deletion with no behavior change and no risk; cheap to fix but not urgent since it only affects rebuild wall-clock time, not correctness.

# Notes
- Hybrid rationale: Derived from request `req_005_review_findings_redundant_and_quadratic_rebuild_work` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_005_review_findings_redundant_and_quadratic_rebuild_work.md`.
- Generated locally by logics-manager.

# Tasks
- `task_005_stop_computing_conformtoroads_twice_per_rebuild`
