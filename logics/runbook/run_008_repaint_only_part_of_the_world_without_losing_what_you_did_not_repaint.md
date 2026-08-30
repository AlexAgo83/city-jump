## run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint - Repaint only part of the world without losing what you did not repaint
> Status: Active
> Category: other
> Verified: 2026-08-30 against `src/app/app.ts`, `src/sim/heightmap.ts`, `src/render/ground.ts`, `src/render/roadMesh.ts`, `src/render/traffic.ts` and `src/render/drawTool.ts`
> Related request: `req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work`
> Related backlog: `item_052_make_a_partial_rebuild_unable_to_lose_geometry`
> Related task: `task_017_close_the_ten_review_findings_from_the_dirty_region_rebuild_and_zoning_work`
> Reminder: Update status, category, verification, and linked refs when you edit this doc.

# Trigger
- Teaching a renderer to rebuild only part of itself, or extending the existing dirty-region rebuild to one that still rebuilds in full (trees, world grid, streetlights, signals).
- Adding a new caller of `rebuild(dirty?: TerrainBounds)` -- any new edit that changes the world.
- Something that used to be on screen is missing after an edit somewhere else, and comes back when the page is reloaded or a full rebuild is forced.
- Changing what `TerrainBounds` is, or the padding a caller applies to it.

# Prerequisites
- Read `adr_003_rebuild_terrain_roads_plots_and_buildings_as_derived_views` first. Everything on screen is derived from the graph and thrown away on rebuild; a dirty region does not change that contract, it only narrows how much of it is exercised at once.
- Know the shape being passed around: `TerrainBounds` is a plain XZ box, `{ minX, maxX, minZ, maxZ }`, in world metres. It carries no Y, no rotation and no notion of which renderer asked for it.
- Passing no box at all means a full rebuild. That is always correct and always slow, and it is the right answer whenever the affected area cannot be bounded cheaply -- `roads.setShowTraffic` takes it deliberately, because a view change touches every road.

# Procedure

1. **Bound the change at the caller, then pad it.** `src/render/drawTool.ts` builds the box from the geometry the edit actually touched -- `boundsOf(seg.samples)` for a road, the roundabout's radius for a junction, the brush circle for a zone -- and then grows it by `TERRAIN_DIRTY_PAD` (140 m). The pad is not slack: terrain grades out past the road it conforms to, and a box drawn tight to the centreline leaves a visible step where the embankment was cut off. A new caller that forgets the pad produces a seam, not a crash.

2. **Compute the box before the mutation, not after.** `finish` samples the curve it is about to commit and derives the box from that, because after `commitSegment` the thing it needs to measure may have been split into pieces. Bulldoze does the same: `boundsOf(target.segment.samples)` is read before `graph.removeSegment`, because afterwards the segment is gone.

3. **Dispose and recreate on the same predicate.** This is the rule the review found broken. If a renderer decides *what to throw away* by one test and *what to draw again* by another, the difference between them is geometry that is destroyed and never comes back. `roadMesh.rebuild` disposed by the rendered mesh's world AABB and recreated on whether a centreline sample fell inside the box; a long diagonal road whose bounding box clipped the region while its centreline did not was disposed and skipped. The suite was green throughout: the road was still in the graph, still counted, and simply not on screen. **Write one predicate, call it from both sides.**

4. **A centreline is not the thing you drew.** Whatever predicate you settle on, remember that a road renders wider than its samples -- carriageway, sidewalks, lane paint, junction aprons. A box that misses the centreline can still contain a great deal of that segment. Grow the segment's extent by the widest thing derived from it before testing, or test the drawn extent directly.

5. **Clip in index space where the data is a grid.** `Heightmap.conformToRoads` and `createGround`'s `refresh` both convert the world box to grid indices once (`gridBounds`, `groundGridBounds`) and intersect every per-stamp loop with it. Because both sides of every loop are clamped to the same indices, these two cannot suffer the failure in rung 3 -- the region *is* the iteration domain rather than a filter over one. Prefer this shape when the data allows it.

