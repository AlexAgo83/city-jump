## req_050_keep_roads_and_zone_overlays_clear_of_terrain - Keep roads and zone overlays clear of terrain
> From version: 0.5.1
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Complexity: Medium
> Theme: Terrain correctness
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 12:20:58

# AI Context
- Summary: Road and pad height claims do not protect the outside vertices of an 8 m terrain triangle; cached zone heights also predate final earthworks.
- Keywords: roads, zone, overlays, clear, terrain
- Use when: Terrain hides pavement or zone cells after construction or on slopes.
- Skip when: Investigating lighting, building models, or road connectivity.

# Needs
- Fix terrain triangles covering roads, sidewalks and zoning overlays.

# Context
- User supplied day, night and zoning screenshots with large triangular occlusions.

# Acceptance criteria
- AC1: Surface roads and sidewalks remain above rendered terrain on sloping, rotated streets with adjacent building terraces at the production 8 m grid spacing; bridges and covered tunnels retain their terrain rules.
- AC2: Zone overlays follow the final terrain triangles after construction, removal, hidden reveal and save reload without changing zoning semantics.
- AC3: Regression checks fail before the fix; CI, E2E and browser visual checks pass and the terrain runbook records the method.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_037_continuous_roads_and_legible_terrain_zoning`
- Architecture decision(s): (none yet)

# References
- src/sim/heightmap.ts
- src/render/zones.ts
- src/app/app.ts

# Backlog
- `item_175_correct_road_terrain_support_and_drape_zoning_over_final_ground`
