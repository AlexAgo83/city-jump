## req_005_review_findings_redundant_and_quadratic_rebuild_work - Review findings: redundant and quadratic rebuild work
> From version: 0.1.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Code review of `rebuild()` and its downstream calls found one fully wasted computation (`conformToRoads` runs twice), one recent change that does the right thing at far more than the necessary cost (the per-junction ground-flatten loop added in `aa8167e`), and one quadratic tree-placement scan with no spatial index. None overlap the reliability findings already captured in `req_003`/`req_004`.
- Keywords: review, findings, rebuild performance, redundant computation, quadratic scan, heightmap, tree placement
- Use when: improving `rebuild()` cost, heightmap flattening cost, or tree-placement cost.
- Skip when: implementing the browser-gate/demo-strictness/traffic-lookup/README work already captured in `req_003_review_findings_project_reliability` and `req_004_harden_project_reliability_gates_and_demo_evidence`, or the road-crossing behavior in `req_001`.

# Needs
- `rebuild()` should not compute the same expensive answer twice for no reason. `src/app/app.ts:53-54` calls `heightmap.conformToRoads(graph)` and then immediately `heightmap.conformToRoads(graph, parcels)`. `Heightmap.conformToRoads` (`src/sim/heightmap.ts:120-122`) starts by resetting `this.current` from `this.base` and `this.claim` to `Infinity`, then re-stamps every segment and junction from scratch -- the second call fully overwrites everything the first call produced, and nothing reads `heightmap` in between. `buildableCells`/`buildingParcels` (`src/sim/slots.ts`) do not read the heightmap at all, so there is no ordering reason for the first call either. The comment directly above these two lines (`src/app/app.ts:49-50`) calls this "the most expensive step in here" -- the code runs it twice anyway.
- The per-junction ground-flatten loop should not cost far more than the flattened shape needs. `src/sim/heightmap.ts:149-159` (added in `aa8167e`, this session) stamps a junction's disc by looping over every grid point inside `radius` and calling `stamp()` once per point with `half = step` (`step = max(1, cell/2)`), each `stamp()` call re-scanning its own bounding box. One `stamp(node.pos.x, node.pos.z, node.pos.y, radius, radius + EMBANKMENT)` call produces the same flatten-then-blend shape (`stamp`'s own `distance <= half` / smoothstep logic, `src/sim/heightmap.ts:180-186`, composes correctly across overlapping calls via `this.claim`) at a fraction of the cost. With this repo's actual constants (`GROUND_CELL = 8` in `src/render/ground.ts:14` so `cell/2 = 4`; `EMBANKMENT = 10`; avenue width 14 in `src/sim/roadTypes.ts` giving `roundaboutRadius = 14 * 1.7 = 23.8`), the current loop runs roughly 111 `stamp()` calls per junction touching roughly 25 cells each, versus one call touching roughly 75 cells directly -- about 35-40x more work than necessary, on every `rebuild()`, for every junction on the map.
- Tree placement should not re-scan every road segment's full sample array for every candidate site. `nearRoad()` (`src/render/trees.ts:300-311`) loops `graph.allSegments()` and, for each, steps through `segment.samples` to test proximity. It is called once per candidate tree position from `plant()` (`src/render/trees.ts:190-197`), itself driven by two nested grid loops over the whole map plus every forest-patch cell (`src/render/trees.ts:199-222`) -- thousands of candidate sites on a map sized `GROUND_SIZE = 5400` at grid step 58. There is no spatial index (grid/quadtree) caching road proximity, so this is a real per-`rebuild()` cost distinct from the already-tracked `traffic.ts` per-car-per-frame `find()` in `req_003`/`req_004` (that one runs every frame at runtime; this one runs once per `rebuild()` at edit time, but scales the same way as the map grows).

# Context
- Review started from a clean worktree on `main`, at commit `1a981ef`, no uncommitted changes.
- Validation run during review: `npm run ci` passed -- unit tests, architecture tests, build/typecheck, and Logics lint/audit all green.
- This review deliberately does not repeat the findings already captured in `req_003_review_findings_project_reliability` / `req_004_harden_project_reliability_gates_and_demo_evidence` (CI missing browser checks, `DebugApi.road()` return value ignored, `traffic.ts` per-car-per-frame segment scan, README drift) or the road-crossing behavior in `req_001`.
- `conformToRoads` evidence: `src/app/app.ts:48-63` (the `rebuild()` function); `src/sim/heightmap.ts:120-122` (the reset at the top of `conformToRoads`); `src/sim/slots.ts` (`buildableCells`/`buildingParcels` take no heightmap argument).
- Junction-flatten evidence: `src/sim/heightmap.ts:149-159` (the loop) and `:165-188` (`stamp()`'s own bounding-box scan and claim/blend logic); `src/render/ground.ts:14` (`GROUND_CELL`); `src/sim/heightmap.ts:8` (`EMBANKMENT`); `src/sim/roadTypes.ts` (avenue width) and `src/sim/junction.ts` (`roundaboutRadius` multiplier).
- Tree-placement evidence: `src/render/trees.ts:190-197` (`plant()` calling `nearRoad()`), `:199-222` (the candidate-site loops), `:300-311` (`nearRoad()`'s per-segment scan).

# Acceptance criteria
- AC1: `rebuild()` computes the road/parcel-conformed heightmap exactly once per rebuild, not twice.
- AC2: The per-junction ground flatten produces the same visible result (verified against the existing e2e/unit coverage that exercises junction and roundabout terrain) while making a bounded number of `stamp()` calls per junction rather than one per interior grid point.
- AC3: Tree placement's road-proximity check does not re-scan every segment's sample array for every candidate site; the chosen approach (e.g. a spatial index, or a coarser precomputed occupancy grid) keeps `nearRoad`'s per-call cost independent of segment count as the map grows.
- AC4: This request does not duplicate or widen `req_001`, `req_003`, or `req_004`.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `src/app/app.ts`
- `src/sim/heightmap.ts`
- `src/sim/slots.ts`
- `src/render/ground.ts`
- `src/sim/roadTypes.ts`
- `src/sim/junction.ts`
- `src/render/trees.ts`
- `logics/request/req_001_split_roads_that_cross_each_other_not_only_those_drawn_onto.md`
- `logics/request/req_003_review_findings_project_reliability.md`
- `logics/request/req_004_harden_project_reliability_gates_and_demo_evidence.md`

# Backlog
- none
