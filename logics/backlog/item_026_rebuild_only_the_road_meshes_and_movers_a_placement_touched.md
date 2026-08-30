## item_026_rebuild_only_the_road_meshes_and_movers_a_placement_touched - Rebuild only the road meshes and movers a placement touched
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:19:50

# AI Context
- Summary: `roadMesh.rebuild` disposes and recreates every road mesh and `traffic.rebuild` disposes the whole mover population, so placing the Nth segment redraws N segments.
- Keywords: rebuild, only, road, meshes, movers, placement, touched
- Use when: Making `roadMesh.rebuild` or `traffic.rebuild` incremental, keyed by segment id.
- Skip when: The work is the per-frame traffic loop (item_029) or changes road, junction or vehicle appearance.

# Problem
- `roadMesh.rebuild` disposes every road mesh and recreates the lot on each rebuild, so drawing the Nth segment redraws N segments.
- `traffic.rebuild` disposes every mover and re-instantiates the whole population for the same reason, discarding cars that were mid-journey on roads nothing touched.

# Scope
- In:
  - Keep per-segment meshes keyed by segment id and rebuild only the segments whose geometry changed, including the neighbours whose junction trims moved.
  - Do the same for traffic movers: preserve the movers on untouched segments rather than disposing the population wholesale.
  - Keep the full-rebuild path for loading a city and for terrain regeneration.
- Out:
  - Changing road or vehicle appearance, lane geometry, or traffic behaviour.
  - The per-frame traffic loop, which is its own item.

# Acceptance criteria
- AC1: Placing or removing a road rebuilds only the affected segments' meshes and movers, plus the neighbours whose junction geometry changed.
- AC2: Roads, junctions and traffic look and behave as they do today, confirmed by the browser interaction and visual checks.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Placing or removing a road rebuilds only the affected segments' meshes and movers, plus the neighbours whose junction geometry changed.
- request-AC7 -> This backlog slice. Proof: AC2: Roads, junctions and traffic look and behave as they do today, confirmed by the browser interaction and visual checks.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_005_a_city_builder_that_stays_responsive_as_the_city_grows`
- Architecture decision(s): (none yet)
- Request: `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`
- Primary task(s): `task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
