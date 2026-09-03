## req_037_stop_paying_every_frame_for_a_city_that_is_not_changing - Stop paying every frame for a city that is not changing
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 70%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-03 15:41:31

# AI Context
- Summary: A settled city rebuilds every building instance buffer each frame, and a sun moving 0.0013 h per frame fans out to five renderers.
- Keywords: thin instance upload, change signature, sun fan-out, roundabout occupancy, stale mover segment, measured evidence
- Use when: touching the render loop, or the cost of drawing a city nobody is editing.
- Skip when: changing what the simulation computes, or splitting the render modules (req_039). Do not start before req_036 records a clean perf baseline.

# Needs
- A settled city costs nothing to redraw.
- A sun that has barely moved does not rebuild the sky, every tree shadow and every lamp.
- Traffic yielding does not scan every mover for every mover.

# Context
- The renderer already knows how to do this. src/render/buildings.ts:289 has decorKey, a cheap signature compared every tick precisely so a settled city is not rebuilt, and src/render/traffic.ts contains zero `new Vector3` because its hot path was deliberately made allocation-free. The gap is that the same discipline was not applied to the state upload or the sun.
- src/app/app.ts:1047 calls syncBuildings() then buildings.updateStates() on every drawn frame whenever simDt > 0. updateStates (src/render/buildings.ts:483) allocates two Float32Arrays per model across 16 models plus two for the distant boxes, calls Matrix.Compose per building, and re-uploads every thin-instance buffer -- to redraw buildings that did not move. It also does available.find(...) per status inside the distant loop at :503, which is O(parcels x models).
- syncBuildings (src/app/app.ts:293) additionally re-derives suppliedDiffusers over the whole graph every frame. That result only changes when the graph or the utilities change.
- advanceClock calls setClockHour unconditionally (src/app/app.ts:355) for a sun moving 0.08 h/s, which at 60 fps is 0.0013 h per frame. Each call fans out to five renderers: updateSkyColors re-lerps ~600 skybox vertices through getVerticesData and setVerticesData (src/render/scene.ts:328), trees.setSunHour does a Matrix.Compose and two Vector3 per tree then uploads a fresh Float32Array (src/render/trees.ts:288), streetlights allocates a one-element array per lamp (src/render/streetlights.ts:222), traffic touches every headlight (src/render/traffic.ts:637), and controls.setClock does about six DOM writes plus a setAttribute per time button (src/ui/controls.ts:309).
- A naive absolute-difference guard on the sun hour is wrong across midnight, where 23.99 to 0.01 is a real change that reads as a small one. Compare circularly or quantise the hour.
- stopFor (src/render/traffic.ts:1042) runs per non-walking mover per frame and calls roundaboutYieldBlocked, which does two movers.flatMap scans over all movers at :1063 and :1068 plus a pointAlong per candidate. arrive repeats the same two at :1133. crossingOccupiedByWalker scans all movers again at :1244. roundaboutRooms at :1456 already walks the movers once per frame, which is where the occupancy index belongs.
- src/render/traffic.ts:1061 and :1131 both compute `const radius = ringEntryRadius(...)` and never use it. An entry radius calculated and discarded at both of the places that decide whether to yield does not read like dead code; it reads like a guard that was dropped. Elucidate it before deleting it.
- Any claim that this work made the app faster has to be measured. req_036 item_110 provides the clean baseline and the dirty-tree guard; do not start here until that baseline exists.

# Acceptance criteria
- AC1: A city nobody is editing does not rebuild its building instance buffers.
- AC2: A rebuild or a newly loaded model still refreshes those buffers.
- AC3: The supplied-utility set is derived only when the graph or the utilities change.
- AC4: A sun that has barely moved does not fan out to the five renderers, including across midnight.
- AC5: Roundabout yielding and crossing occupancy are derived once per frame, not once per mover.
- AC6: A mover kept across a rebuild reads its resampled segment, not the pre-rebuild object.
- AC7: The discarded entry radius is either used or removed, with the reason recorded.
- AC8: A recorded measurement on a clean tree shows the change, against the baseline from req_036.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_028_a_city_that_costs_what_it_is_changing`
- Architecture decision(s): (none yet)

# References
- src/app/app.ts
- src/render/buildings.ts
- src/render/traffic.ts
- src/render/trees.ts
- src/render/scene.ts
- src/render/streetlights.ts
- src/render/signals.ts
- src/ui/controls.ts
- docs/performance.md

# Backlog
- `item_113_gate_the_building_state_upload_on_a_change_signature`
- `item_114_derive_the_supplied_utility_set_only_when_it_can_have_changed`
- `item_115_fan_the_sun_out_once_per_visible_step`
- `item_116_build_the_yield_and_crossing_occupancy_once_per_frame`
- `item_117_re_resolve_a_mover_s_segment_after_a_rebuild`
- `item_118_show_the_frame_cost_came_down`
- `item_133_make_the_performance_scenario_measure_a_city_with_buildings_in_it`
