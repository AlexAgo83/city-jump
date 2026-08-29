## item_016_avoid_the_quadratic_road_proximity_scan_in_tree_placement - Avoid the quadratic road-proximity scan in tree placement
> From version: 0.1.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-29 10:39:33

# AI Context
- Summary: `nearRoad()` re-scans every road segment's full sample array for every candidate tree site, with no spatial index; a real per-rebuild cost distinct from the already-tracked per-frame `traffic.ts` scan.
- Keywords: tree placement, nearRoad, quadratic scan, spatial index
- Use when: touching `src/render/trees.ts`'s candidate-site placement or road-proximity check.
- Skip when: the double `conformToRoads` call (`item_014`), the junction-flatten cost (`item_015`), or the `traffic.ts` per-car-per-frame scan (already tracked in `req_003`/`req_004`).

# Problem
Tree placement should not re-scan every road segment's full sample array for every candidate site. `nearRoad()` (`src/render/trees.ts:300-311`) loops `graph.allSegments()` and, for each, steps through `segment.samples` to test proximity. It is called once per candidate tree position from `plant()` (`src/render/trees.ts:190-197`), itself driven by two nested grid loops over the whole map plus every forest-patch cell (`src/render/trees.ts:199-222`) -- thousands of candidate sites on a map sized `GROUND_SIZE = 5400` at grid step 58. There is no spatial index (grid/quadtree) caching road proximity, so this is a real per-`rebuild()` cost distinct from the already-tracked `traffic.ts` per-car-per-frame `find()` in `req_003`/`req_004` (that one runs every frame at runtime; this one runs once per `rebuild()` at edit time, but scales the same way as the map grows).

# Scope
- In:
  - Make `nearRoad`'s per-call cost independent of segment count as the map grows (e.g. a coarse occupancy grid built once per rebuild, or a spatial index over segment samples).
- Out:
  - The double `conformToRoads` call (`item_014`), the junction-flatten cost (`item_015`), and the `traffic.ts` per-frame scan (already tracked in `req_003`/`req_004`, not to be duplicated here).

# Acceptance criteria
- AC3: Tree placement's road-proximity check does not re-scan every segment's sample array for every candidate site; the chosen approach (e.g. a spatial index, or a coarser precomputed occupancy grid) keeps `nearRoad`'s per-call cost independent of segment count as the map grows.
- AC4: This request does not duplicate or widen `req_001`, `req_003`, or `req_004`.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC3: Tree placement's road-proximity check does not re-scan every segment's sample array for every candidate site; the chosen approach (e.g. a spatial index, or a coarser precomputed occupancy grid) keeps `nearRoad`'s per-call cost independent of segment count as the map grows.
- request-AC4 -> This backlog slice. Proof: AC4: This request does not duplicate or widen `req_001`, `req_003`, or `req_004`.

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
- Primary task(s): `task_007_avoid_the_quadratic_road_proximity_scan_in_tree_placement`

# Priority
- Priority: Low
- Rationale: Real quadratic cost, but only bites as the map's road count grows well past what's been measured so far; a spatial index is more work than the other two slices for a cost not yet observed in practice.

# Notes
- Hybrid rationale: Derived from request `req_005_review_findings_redundant_and_quadratic_rebuild_work` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_005_review_findings_redundant_and_quadratic_rebuild_work.md`.
- Generated locally by logics-manager.
- Task `task_007_avoid_the_quadratic_road_proximity_scan_in_tree_placement` was finished via `logics-manager flow finish task` on 2026-08-29.

# Tasks
- `task_007_avoid_the_quadratic_road_proximity_scan_in_tree_placement`
