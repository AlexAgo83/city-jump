## req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work - Close the ten defects the review found in the dirty-region rebuild, zoning, and sharing work
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 14:54:20

# AI Context
- Summary: A review of the whole 068aceb..HEAD range found ten defects that the green suite cannot see. Two are player-visible: the road renderer disposes meshes by world AABB but recreates them by centreline samples, so roads vanish; and the zoning brush skips the move-throttle its tree-spray twin has, costing one full world rebuild per pointer event. Eight smaller ones follow: a disposed mesh left reachable, a traffic overlay contradicting its own radio, two wrong debug statistics, an unpruned map, an unasserted lane-order invariant, an unguarded `CompressionStream` call, and a centroid written three times.
- Keywords: close, ten, defects, review, found, dirty, region, rebuild, zoning, sharing, work
- Use when: Working on the dirty-region rebuild in `src/render/roadMesh.ts`, `src/render/traffic.ts`, `src/render/ground.ts` or `src/sim/heightmap.ts`; on the zoning brush in `src/render/drawTool.ts` and `src/render/zones.ts`; or on the debug statistics and overlay state in `src/app/app.ts`.
- Skip when: The work adds gameplay, new zone kinds or building assets; extends dirty-region rebuilds to trees, world grid, streetlights or signals; or reworks the share-link format, the camera modes or the street-naming scheme.

# Needs
- A code review of the whole development range 068aceb..HEAD -- the dirty-region rebuild, authored zoning, street names and addresses, camera target modes, and static share links -- found ten defects. The suite is green (155 unit tests, 4 architecture tests, a clean build and typecheck), so none of them is caught by anything that runs today.
- Two of them are player-visible and reachable in ordinary play. One makes a road disappear from the screen while it is still in the graph; the other turns a single drag of the zoning brush into one full world rebuild per pointer-move event.
- The rest are smaller: a dangling reference to a disposed mesh, a traffic overlay that switches itself off while the UI still says it is on, two debug statistics that report the wrong number, an unbounded map, an unenforced invariant with no assertion behind it, an unguarded async path that fails silently on older browsers, and a near-dead helper with its formula copied into three files.
- These were all introduced by work that has already been closed out, so no open Logics doc covers them. Left alone they become the baseline nobody questions.

# Context
- The dirty-region rebuild is the shared root of the two serious defects. `rebuild(dirty?: TerrainBounds)` in `src/app/app.ts` threads an optional bounding box into the heightmap, ground, road mesh and traffic renderers so an edit repaints a region instead of the world. Each renderer decides for itself which of its objects the region touches, and those decisions have to agree with each other -- where they do not, geometry is destroyed and not recreated.
- `TerrainBounds` is a plain XZ box: `{ minX, maxX, minZ, maxZ }`. Callers in `src/render/drawTool.ts` build one from the affected geometry and pad it by `TERRAIN_DIRTY_PAD` (140m) so the embankment around a road is covered. Passing no box at all means a full rebuild, which is always correct and always slow.
- The zone brush and the tree spray brush are the same interaction in the same file, written twice. The tree path (`onSprayMove`) waits until the brush has moved half its own width before doing any work; the zone path (`onZoneMove`) does not, even though it sets the same `lastSprayed` variable the tree path reads. The zone path is also far more expensive per event, because it triggers `onCommitted` and therefore a whole rebuild.
- Nothing in the current suite can see any of this: the unit tests do not construct a Babylon scene, and the browser interaction suite (`npm run test:e2e`) does not exercise a dirty rebuild against a road that is outside the dirty box, nor does it drag the zone brush. Any regression test for the first two findings belongs in that browser suite or in a new pure helper extracted out of the renderer.
- The findings are stated below with file and line references taken at commit 25d5121. Lines will drift; the mechanism described is what identifies each one.

# Acceptance criteria
- AC1: A dirty-region rebuild never leaves the scene missing geometry that a full rebuild would have drawn -- whatever a renderer disposes because the region touches it, it recreates.
- AC2: Dragging the zoning brush costs work proportional to the distance dragged, not to the number of pointer events the browser happens to deliver, and matches the throttling the tree spray already applies.
- AC3: No renderer holds a reference to a mesh it has disposed.
- AC4: The traffic overlay's state and the Select view control agree with each other at all times; neither can silently contradict the other.
- AC5: Every number reported by the debug statistics is the current value, including while building models are still arriving asynchronously.
- AC6: Long-running play does not grow a collection that is never pruned.
- AC7: The traffic lane-ordering invariant is asserted by a test rather than only described in a comment.
- AC8: A browser that lacks `CompressionStream` gets a refusal message from the share button instead of an unhandled rejection.
- AC9: The buildable-cell centroid is computed in one place, and dead branches around zone resolution are removed.
- AC10: `npm test`, `npm run test:architecture`, `npm run build` and `npm run logics:validate` all pass, and the two player-visible defects each have a check that fails without the fix.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_012_a_city_that_keeps_drawing_itself_correctly`
- Architecture decision(s): (none yet)

# References
- src/render/roadMesh.ts
- src/render/drawTool.ts
- src/render/zones.ts
- src/render/traffic.ts
- src/render/buildings.ts
- src/app/app.ts
- src/ui/controls.ts
- src/sim/slots.ts
- src/sim/heightmap.ts
- src/render/traffic.test.ts
- logics/roadmap/road_001_city_jump_playable_city.md

# Backlog
- `item_052_make_a_partial_rebuild_unable_to_lose_geometry`
- `item_053_make_the_zoning_brush_cost_what_the_tree_brush_costs`
- `item_054_stop_the_overlay_state_and_the_debug_statistics_from_lying`
- `item_055_prune_the_traffic_queues_assert_the_ordering_they_rely_on_and_clear_the_small_debris`
