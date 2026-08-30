## item_052_make_a_partial_rebuild_unable_to_lose_geometry - Make a partial rebuild unable to lose geometry
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 65%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 14:42:38

# AI Context
- Summary: `roadMesh.rebuild(dirty)` disposes meshes whose world AABB touches the dirty box but recreates only segments whose centreline samples fall inside it. A long diagonal road whose bounding box clips the region while its centreline does not is destroyed and never redrawn.
- Keywords: partial, rebuild, unable, lose, geometry
- Use when: Touching the dispose/recreate decisions in `src/render/roadMesh.ts`, or auditing the same predicate pairing in `src/render/traffic.ts`.
- Skip when: The work changes what `TerrainBounds` is, how callers build one, or extends dirty rebuilds to trees, world grid, streetlights or signals.

# Problem
- In `src/render/roadMesh.ts`, `rebuild(dirty)` decides what to throw away and what to draw again using two different tests, and the first is more generous than the second. Disposal (around line 136) calls `meshTouchesBounds`, which tests the rendered mesh's world axis-aligned bounding box against the dirty box. Recreation (around line 148) calls `pointsTouchBounds(seg.samples, dirty)`, which asks whether any point of the segment's centreline falls inside the dirty box.
- The AABB of a long diagonal segment is a large square that the centreline crosses only along one diagonal. A dirty box landing in an empty corner of that square intersects the AABB while containing no centreline sample. The segment's meshes are disposed and then skipped by the recreation loop, so the road vanishes from the screen while remaining in the graph, until something forces a full rebuild.
- The same asymmetry applies to junctions: disposal is by mesh bounds, recreation is gated on `junctionTouchesBounds`, which tests the junction ring and arm corners.
- `src/render/traffic.ts` uses `segmentTouchesBounds` -- also centreline samples -- to decide which movers to dispose and which segments to repopulate. Both sides of that decision use the same predicate, so traffic is self-consistent; it is worth confirming rather than assuming while the road mesh is being fixed.
- A road that is wide, or carries sidewalks and lane paint, also renders beyond its centreline, so even a short segment can have geometry inside a dirty box its samples never enter.

# Scope
- In:
  - Make disposal and recreation in `roadMesh.rebuild` use one predicate, evaluated per segment and per junction, so anything removed is necessarily redrawn. Deriving the segment's own extent -- its sample bounds grown by the widest thing drawn from it -- and testing that against the dirty box satisfies both sides.
  - Apply the same treatment to the junction loops, which currently gate on ring and arm-corner points.
  - Extract whatever predicate the fix settles on into a pure function that takes plain bounds and plain points, so it can be unit-tested in `src/render/roadMesh.test.ts` without a Babylon scene -- that file already tests exported helpers from this module.
  - Unit tests for the failing shape: a long diagonal segment, and a dirty box positioned inside its bounding box but away from its centreline. Assert the predicate answers the same way for the dispose decision and the recreate decision.
  - Confirm `src/render/traffic.ts` has no equivalent gap, and note the finding either way.
  - A browser-level check in `scripts/interact.mjs` if one can be written cheaply: draw a long diagonal road, make an edit near a corner of its bounding box but far from the road, and assert the road is still rendered.
- Out:
  - Changing what `TerrainBounds` is or how callers build one.
  - Extending dirty-region rebuilds to trees, world grid, streetlights or signals.
  - Any change to the heightmap or ground clipping, which are index-space and already symmetric.

# Acceptance criteria
- AC1: Disposal and recreation in the road renderer are driven by a single predicate, and a test proves the two decisions cannot disagree for a long diagonal segment.
- AC2: A dirty rebuild whose box overlaps a segment's bounding box but not the segment leaves that segment drawn.
- AC3: The predicate is a pure function unit-tested with no scene.
- AC4: The traffic renderer's equivalent decision is confirmed symmetric, and the confirmation is recorded.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Disposal and recreation in the road renderer are driven by a single predicate, and a test proves the two decisions cannot disagree for a long diagonal segment.
- request-AC10 -> This backlog slice. Proof: AC2: A dirty rebuild whose box overlaps a segment's bounding box but not the segment leaves that segment drawn.

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
