## req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits - Cut the per frame cost the large city review measured in gameplay and edits
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 85%
> Confidence: 80%
> Complexity: High
> Theme: Performance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Terrain picking, empty rubble scans, repeated workforce sorts, hidden overlay geometry and per-frame HUD rebuilds cost measurable frame time in a 1,287-building city.
- Keywords: performance, picking, rubble, workforce, overlays, hud, frame cost
- Use when: reducing frame cost or edit latency in large cities.
- Skip when: changing the measurement scripts themselves, or game balance.

# Needs
- Bound terrain picking work in interactive drawing tools.
- Short-circuit empty rubble maps instead of traversing parcel cells every gameplay frame.
- Stop repeating equivalent workforce allocation sorts when their inputs have not changed.
- Defer hidden overlay geometry until it is revealed, while preserving correct refresh.
- Stop replacing unchanged HUD subtrees on each rendered frame.
- Skip replacing explosion instance buffers when the explosion set is empty and unchanged.

# Priority
- High: finding 1 is the largest measured interactive regression, and the review already
  demonstrated a paired 9.6-14.2% FPS improvement for finding 2. The rest are ranked below
  those two.

# Context
- Split out of req_045, which now covers only the validity of the measurement tooling. This request carries the gameplay findings; the autosave correctness defect moved to req_046.
- Reviewed commit: `5a5cbd2`, version 0.5.0, on 2026-09-05. Application sources were unchanged by the review; the only runtime code experiment was the temporary empty-rubble guard.
- req_008, req_020 and req_037 already covered previous rebuild and render-loop optimizations. This request does not reopen their completed changes. Dirty ground updates now use bounded normals and row uploads.
- Depends on req_045: the ablation and FPS scripts currently mismeasure, so no number produced by them may be used to accept work here until that request lands. The evidence below came from separate probes, not from those scripts.

## Findings

1. **P1 - Drawing tools scan the full terrain on every pointer move.** `src/render/drawTool.ts:400` calls `scene.pick` against the ground, reached from road, zone, nature and bulldoze movement via the observer at line 639. `src/render/ground.ts:30` creates one terrain mesh; runtime inspection confirmed one submesh with 911,250 triangles, and the dependency's nearest-triangle picker walks all its indices. Road/zone movement measured 42/46 FPS versus 75 FPS for stationary or selection-mode movement, at 18-19 ms per pick. Two fresh-load road-preview confirmations measured 43 FPS and 17.7/17.5 ms per pick. Use bounded terrain intersection work in the shared path. Merely disabling accurate picking or substituting an infinite plane would change behaviour on slopes and road cuts.

2. **P2 - Empty rubble checks consume measurable frame time.** `src/app/app.ts:358` calls `Rubble.blocks` for every non-rebuilding parcel each gameplay frame. `src/sim/rubble.ts:26` walks every parcel cell and builds coordinate keys even when its own map is empty. On the reference city the CPU trace attributes about 0.73 s of an 8.70 s sample to this path. An in-browser-only empty-map guard was tested over three alternating fresh-load pairs: median 78.1 to 88.4 FPS, paired improvements 9.6-14.2%. Fix the shared method once, preserving the nonempty-map path.

3. **P2 - Workforce is sorted three times per gameplay frame.** `src/sim/buildingLifecycle.ts:77` derives staffing even within the existing population band. `src/sim/buildingKinds.ts:52` allocates again, and its `batteriesForParcels` call allocates a third time. `src/sim/workforce.ts:47` sorts jobs on every invocation. Instrumentation on the reference city counted 2,939 matching sorts over 979 frames, about 1.55 ms/frame; the app observer measured 4.52 ms/frame inclusive, of which lifecycle synchronization was 2.12 ms/frame. Cache policy-specific allocations when their inputs have not changed and share the identical panel allocations. Preserve lifecycle population hysteresis, incumbent staffing, construction and wave semantics: these policies are not interchangeable.

4. **P2 - Hidden overlays consume roughly a third of the tested dirty rebuild.** `src/app/app.ts:186` and line 192 rebuild the entire zone and utility overlays even for a local dirty region. `src/render/zones.ts:61` and `src/render/utilities.ts:21` recreate geometry and then disable it when hidden. Three 200x200 m dirty rebuilds on the reference city took 30-37 ms, with zones plus utilities around 11-12 ms. Keep invalidation while hidden and realize the geometry on reveal; stale geometry must not reappear. This is a candidate for reducing edit and destruction stalls, not a measured implementation gain.

5. **P2 - The HUD recreates 45 elements every gameplay frame.** `src/app/app.ts:1060` calls `syncBuildings`, which calls `showCityStats` at line 369. `src/ui/hud.ts:71` and line 84 recreate all needs and ledger rows, even with the ledger hidden and the displayed strings unchanged. Instrumenting these two `replaceChildren` calls counted 716 calls / 16,110 inserted elements over 358 frames, then 722 / 16,245 over 361 frames in a second three-second running sample: 45 elements per frame, or 2,700 per second at 60 fps, excluding text nodes. Update existing nodes only when displayed values change and do not rebuild a hidden ledger. Ranked below findings 1-3: the CPU profile places rubble and staffing above HUD insertion.

