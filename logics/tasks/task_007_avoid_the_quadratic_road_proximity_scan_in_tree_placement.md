## task_007_avoid_the_quadratic_road_proximity_scan_in_tree_placement - Avoid the quadratic road-proximity scan in tree placement
> From version: 0.1.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: `nearRoad()` (`src/render/trees.ts:300-311`) re-scans every road segment's sample array for every candidate tree site, with no spatial index. Give it a per-call cost independent of segment count (e.g. a coarse occupancy grid built once per rebuild, or a spatial index over segment samples). Distinct from the already-tracked `traffic.ts` per-frame scan in `req_003`/`req_004` -- do not duplicate that work here.
- Keywords: tree placement, nearRoad, quadratic scan, spatial index
- Use when: touching `src/render/trees.ts`'s candidate-site placement or road-proximity check.
- Skip when: the double `conformToRoads` call (`task_005`), the junction-flatten cost (`task_006`), or the `traffic.ts` per-car-per-frame scan (already tracked in `req_003`/`req_004`).

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_016_avoid_the_quadratic_road_proximity_scan_in_tree_placement`

# Acceptance criteria
- AC3: Tree placement's road-proximity check does not re-scan every segment's sample array for every candidate site; the chosen approach (e.g. a spatial index, or a coarser precomputed occupancy grid) keeps `nearRoad`'s per-call cost independent of segment count as the map grows.
- AC4: This request does not duplicate or widen `req_001`, `req_003`, or `req_004`.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_007_avoid_the_quadratic_road_proximity_scan_in_tree_placement.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_007_avoid_the_quadratic_road_proximity_scan_in_tree_placement.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_005_review_findings_redundant_and_quadratic_rebuild_work`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
