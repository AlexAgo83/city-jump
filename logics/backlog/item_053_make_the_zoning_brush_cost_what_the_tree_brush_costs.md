## item_053_make_the_zoning_brush_cost_what_the_tree_brush_costs - Make the zoning brush cost what the tree brush costs
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 14:42:38

# AI Context
- Summary: `onZoneMove` writes `lastSprayed` but never reads it, so unlike its tree-spray twin it runs a full world rebuild on every pointer-move event of a drag. Also nulls the disposed overlay mesh in `src/render/zones.ts`.
- Keywords: zoning, brush, cost, tree, costs
- Use when: Working on the zoning brush in `src/render/drawTool.ts`, the zone overlay in `src/render/zones.ts`, or the paint callback in `src/app/app.ts`.
- Skip when: The work changes the zone data model, the save format, the zone cell size, or the tree spray.

# Problem
- `onZoneMove` in `src/render/drawTool.ts` (around lines 334-341) runs on every `POINTERMOVE` while the button is held. Each call paints the zone and then calls `onCommitted(...)`, which in `src/app/app.ts` recomputes `buildableCells`, re-solves `buildingParcels`, reconforms the heightmap, refreshes the ground, and rebuilds trees, world grid, roads, streetlights, signals, the zone overlay and every building thin-instance buffer.
- The neighbouring `onSprayMove`, which the zone path was copied from, guards exactly this: it returns early unless the brush has moved at least half its own radius since the last burst. `onZoneMove` assigns `lastSprayed` but never reads it, so the guard is present in effect and absent in fact.
- The paint callback in `src/app/app.ts` compounds it: it scans every entry of `currentBuildableCells` and calls `zones.paint` once per cell inside the brush, so the per-event cost also scales with the size of the city.
- In `src/render/zones.ts`, `rebuild` disposes and rebuilds the entire overlay mesh from `zones.toJSON()` each time, so the overlay is rebuilt from scratch on every one of those events too.
- Separately, that same function disposes the mesh and then returns early at line 38 when there is nothing to draw, without clearing the `mesh` variable. Clearing every zone therefore leaves a disposed mesh reachable, and a later `setVisible` calls `setEnabled` on it.

# Scope
- In:
  - Throttle `onZoneMove` the way `onSprayMove` is throttled: no work until the brush has travelled a meaningful fraction of its own radius since the last paint, reading the `lastSprayed` value it already writes.
  - Set `mesh = null` after disposing it in `src/render/zones.ts`, on every path including the early return.
  - Look at the paint callback in `src/app/app.ts`: painting a circular brush should not require a linear scan of every buildable cell in the city. `Zones.paint` already walks its own grid over the brush radius, so the cell scan may be removable outright -- confirm what it contributes before changing it.
  - Measure before and after with the existing `measureCosts` debug hook, and record the numbers in the closeout.
  - A check that fails without the throttle: either a pure helper for the move-throttle decision unit-tested in `src/render/drawTool.test.ts`, or a browser-level count of rebuilds during a simulated drag.
- Out:
  - Incremental updates to the zone overlay mesh -- rebuilding it whole is fine once it happens per brush step rather than per pointer event.
  - Changing the zone data model, the save format, or the zone cell size.
  - Changing the tree spray.

# Acceptance criteria
- AC1: A drag of the zoning brush triggers rebuilds proportional to distance travelled, matching the tree spray's rule, proven by a check that fails without the fix.
- AC2: No code path in `src/render/zones.ts` leaves `mesh` pointing at a disposed mesh.
- AC3: Before-and-after cost numbers from `measureCosts` are recorded at closeout.
- AC4: Painting and clearing zones still behaves exactly as it does today from the player's side.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: A drag of the zoning brush triggers rebuilds proportional to distance travelled, matching the tree spray's rule, proven by a check that fails without the fix.
- request-AC3 -> This backlog slice. Proof: AC2: No code path in `src/render/zones.ts` leaves `mesh` pointing at a disposed mesh.
- request-AC10 -> This backlog slice. Proof: AC3: Before-and-after cost numbers from `measureCosts` are recorded at closeout.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_012_a_city_that_keeps_drawing_itself_correctly`
- Architecture decision(s): (none yet)
- Request: `req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work`
- Primary task(s): `task_017_close_the_ten_review_findings_from_the_dirty_region_rebuild_and_zoning_work`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
