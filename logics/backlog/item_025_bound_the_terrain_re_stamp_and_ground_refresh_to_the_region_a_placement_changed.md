## item_025_bound_the_terrain_re_stamp_and_ground_refresh_to_the_region_a_placement_changed - Bound the terrain re-stamp and ground refresh to the region a placement changed
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 65%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:19:50

# AI Context
- Summary: `conformToRoads` resets and re-stamps the whole heightmap and `ground.refresh` re-walks and re-uploads all 456,976 vertices, whatever the placement actually changed.
- Keywords: bound, terrain, stamp, ground, refresh, region, placement, changed
- Use when: Adding a dirty-region path to `Heightmap.conformToRoads` or `createGround`'s refresh.
- Skip when: The work is about allocation inside the refresh (item_024), terrain resolution, or moving terrain work off the main thread.

# Problem
- `conformToRoads` resets the whole heightmap (`current.set(this.base)`, `claim.fill(Infinity)`) and re-samples every segment in the graph on every rebuild.
- `ground.refresh` re-walks all 456,976 vertices and re-uploads ~5.5 MB of positions and ~7.3 MB of colours, even when a single short road changed a few hundred cells.
- Together they make one placement cost O(city size), so a session's total cost grows quadratically with the number of placements.

# Scope
- In:
  - Track the region a rebuild actually invalidated (the placed or removed segments' bounds plus the embankment and junction reach) and restrict the heightmap re-stamp and the ground vertex/colour refresh to it.
  - Keep a whole-map path for the cases that genuinely need one: terrain regeneration, loading a city, and the initial build.
  - Confirm the conformed terrain is identical to what a full re-stamp produces for the same city, with a test that compares the two.
- Out:
  - Reducing the heightmap resolution or the ground mesh size.
  - A level-of-detail or chunked terrain system.
  - Moving terrain work off the main thread.

# Acceptance criteria
- AC1: Placing one road re-stamps and re-uploads only the affected region; a full-map path still exists and runs for terrain regeneration, city load and initial build.
- AC2: A test asserts the incrementally conformed heightmap matches a full `conformToRoads` for the same city, so the shortcut cannot silently diverge.
- AC3: The terrain is visually unchanged, confirmed by the visual shot check.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Placing one road re-stamps and re-uploads only the affected region; a full-map path still exists and runs for terrain regeneration, city load and initial build.
- request-AC6 -> This backlog slice. Proof: AC2: A test asserts the incrementally conformed heightmap matches a full `conformToRoads` for the same city, so the shortcut cannot silently diverge.
- request-AC7 -> This backlog slice. Proof: AC3: The terrain is visually unchanged, confirmed by the visual shot check.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_005_a_city_builder_that_stays_responsive_as_the_city_grows`
- Architecture decision(s): (none yet)
- Request: `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`
- Primary task(s): `task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
