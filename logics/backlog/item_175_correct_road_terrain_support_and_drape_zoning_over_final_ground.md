## item_175_correct_road_terrain_support_and_drape_zoning_over_final_ground - Correct road terrain support and drape zoning over final ground
> From version: 0.5.1
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Terrain correctness
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 12:20:59

# AI Context
- Summary: Road and pad height claims do not protect the outside vertices of an 8 m terrain triangle; cached zone heights also predate final earthworks.
- Keywords: correct, road, terrain, support, drape, zoning, over, final, ground
- Use when: Terrain hides pavement or zone cells after construction or on slopes.
- Skip when: Investigating lighting, building models, or road connectivity.

# Problem
- Coarse terrain triangles cross paved footprints; cached zone corners predate final earthworks.

# Scope
- In:
  - Road bed support, terrain triangle projection for zones, regression tests and visual validation.
- Out:
  - New road types, release or push.

# Acceptance criteria
- AC1: Surface roads and sidewalks remain above rendered terrain on sloping, rotated streets with adjacent building terraces at the production 8 m grid spacing; bridges and covered tunnels retain their terrain rules.
- AC2: Zone overlays follow the final terrain triangles after construction, removal, hidden reveal and save reload without changing zoning semantics.
- AC3: Regression checks fail before the fix; CI, E2E and browser visual checks pass and the terrain runbook records the method.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Surface roads and sidewalks remain above rendered terrain on sloping, rotated streets with adjacent building terraces at the production 8 m grid spacing; bridges and covered tunnels retain their terrain rules.
- request-AC2 -> This backlog slice. Proof: AC2: Zone overlays follow the final terrain triangles after construction, removal, hidden reveal and save reload without changing zoning semantics.
- request-AC3 -> This backlog slice. Proof: AC3: Regression checks fail before the fix; CI, E2E and browser visual checks pass and the terrain runbook records the method.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_037_continuous_roads_and_legible_terrain_zoning`
- Architecture decision(s): (none yet)
- Request: `req_050_keep_roads_and_zone_overlays_clear_of_terrain`
- Primary task(s): `task_052_fix_terrain_crossing_roads_and_zones`

# Priority
- Priority: High
- Rationale: Visible terrain occlusion interrupts roads and hides the zoning information needed to build.

# Tasks
- `task_052_fix_terrain_crossing_roads_and_zones`

# Notes
- Task `task_052_fix_terrain_crossing_roads_and_zones` was finished via `logics-manager flow finish task` on 2026-09-07.
