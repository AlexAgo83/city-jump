## req_044_land_the_bridge_open_a_run_on_a_designed_island_and_stop_the_elevation_where_a_bridge_lands - Land the bridge, open a run on a designed island, and stop the elevation where a bridge lands
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 21:23:23

# AI Context
- Summary: Recorded after delivery: the offshore bridge's deck now lands on the ground and joins whatever reaches it, a run opens on a layout the operator designed by playing and dropped in as an asset, and a bridge stops being a bridge where it comes down.
- Keywords: bridge landfall, addNodeAt no dedupe, starter kit asset, design fields only, elevation cascade, touchesElevated aloft, ELEVATED_CLEARANCE, shared preview rule
- Use when: changing the offshore bridge, the island a run opens on, or how drawing decides a road is elevated.
- Skip when: replay of a save that records an elevated segment, the kaiju's landing edges and camera which req_042 and req_043 carry, and moving the utilities into the asset.

# Needs
- The road off the bridge arrives on the ground, and the bridge is joined to what reaches it.
- A run opens on an island worth playing, designed by playing rather than written as coordinates.
- A bridge stops being a bridge where it comes down.

# Context
- Recorded after delivery, in the same session as the work: three product changes shipped in `23fbb1a` and `1b895d8`, and none of them had a record. Two are behaviour the player sees; the third changes what road drawing asserts and overrides a boundary that was previously left open, which is why this exists rather than living only at the declarations.
- The offshore bridge's landward node was lifted fourteen metres to clear the water, so the deck stopped in mid air over solid land. Measured: the node sat at 66.44 m with the ground at 52.44 m. `conformToRoads` skips an elevated segment (src/sim/heightmap.ts:168), so no ground was ever graded up to meet it.
- It was worse for the player than for the picture. `buildSamples` forces `heights[0]` to the start node while every interior sample follows the terrain, so a road drawn off that node began with a fourteen-metre step rather than a slope. `validateSegment` could not refuse it: the gradient guard samples the terrain along the curve and never compares the start node against the ground beneath it.
- Dropping the lift does not cost the span. `buildSamples` holds an elevated segment's interior samples at `heightAt + ELEVATED_CLEARANCE`, so the deck still rises over the sea -- measured at 62.9 m -- and `isElevatedBridge` still gives it piers, pylons and cables. Verified against the assertion scripts/interact.mjs makes: 6 pylons, 6 piers, bend 381, length 3199. The pier and pylon counts are fixed by construction anyway (three positions along the deck, two sides), so the deck's height cannot move them.
- Joining the bridge to anything needed a second fix. `graph.addNodeAt` never dedupes by position, so `addOffshoreBridge` building its landward node unconditionally put it on top of whatever road already reached the landfall without touching it. Measured on a city drawn from there: two nodes at the same metre, and two networks of 13 and 2 nodes -- a joint that looked joined and carried no traffic. It now reuses a node within `RULES.nodeSnapRadius`, giving one network of 14 with two arms at the landfall.
- The starter kit was one street 300 m long, three district rectangles and six utilities, at (210, -1350) -- 2,906 m from the landfall, deliberately far from it so the kaiju, which lands on the edge furthest from the bridge, arrived near the city. A layout worth playing wants a roundabout, avenues, pedestrian paths and a thousand lots zoned block by block, and none of that is worth writing as coordinates.
- So the island is data. `public/starter-kit.json` carries 13 nodes, 16 segments, 1,039 zoned lots and the camera it was framed with; the operator designs it by playing, exports the city and replaces the file. It goes down the path a save goes down, so `loadCity` restores it, re-lays the zoning onto the lots the replay actually cut, joins the bridge and frames the camera.
- Only the design is read, over `emptyCity()`. That is what makes an export safe to drop in: the file this one came from carried $78,440.50, 36 rubble entries, an hour of 12.83 and 29 seconds of elapsed time, and none of it reached the island -- a fresh run opens at $100,000 and 11:00 because those fields are never looked at, not because anyone cleaned them.
- The export needed three corrections a future one will not. 272 of its 1,311 zones were orphans -- the fresh island's own starter districts, whose road had been bulldozed, keyed to lots that no longer exist. All sixteen of its segments were elevated, for the reason below. And its node heights carried the +2 m the elevated era gave them, which as surface roads would have been forced endpoints stepping over the ground: reseating them on the terrain took the worst road-to-ground gap from 3.25 m to 0.77 m.
- Utilities stayed in code rather than moving into the asset, because they are a rule about playability and not part of a layout: a building without power does not work, a city where nothing works grows no food, and the run should not open on a lesson it fails. They are derived from the kit's own geometry -- a producer at the centroid of the zoning, diffusers pushed at least 168 m apart along segment midpoints -- so a redesigned layout is still served without anyone editing coordinates. Ten placed.
- `starterDistricts`, `layStarterDistricts`, its timer, the `lotsInRect` import and `STARTER_KIT_AT` are all gone with it.
- The elevation cascade is the finding that came out of designing that island, and it was a defect in road drawing rather than in the export. `commitSegment` set `elevated` from `touchesElevated`, which was true whenever any segment at the snapped node was elevated. Drawing from the bridge's landfall therefore made the first road a bridge; its far node then carried an elevated arm, so the next road was a bridge too, and so on. Measured on the operator's city: all sixteen roads elevated, with nodes 11, 15, 19 and 21 sitting at +2.00, +1.99, +2.00 and +2.96 m -- the signature of `ELEVATED_CLEARANCE`.
- Nothing announced it. An elevated segment is skipped by `conformToRoads`, so the town floated over ground that was never cut for it, and skipped by the crossing split in `commitSegment`, so roads laid across each other would never have met in a junction. The town read as normal because at two metres over gently rolling ground it looks like a road.
- So the question the rule asks changed from "does an elevated road end here" to "is this point still in the air": `snap.position.y - graph.heightAt(...) <= ELEVATED_CLEARANCE` means landed, and what leaves a landed deck is a road. Grazing the ground counts as landed -- at the clearance itself there is nothing left to pass under.
- This does not reopen `adr_006`-style conditional behaviour by accident: extending a bridge that is genuinely aloft still yields a bridge, and the test that says so (src/sim/rules.test.ts, nodes at y=50 over flat terrain) still passes. Two new tests fail without the rule, checked by removing it.
- `touchesElevated` existed verbatim in both src/sim/rules.ts and src/app/drawController.ts -- one deciding the commit, the other colouring the preview. Two copies that had to agree or the preview lied about what the road would become. There is one now, exported from the rules and imported by the controller.
- Out of scope and worth saying: the rule changes drawing, not replay. A file that records `elevated` is honoured as written, which is why this export still needed its flag cleared and why a re-export taken after the fix will not.

