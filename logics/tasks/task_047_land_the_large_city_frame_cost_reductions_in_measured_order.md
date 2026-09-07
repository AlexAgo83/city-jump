## task_047_land_the_large_city_frame_cost_reductions_in_measured_order - Land the large city frame cost reductions in measured order
> From version: 0.5.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: claude
> Indicators reviewed: 2026-09-07 09:49:39

# AI Context
- Summary: Land the six per-frame cost reductions from req_047 in measured impact order, each validated on the large-demo-v14 fixture.
- Keywords: land, large, city, frame, cost, reductions, measured, order
- Use when: picking up or sequencing any of the large-city frame cost slices.
- Skip when: repairing the measurement scripts, which is task_048.

# Context
- Deliver the six per frame cost slices in impact order, each validated against the large-demo-v14 fixture with scripts repaired by req_045.

# Plan
- [x] 1. Confirm task_048 has landed: no FPS or ablation number produced before it may be used to accept a slice here (req_047 AC7).
- [x] 2. item_166 bound terrain picking. Largest measured regression, 42-46 FPS while drawing versus 75 stationary. Verify slopes, road cuts and misses keep their current hit positions.
- [x] 3. item_167 short-circuit empty rubble maps. One guard in src/sim/rubble.ts; re-run the paired fresh-load comparison that measured 9.6-14.2%.
- [x] 4. item_168 cache workforce allocations. Keep the three staffing policies distinct; population hysteresis, incumbent staffing, construction and wave semantics stay covered.
- [x] 5. item_169 defer hidden overlay geometry. Confirm stale geometry cannot reappear when an overlay is revealed after edits made while hidden.
- [x] 6. item_170 update HUD nodes only on change. Keep construction and selection feedback responsive.
- [x] 7. item_171 skip empty explosion buffer writes, still clearing the last expired explosion once.
- [x] 8. Record each slice's before/after as repeated paired measurements on large-demo-v14 with workload, simulation rate, renderer backend and camera state.
- [x] 9. Apply ADR 009 checkpoints: update affected Logics docs during each meaningful wave and leave the repo commit-ready.

# Backlog
- `item_166_bound_terrain_picking_in_the_drawing_tools`
- `item_167_short_circuit_empty_rubble_maps`
- `item_168_stop_repeating_equivalent_workforce_sorts`
- `item_169_defer_hidden_overlay_geometry_until_reveal`
- `item_170_update_hud_nodes_only_when_displayed_values_change`
- `item_171_skip_replacing_empty_explosion_buffers`

# Definition of Done (DoD)
- [x] Generated backlog slices are linked and ready for implementation.
- [x] Slice ownership and next action are clear.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009 without automatic commits or one commit per micro-step.

# AC Traceability
- request-AC2 -> This task. Proof: orchestration task coordinates the AC-aware split.
- request-AC6 -> This task. Proof: generated task keeps split work explicit and bounded.
- request-AC7 -> This task. Proof: generated task is covered by split request tests.
- request-AC1 -> This task. Proof: Six slices landed in b64dca7, a674549, fc90a0b, 69588e5, 03000fc/b44f87e, 5cb9d0c; validated with npm run ci, npm run test:e2e, and paired running measurements on large-demo-v14 (83 -> 102-106 fps; road preview 42.5 -> 87.2, zone pointer 44.4 -> 94.9, bulldoze pointer 69.2 -> 97.1, x4 speed 72.8 -> 93.2). Source: `5cb9d0c`
- request-AC3 -> This task. Proof: Six slices landed in b64dca7, a674549, fc90a0b, 69588e5, 03000fc/b44f87e, 5cb9d0c; validated with npm run ci, npm run test:e2e, and paired running measurements on large-demo-v14 (83 -> 102-106 fps; road preview 42.5 -> 87.2, zone pointer 44.4 -> 94.9, bulldoze pointer 69.2 -> 97.1, x4 speed 72.8 -> 93.2). Source: `5cb9d0c`
- request-AC4 -> This task. Proof: Six slices landed in b64dca7, a674549, fc90a0b, 69588e5, 03000fc/b44f87e, 5cb9d0c; validated with npm run ci, npm run test:e2e, and paired running measurements on large-demo-v14 (83 -> 102-106 fps; road preview 42.5 -> 87.2, zone pointer 44.4 -> 94.9, bulldoze pointer 69.2 -> 97.1, x4 speed 72.8 -> 93.2). Source: `5cb9d0c`
- request-AC5 -> This task. Proof: Six slices landed in b64dca7, a674549, fc90a0b, 69588e5, 03000fc/b44f87e, 5cb9d0c; validated with npm run ci, npm run test:e2e, and paired running measurements on large-demo-v14 (83 -> 102-106 fps; road preview 42.5 -> 87.2, zone pointer 44.4 -> 94.9, bulldoze pointer 69.2 -> 97.1, x4 speed 72.8 -> 93.2). Source: `5cb9d0c`

