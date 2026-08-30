## item_067_solve_the_junction_geometry_once_per_rebuild_instead_of_five_times - Solve the junction geometry once per rebuild instead of five times
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: `allJunctions(graph)` is called from `heightmap.ts`, `roadMesh.ts`, `streetlights.ts` and `signals.ts` -- four full solves per rebuild -- with a fifth in `traffic.ts`'s lazy cache. Nothing to do with dirty regions: solve it once in `app.ts` beside `buildableCells`/`buildingParcels`, which already got exactly this treatment one line away.
- Keywords: solve, junction, geometry, once, per, rebuild, instead, five, times
- Use when: Removing duplicated junction-geometry work, or changing who calls `allJunctions` during a rebuild.
- Skip when: The work caches junction geometry across rebuilds, changes `junctionGeometry` itself, or bounds a renderer to a region.

# Problem
- `allJunctions(graph)` walks every node and computes `junctionGeometry` for each. It is called from `src/sim/heightmap.ts`, `src/render/roadMesh.ts`, `src/render/streetlights.ts` and `src/render/signals.ts` -- four full solves per rebuild -- and `src/render/traffic.ts` keeps a fifth in its own lazy `junctionAt` cache.
- Every one of those solves the same thing from the same graph and throws it away. This has nothing to do with dirty regions: it is duplicated work that a full rebuild pays five times over.
- The codebase already knows the answer to this shape of problem. `src/app/app.ts` solves the parcel layout once and hands it to both the terrain and the buildings, with a comment saying why -- the junctions never got the same treatment.

# Scope
- In:
  - Solve the junction geometry once per rebuild in `src/app/app.ts`, alongside `buildableCells` and `buildingParcels`, and hand the same map to the heightmap, the road meshes, the streetlights and the signals.
  - Fold the traffic renderer's own `junctionAt` cache into the same answer, or record why it must stay separate -- it is populated lazily during the frame step rather than at rebuild time, which may be a real reason.
  - Keep `allJunctions` usable on its own for tests and for callers outside a rebuild; this is about who calls it, not about deleting it.
  - Confirm the shared map is not mutated by any consumer, since four of them now hold the same object.
  - Report the before-and-after placement cost from the previous slice's measurement.
- Out:
  - Caching junction geometry across rebuilds, which is a different and riskier claim.
  - Changing `junctionGeometry` itself, or what a junction is.
  - Bounding any renderer to a region.

# Acceptance criteria
- AC1: Junction geometry is solved once per rebuild and shared by every consumer that runs at rebuild time.
- AC2: No consumer mutates the shared map, verified rather than assumed.
- AC3: The traffic renderer either shares the same answer or the reason it cannot is recorded.
- AC4: The scene is unchanged and the measured placement cost is lower.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Junction geometry is solved once per rebuild and shared by every consumer that runs at rebuild time.
- request-AC6 -> This backlog slice. Proof: AC2: No consumer mutates the shared map, verified rather than assumed.
- request-AC7 -> This backlog slice. Proof: AC3: The traffic renderer either shares the same answer or the reason it cannot is recorded.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_017_an_edit_that_costs_what_it_changed_everywhere`
- Architecture decision(s): (none yet)
- Request: `req_020_four_renderers_still_rebuild_the_whole_world_on_every_edit`
- Primary task(s): `task_022_finish_bounding_the_renderers_that_still_rebuild_the_whole_world`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