6. **Reset only what you will restamp.** `conformToRoads` restores `current` from `base` and refills `claim` with `Infinity` inside the region only. Cells outside keep their previously conformed height and their old priority, which is correct precisely because no stamp is allowed to reach them. Widen the reset and the stamps together or not at all.

7. **Normals and neighbours need one extra ring.** A vertex's height changes the normals of the vertices around it, so `ground.refresh` uploads normals over `expandGridBounds(bounds, n, 1)` -- one cell wider than the positions it wrote. Anything that reads its neighbours needs the same treatment.

8. **Objects that live across rebuilds must be released, not just dropped.** The traffic renderer keeps movers outside the dirty region alive rather than respawning them. Anything holding a reference to a mover -- the lane `queues`, `queueOf` -- has to be told, which is why disposal goes through `leaveQueue` and boarding goes through `joinQueue`. Dropping the object without unregistering it leaks it into a map that outlives it.

9. **Watch the per-event cost of the caller, not only the per-rebuild cost.** A cheap rebuild invoked on every `POINTERMOVE` is more expensive than a full rebuild invoked once. The tree spray throttles on distance travelled -- no work until the brush has moved half its own radius -- and the zone brush was copied from it without that guard. Any drag-driven caller needs the throttle.

# Verification
- **Prove the predicate, not the pixels.** Extract the dispose/recreate test into a pure function and unit-test it with plain bounds and plain points; `src/render/roadMesh.test.ts` already tests exported helpers from that module with no scene. The failing shape is a long diagonal segment with the box inside its bounding box and away from its centreline.
- **Compare against a full rebuild.** The correctness question is always "would a full rebuild have drawn this?". A partial rebuild that differs from a full one in anything but cost is a bug, and the cheapest manual check is to force one and see what reappears.
- **Measure, do not assume.** `installDebugApi` exposes `measureCosts()`, which resets, builds the demo city, times one road placement with a dirty box, and reports `startupMs`, `demoBuildMs` and `placementMs`. Record before and after.
- **Then `npm test`, `npm run test:e2e` and `npm run test:visual`.** None of them caught rung 3's bug, which is the reason this runbook exists -- a new dirty-region path should leave behind the check that would have.
- If something is missing from the screen and the counters disagree, `run_007_the_code_says_it_drew_it_and_the_screen_disagrees` is the ladder; a partial rebuild that disposed without recreating is now its first rung.

# Rollback
- Rendering and terrain only: no data leaves the graph or the save, so passing `undefined` instead of a box anywhere restores the previous full-rebuild behaviour immediately, at the old cost. That is the safe emergency fix for any suspected dirty-region defect -- take it first, diagnose second.

# References
- `src/app/app.ts` -- `rebuild(dirty?: TerrainBounds)`, the one place the box is threaded to every renderer.
- `src/sim/heightmap.ts` -- `TerrainBounds`, `gridBounds`, and the clipped `stamp` / `stampPolygon` / `stampParcel`.
- `src/render/ground.ts` -- `groundGridBounds`, `uploadRows`, and the one-ring normal expansion.
- `src/render/roadMesh.ts` -- `meshTouchesBounds` and `pointsTouchBounds`, the two predicates rung 3 is about.
- `src/render/traffic.ts` -- `segmentTouchesBounds`, and the queue bookkeeping that survives a partial rebuild.
- `src/render/drawTool.ts` -- `boundsOf`, `expandBounds`, `TERRAIN_DIRTY_PAD`, and the spray throttle rung 9 is about.
- `adr_003_rebuild_terrain_roads_plots_and_buildings_as_derived_views` -- why everything is derived in the first place.
- `run_007_the_code_says_it_drew_it_and_the_screen_disagrees` -- the diagnosis ladder when something is computed but not on screen.