# Validation
- (no validation recorded yet)
- command: `npm run ci && npm run test:e2e` | result: passed | date: 2026-09-07
- Finish workflow executed on 2026-09-07.
- Linked backlog/request close verification passed.

# Report
- Gate: task_048 landed first (req_045), so every number below comes from scripts that measure a
- Finished on 2026-09-07.
- Linked backlog item(s): `item_166_bound_terrain_picking_in_the_drawing_tools`, `item_167_short_circuit_empty_rubble_maps`, `item_168_stop_repeating_equivalent_workforce_sorts`, `item_169_defer_hidden_overlay_geometry_until_reveal`, `item_170_update_hud_nodes_only_when_displayed_values_change`, `item_171_skip_replacing_empty_explosion_buffers`
- Related request(s): `req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits`
  running city over the whole requested interval against an adjacent baseline. The earlier
  "42-46 vs 75 FPS" figures were taken paused, and are not comparable with these.
- item_166 bounded terrain picking, `b64dca7`: `scene.pick` against the 911,250-triangle ground
  mesh replaced by a grid walk over the heightmap (`src/render/terrainPick.ts`), testing the same
  two triangles per cell the mesh is built from. `src/render/terrainPick.test.ts` pins it against a
  full triangle scan on four ray angles, on a road cut, on misses and on the bounded cap. Road
  preview 42.5 -> 87.2 fps, zone pointer 44.4 -> 94.9, bulldoze pointer 69.2 -> 97.1.
- item_167 empty rubble short circuit, `a674549`: one size check ahead of the per-cell walk, with a
  test that throws if an empty map touches a parcel's cells.
- item_168 workforce allocations, `fc90a0b`: the needs panel and the batteries share one
  allocation, an identical call returns its previous answer, and priority and incumbency are
  settled before the sort rather than inside its comparator. The three staffing policies, the
  population hysteresis and incumbent staffing are untouched; scenario outcomes are identical
  (31 waves fought, 31 held, before and after).
- item_169 hidden overlays, `69588e5`: a hidden zone or utility overlay records what the rebuild
  asked for and builds on reveal, from the latest edit. `src/render/overlayReveal.test.ts` covers
  edits made while hidden, so stale geometry cannot reappear. Placement rebuild 41.6 -> 26.5 ms,
  zones 3.8 -> 0, utilities 8.4 -> 0.1.
- item_170 HUD nodes, `03000fc` and `b44f87e`: the needs rows are built once and written to only
  when a displayed value moves; the ledger is not computed while collapsed, and is filled on the
  way open rather than a frame later -- the interaction suite caught that gap before it shipped.
- item_171 explosion buffer, `5cb9d0c`: an already-empty buffer is not replaced, and the frame that
  expires the last explosion still clears it exactly once.
- Paired end state on `large-demo-v14`, running, simulation rate 1, software rasteriser, camera
  state recorded per framing: 83 / 84 / 83 fps before, 102 / 104 / 105 and 103 / 104 / 106 across
  two repeats after. Headed GPU probes: speed x1 77.8 -> 100.5, x4 72.8 -> 93.2.
- Left deliberately: the click-time `scene.pick` in `drawTool.selectMesh` still costs 19-21 ms per
  pick on `zone-paint` and `bulldoze-clicks`. Out of this request's scope, captured as
  `req_048_bound_the_click_time_mesh_pick_that_selection_still_runs`.

# Links
- Request: `req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
