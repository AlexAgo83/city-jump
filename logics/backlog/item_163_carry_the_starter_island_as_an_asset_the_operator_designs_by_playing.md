## item_163_carry_the_starter_island_as_an_asset_the_operator_designs_by_playing - Carry the starter island as an asset the operator designs by playing
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 21:23:23

# AI Context
- Summary: The kit was 300 m of street and three rectangles. It is now public/starter-kit.json -- 13 nodes, 16 segments, 1039 zoned lots -- read for its design only, so an export's session state cannot reach a fresh island.
- Keywords: starter-kit.json, loadCity path, design fields over emptyCity, Zones.snapTo, derived utilities, starterDistricts removed
- Use when: changing the island a run opens on, or bundling game content as an asset.
- Skip when: moving the utilities into the asset, a versioned export transform, and the Demo save's own asset.

# Problem
- The kit was 300 m of street, three district rectangles and six utilities at (210, -1350). A layout worth playing needs a roundabout, avenues, pedestrian paths and about a thousand lots zoned block by block, which is not worth expressing as coordinates.
- Zoning is keyed by lot, and a replay does not cut identical lots, so the design has to survive `Zones.snapTo` rather than assume it.
- An exported city carries its session: money, hour, elapsed time, rubble, building state and a wave clock, none of which belong to a fresh island.

# Scope
- In:
  - `public/starter-kit.json` as the layout, loaded through the same path a save takes.
  - Reading only the design fields over `emptyCity()`, so session state is ignored structurally rather than stripped.
  - Utilities derived from the kit's geometry, kept in code as a playability rule.
  - Removing `starterDistricts`, `layStarterDistricts`, its timer and `STARTER_KIT_AT`.
- Out:
  - Moving the utilities into the asset.
  - A versioned tool for transforming an export; the corrections this one needed were consequences of the elevation defect and will not recur.
  - The Demo save and its own bundled asset.

# Acceptance criteria
- A fresh island and a new island both open on the asset's layout, zoning and camera.
- An export's money, hour, rubble and elapsed time cannot reach a fresh island.
- The island opens with power and water over the roads the kit drew.
- The kit's roads sit flush on graded ground.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: A fresh island and a new island both open on the asset's layout, zoning and camera.
- request-AC4 -> This backlog slice. Proof: An export's money, hour, rubble and elapsed time cannot reach a fresh island.
- request-AC5 -> This backlog slice. Proof: The island opens with power and water over the roads the kit drew.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_035_an_island_that_hands_the_player_a_road_and_a_bridge_that_knows_when_it_has_landed`
- Architecture decision(s): (none yet)
- Request: `req_044_land_the_bridge_open_a_run_on_a_designed_island_and_stop_the_elevation_where_a_bridge_lands`
- Primary task(s): `task_046_record_the_bridge_landing_the_starter_island_and_the_elevation_rule`

# Priority
- Priority: High
- Rationale: The island a run opens on is the first thing a player sees, and it could not be authored at all before this.

# Tasks
- `task_046_record_the_bridge_landing_the_starter_island_and_the_elevation_rule`

# Notes
- Task `task_046_record_the_bridge_landing_the_starter_island_and_the_elevation_rule` was finished via `logics-manager flow finish task` on 2026-09-04.