# Acceptance criteria
- The deck lands at ground height, the span still reads as a cable bridge, and a road drawn off the landfall starts on the ground.
- The bridge and whatever reaches the landfall are one network, with no two nodes at the same position.
- A run opens on the operator's layout, carried as an asset the operator can replace by playing and exporting.
- An export dropped in as the kit cannot carry its session's money, hour, rubble or elapsed time into a fresh island.
- The island opens with power and water over the roads the kit drew, without coordinates written by hand.
- A road drawn from a landed deck is a surface road, and drawing on from it does not cascade.
- Extending a bridge that is still aloft still produces a bridge.
- One implementation decides whether a road inherits the elevation, shared by the commit and the preview.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_035_an_island_that_hands_the_player_a_road_and_a_bridge_that_knows_when_it_has_landed`
- Architecture decision(s): `adr_008_decide_elevation_by_height_above_ground_not_by_what_a_node_touches`

# References
- src/app/app.ts
- src/sim/rules.ts
- src/sim/graph.ts
- src/sim/rules.test.ts
- src/app/drawController.ts
- src/sim/heightmap.ts
- public/starter-kit.json
- scripts/interact.mjs

# Backlog
- `item_162_land_the_deck_on_the_ground_and_join_what_reaches_it`
- `item_163_carry_the_starter_island_as_an_asset_the_operator_designs_by_playing`
- `item_164_stop_the_elevation_where_a_bridge_lands`