6. **P3 - Empty explosion buffers are still replaced every frame.** `src/render/destructionEffects.ts:91` calls `writeExplosionMatrices` when the feature is enabled even if no explosion exists. Line 46 filters an empty list, allocates a zero-length matrix array and replaces the thin-instance buffer. Twelve-second observations counted 949 calls at x1 and 927 at x4, with zero payload and only 36.4/29.7 ms total method time. Skip unchanged empty state while still clearing the final expired explosion once.

## Measurements and limits

- Reference city: `perf/cities/ma-ville.json`, the `large-demo-v14` fixture, 131 segments and 1,287 saved building states including 1,274 working buildings.
- Hardware and setup: confirmed ANGLE Metal / Apple M3 Pro, headed Chromium, 1280x800, saved camera, default graphics, Max frame cap. Each sample cleared settings and reloaded the same fixture. Three rounds, reversed order in round two, used full 3.5-second rendered-frame windows after 1.8 seconds warmup. The preliminary run that leaked settings between scenarios was discarded.
- Median FPS: day paused 120, day running 78, day traffic-off 93, night running 67, night lights-off 80, night shadows-off 69, night buildings-hidden 75, night bloom-off 71. These are diagnostic feature ablations, not additive gains.
- Four zone-brush clicks produced eight 84-116 ms long tasks and a 134 ms maximum frame interval, including deferred work. This supports an end-to-end edit budget without attributing all the work to overlays. Vehicle follow measured 73 FPS versus 75 FPS stationary in short individual samples.
- Full rebuild median: 327.5 ms, including about 191 ms ground and 63 ms roads. Dirty rebuild median: 33.1 ms, excluding delayed parcel repack. Building GPU state uploads are batched, ten times in a 12-second running observation, and are no longer per-frame.
- Thirty seconds of ordinary play produced a 51.5 ms maximum frame. Twenty seconds after the first destruction produced 68.5 FPS and a 55.9 ms maximum frame, with two 55 ms long tasks near later destructions. These are single observations; the debug fast-forward used to reach combat is excluded from real-time frame measurements.
- A three-minute x4 soak crossed more than two day/night cycles, measuring 53.9/52.5/50.0 FPS per one-minute window with 167-207 ms maximum frame intervals. Individual stalls were not traced and differing daylight prevents reading these as progressive degradation. Scene counts stayed fixed, internal textures warmed from 13 to 17 and plateaued, post-GC heap was 191.8/194.9/195.4 MB.
- Ten rebuilds, ten same-city loads and five road-create/bulldoze/restore cycles kept scene resource counts stable. Counts do not establish GPU memory usage or rule out longer-session leaks.
- Tree-shadow upload traffic scaled from 9.38 to 37.37 MB over twelve seconds at x1/x4, but measured upload-method time stayed small and matrix preparation is excluded.
- Evidence: `perf/reviews/large-demo-v14-2026-09-05.json`, `perf/reviews/large-demo-v14-2026-09-05-completion.json`, `perf/reviews/large-demo-v14-2026-09-05.cpuprofile`, and the reusable probes in `scripts/review/` behind `npm run perf:review`.
- These are instrumented inclusive CPU timings on one machine. They do not isolate HUD layout, garbage collection or GPU work, and none of them is an optimization gain.

# Acceptance criteria
- AC1: Pointer movement in road, zone, nature and bulldoze tools no longer performs unbounded terrain intersection work; slopes, road cuts and misses keep their current hit positions, and a miss is still a miss.
- AC2: Empty rubble maps short-circuit without cell traversal, while nonempty maps preserve blocking behaviour.
- AC3: Unchanged workforce inputs do not repeat equivalent allocation sorts; policy-specific staffing semantics, population hysteresis and incumbent staffing remain covered by tests.
- AC4: Hidden zone and utility overlays defer geometry generation and refresh correctly when revealed after edits, with no stale geometry.
- AC5: Unchanged displayed needs and ledger values do not replace their DOM subtrees per frame; changed values and construction feedback remain correct.
- AC6: An empty explosion set does not replace the thin-instance buffer, while the last expired explosion is still cleared exactly once.
- AC7: Every claimed gain is supported by repeated paired measurements on the `large-demo-v14` fixture, recorded with workload, simulation rate, renderer backend and camera state, and produced by scripts that satisfy req_045.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- src/render/drawTool.ts
- src/render/ground.ts
- src/sim/rubble.ts
- src/sim/workforce.ts
- src/sim/buildingLifecycle.ts
- src/sim/buildingKinds.ts
- src/sim/batteries.ts
- src/render/zones.ts
- src/render/utilities.ts
- src/render/destructionEffects.ts
- src/ui/hud.ts
- src/app/app.ts
- perf/cities/ma-ville.json
- docs/performance.md
- perf/reviews/large-demo-v14-2026-09-05.json
- perf/reviews/large-demo-v14-2026-09-05-completion.json
- perf/reviews/large-demo-v14-2026-09-05.cpuprofile
- logics/request/req_045_review_findings_gameplay_performance_and_benchmark_validity.md
- logics/request/req_037_stop_paying_every_frame_for_a_city_that_is_not_changing.md
- logics/runbook/run_009_rerun_the_large_city_performance_review.md

# Backlog
- `item_166_bound_terrain_picking_in_the_drawing_tools`
- `item_167_short_circuit_empty_rubble_maps`
- `item_168_stop_repeating_equivalent_workforce_sorts`
- `item_169_defer_hidden_overlay_geometry_until_reveal`
- `item_170_update_hud_nodes_only_when_displayed_values_change`
- `item_171_skip_replacing_empty_explosion_buffers`
