## req_045_review_findings_gameplay_performance_and_benchmark_validity - Review findings: gameplay performance and benchmark validity
> From version: 0.5.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Performance scripts measure a paused city and report incomplete frame windows; gameplay rebuilds HUD nodes every frame.
- Keywords: review, findings, gameplay, performance, benchmark, validity
- Use when: selecting the next performance investigation or repairing performance evidence.
- Skip when: changing game balance or redesigning the renderer without measurements.

# Needs
- Make performance measurements explicitly cover running gameplay as well as paused rendering.
- Stop replacing unchanged HUD subtrees on each rendered frame.
- Measure the complete requested frame interval and pair each ablation with its current baseline.
- Restore a usable built reference city for the documented benchmark command.
- Avoid empty rubble scans and redundant workforce sorting in running large cities.
- Defer hidden overlay geometry until it is needed, while preserving correct refresh on reveal.
- Bound terrain picking work in interactive drawing tools.
- Preserve periodic autosaving during accelerated play; batching must not indefinitely defer writes.
- Capture candidates only: this review does not authorize or scope an implementation chain.

# Priority
- High: repair the measurement blind spots before using benchmark results to select rendering optimizations.

# Context
- Reviewed commit: `5a5cbd2`, version 0.5.0, on 2026-09-05. Application sources were unchanged.
- Existing req_008, req_020 and req_037 already cover previous rebuild and render-loop optimizations. This review does not reopen their completed changes. Dirty ground updates now use bounded normals and row uploads; old comments describing whole-grid normals are outdated.

## Findings

1. **P1 - The default performance workload is paused.** `src/app/app.ts:982` starts at time rate zero. Neither `scripts/perf.mjs:72` nor `scripts/ablate.mjs:51` starts the clock after generating the demo. Removing the frame cap at `scripts/perf.mjs:105` changes rendering frequency, not simulation speed. The observed demo had 237 segments, 101 buildings, 237 cars, 474 pedestrians and `timeRate: 0`. `src/app/app.ts:1050` skips economy/building synchronization and `src/render/trafficMovers.ts` skips mover updates when paused. The scripts therefore cannot detect regressions in those gameplay paths, despite counting their visible objects. Record and assert simulation mode, advancing time and mover positions; retain a separately labelled paused scenario.

2. **P2 - The HUD recreates 45 elements every gameplay frame.** `src/app/app.ts:1060` calls `syncBuildings`, which calls `showCityStats` at line 369. `src/ui/hud.ts:71` and line 84 recreate all needs and ledger rows, even with the ledger hidden and displayed strings unchanged. Instrumenting these two `replaceChildren` calls on the built demo counted 716 calls / 16,110 inserted elements over 358 frames, then 722 / 16,245 over 361 frames in a second three-second running sample. This is 45 elements per frame, or 2,700 per second at 60 fps, excluding text nodes and other HUD writes. Update existing nodes only when displayed values change, and avoid rebuilding a hidden ledger. Keep construction and selection feedback responsive.

3. **P2 - A three-second FPS measurement reports only its last completed HUD window.** `src/app/app.ts:485` waits for the requested interval and then reads `fps.display`. `src/render/fps.ts:19` uses a 500 ms window and resets its frame count at each update. `scripts/perf.mjs:135` consequently does not measure average FPS across all 3,000 ms, and early stalls disappear from the result. Use a dedicated counter over the complete measurement interval; preserve the rolling HUD meter for display. Validate using uneven frame timestamps, including a stall near the start.

4. **P2 - Ablation ratios ignore the interleaved baselines.** `scripts/ablate.mjs:103` declares `const base` once per framing. Line 111 measures a new baseline, but line 108 continues dividing every ablation by the first baseline. Machine drift can therefore look like a feature cost even though the script claims to compensate for it. Pair each sample with the adjacent baseline. A synthetic sequence with a drifting baseline and constant feature cost should keep the same ratio.

5. **P2 - The documented reference-city benchmark no longer completes.** `perf/cities/ma-ville.json` is a version-8 save without elapsed time, resources or building states. Loading it in the current application produced 189 segments, 249 cars, 727 pedestrians and zero buildings. `scripts/perf.mjs:84` requires a positive building count while the app remains paused. Running `node scripts/perf.mjs http://127.0.0.1:5187 --city perf/cities/ma-ville.json --label review-reference` failed with `page.waitForFunction: Timeout 30000ms exceeded` at line 84; no history entry was appended. The ablation script has the same positive-building precondition. Supply a current populated fixture or an explicit deterministic preparation step, and retain the nonempty-city assertion.

6. **P2 - Empty rubble checks consume measurable frame time.** `src/app/app.ts:358` calls `Rubble.blocks` for every non-rebuilding parcel each gameplay frame. `src/sim/rubble.ts:26` walks every cell and builds coordinate keys even when its map is empty. On the replacement city the CPU trace attributes about 0.73 s of an 8.70 s sample to this path. An in-browser-only empty-map guard was tested over three alternating fresh-load pairs: median 78.1 to 88.4 FPS, paired improvements 9.6-14.2%. Fix the shared method once, preserving the nonempty-map path and covering both with a focused check; no application source was changed by this review.

7. **P2 - Workforce is sorted three times per gameplay frame.** `src/sim/buildingLifecycle.ts:77` derives staffing even within the existing population band. `src/sim/buildingKinds.ts:52` allocates again and its `batteriesForParcels` call allocates a third time. `src/sim/workforce.ts:47` sorts jobs on every invocation. Instrumentation on the replacement city counted 2,939 matching sorts over 979 frames, about 1.55 ms/frame. The app observer measured 4.52 ms/frame inclusive, of which lifecycle synchronization was 2.12 ms/frame. Cache policy-specific allocations when their inputs have not changed, and share the identical panel allocations. Preserve lifecycle population hysteresis, incumbent staffing, construction and wave semantics; these policies are not interchangeable.

8. **P2 - Hidden overlays consume roughly a third of the tested dirty rebuild.** `src/app/app.ts:186` and line 192 rebuild the entire zone and utility overlays even for a local dirty region. `src/render/zones.ts:61` and `src/render/utilities.ts:21` recreate geometry then disable it when hidden. Three 200x200 m dirty rebuilds on the replacement city took 30-37 ms, with zones plus utilities around 11-12 ms. Keep invalidation while hidden and realize the geometry on reveal; verify stale geometry cannot reappear. This is a candidate for reducing edit/destruction stalls, not a measured implementation gain.

9. **P1 - Drawing tools scan the full terrain on every pointer move.** `src/render/drawTool.ts:400` calls `scene.pick` against the ground, reached from road, zone, nature and bulldoze movement via the observer at line 639. `src/render/ground.ts:30` creates one terrain mesh; runtime inspection confirms one submesh with 911,250 triangles. The dependency's nearest-triangle picker walks all its indices. Road/zone movement measured 42/46 FPS versus 75 FPS for stationary or selection-mode movement, with 18-19 ms per pick. Two fresh-load road-preview confirmations measured 43 FPS and 17.7/17.5 ms per pick. Use bounded terrain intersection work in the shared path and test slopes, road cuts and misses; merely disabling accurate picking or changing to an infinite plane would change behavior. This is the highest-priority new performance finding.

10. **P1 - Accelerated play can starve autosaving.** `src/app/app.ts:382` requests persistence every 15 displayed minutes; line 418 advances the clock at 0.08 hours per simulated second. At x4, requests arrive about every 0.78 real seconds. `src/app/persistence.ts:33` resets a two-second trailing debounce on each request. A twelve-second storage-write trace observed four autosaves at x1 and none at x4. A subsequent three-minute x4 session confirmed zero writes and unchanged saved elapsed time, followed by one write after pausing for 2.5 seconds. Continuous x2/x4 play can keep deferring the timer, risking lost progress on an abrupt exit; x4 was runtime-tested, x2 follows from the timer intervals. Preserve batching but bound its maximum wait, and test continuous requests with fake time plus an actual advancing-city check. This correctness finding arose during the performance review; suppressed persistence must not count as a performance improvement.

11. **P3 - Empty explosion buffers are still replaced every frame.** `src/render/destructionEffects.ts:91` calls `writeExplosionMatrices` when the feature is enabled even if no explosion exists. Line 46 filters an empty list, allocates a zero-length matrix array and replaces the thin-instance buffer. Twelve-second observations counted 949 calls at x1 and 927 at x4, with zero payload and only 36.4/29.7 ms total method time. Skip unchanged empty state, while still clearing the final expired explosion once. This is a small focused cleanup, ranked below picking, rubble, staffing and edit stalls.

## Measurements and limits

- Reproducibility follow-up: the seven temporary probes were migrated to `scripts/review/` with repository-relative fixture paths and one `npm run perf:review` entry point. Each run keeps separate evidence and a manifest of fixture/source/script hashes, environment and per-probe completion. The initial interactions probe now explicitly selects Review rather than Demo. Production startup requires an explicit preview URL. Procedure: `logics/runbook/run_009_rerun_the_large_city_performance_review.md` and the reusable-probe section of `docs/performance.md`. This is review tooling, not implementation of the gameplay findings.

- Completion pass used the same reference and hardware with the toolbar collapsed. Pointer, zone painting, vehicle-follow, x1/x4, repeated rebuild/load/edit cycles, daytime viewport/framing and production startup were checked. The initial named-load probe accidentally selected Demo; those load/edit samples were discarded and rerun with the Review slot explicitly selected and 1,287 buildings asserted. Full evidence is in `perf/reviews/large-demo-v14-2026-09-05-completion.json`.
- Four zone-brush clicks produced eight 84-116 ms long tasks and a 134 ms maximum frame interval, including deferred work. This strengthens the need for an end-to-end edit budget without attributing all work to overlays. Vehicle follow measured 73 FPS versus 75 FPS stationary in short individual samples.
- Two display rounds measured 82-83 FPS at the saved camera in 1280x800, 97 at street radius 140, 83 at radius 1200 and 69 at 1920x1080/DPR 2 (actual buffer 2880x1620). The pixel-ratio cap is active. Aspect ratio also changes, so this is not pure GPU isolation. No mobile-device result is claimed.
- Ten rebuilds and ten same-city loads kept scene resource counts stable. Five real road-create/bulldoze/restore cycles also restored counts, with heap increasing mostly on first use and then approaching a plateau. Counts do not establish GPU memory usage or rule out longer-session leaks. Tree-shadow upload traffic scaled from 9.38 to 37.37 MB over twelve seconds at x1/x4, but measured upload-method time remained small; matrix preparation is not included.
- Production cold-cache readiness (all models and buildings) took 1.86-1.94 s locally; warm-cache readiness took 1.86 s. A single 10 Mbit/s, 40 ms latency, 4x CPU-throttled cold run took 9.43 s. First WebGL draw was substantially earlier and is not full-city readiness. The 2.53 MB cold resource transfer included 1.82 MB GLBs and 0.68 MB JavaScript. Loading deserves its own budget, not a speculative bundler rewrite.
- A three-minute x4 soak crossed more than two day/night cycles. Its one-minute windows measured 53.9/52.5/50.0 FPS with 167-207 ms maximum frame intervals. Causes of individual stalls were not traced; differing daylight prevents interpreting these values as proof of progressive degradation. Scene counts stayed fixed, internal textures warmed from 13 to 17 and plateaued, and post-GC heap was 191.8/194.9/195.4 MB. Collections occurred outside the frame windows. This extends coverage but does not establish hour-long or combat-session stability.

- Follow-up (2026-09-05): at the user's request, replaced `perf/cities/ma-ville.json` with the supplied `save.large_demo.json`, preserving its version-14 contents. The replacement contains 131 segments and 1,287 saved building states, including 1,274 working buildings. Documented the new `large-demo-v14` benchmark label to separate it from historical measurements. Finding 5 describes the previous fixture; the other benchmark findings remain open.
- Replacement validation: byte-for-byte equality with the supplied file; Playwright loaded 1,287 buildings (1,274 working, 13 rising), 28 models and 132 runtime segments, with no page errors. The clock remained paused as expected. `rtk npm run ci` passed after replacement. This verifies fixture loading, not a new FPS baseline or completion of both benchmark scripts.

- Deeper review used the replacement city on confirmed ANGLE Metal / Apple M3 Pro, headed Chromium, 1280x800, saved camera, default graphics and Max frame cap. Each sample cleared settings and reloaded the same fixture. Waves were disabled only for steady-state measurements; resources were preserved. Three rounds, reversed order in round two, used full 3.5-second rendered-frame windows after 1.8 seconds warmup. The preliminary run that leaked settings between scenarios was discarded.
- Median FPS: day paused 120, day running 78, day traffic-off 93, night running 67, night lights-off 80, night shadows-off 69, night buildings-hidden 75, night bloom-off 71. These are diagnostic feature ablations, not additive gains. Source and runtime counts, timings and caveats are retained in `perf/reviews/large-demo-v14-2026-09-05.json` and `docs/performance.md`.
- Thirty seconds of ordinary play produced a 51.5 ms maximum frame, with a long task near the next demand boundary. Twenty seconds after the first destruction produced 68.5 FPS and a 55.9 ms maximum frame; two 55 ms long tasks occurred near later destructions. These are single observations. The debug fast-forward used to reach combat is excluded from real-time frame measurements.
- Full rebuild median: 327.5 ms, including about 191 ms ground and 63 ms roads. Dirty rebuild median: 33.1 ms, excluding delayed parcel repack. Building GPU state uploads were batched ten times in a 12-second running observation; they are no longer per-frame. HUD insertion remains 45 elements/frame, but the CPU profile ranks rubble and staffing above it.
- Application source remains unchanged. The only runtime code experiment was the temporary empty-rubble guard. The Chrome CPU trace is retained at `perf/reviews/large-demo-v14-2026-09-05.cpuprofile`.

- A temporary Playwright probe used the existing dev server, a 1280x800 viewport and the same built-demo preparation as the performance script. It waited for all 28 building models, disabled automatic waves and alternated paused/running samples at district zoom. Wrappers counted lifecycle calls, inserted HUD elements and before-render callback durations; no application source was patched.
- The two running samples executed `BuildingLifecycle.sync` once per frame (358 and 361 calls). Its measured inclusive cost was about 0.074-0.080 ms/frame on this 101-building residential demo. Staffing is also derived twice inside `buildingNeeds` through `batteriesForParcels`; this is a larger-city profiling candidate, not evidence that staffing is currently the dominant bottleneck. Preserve the different staffing policies if sharing results.
- The application callback averaged about 0.50-0.53 ms/frame while running, versus 0.07-0.08 ms while paused. The mover callback averaged about 0.62-0.66 ms/frame while running. These inclusive instrumented CPU timings do not isolate HUD layout, garbage collection or GPU work and are not optimization gains.
- One built-demo full rebuild took 429.6 ms: ground 188.6 ms, roads 151.4 ms, buildings 3.4 ms. A direct dirty rebuild over x=560..1000, z=510..790 took 30.8 ms. This excludes the delayed parcel repack and is not an end-to-end road-placement latency measurement. Existing bounded rebuild work is valuable; a full rebuild is not the steady-state frame cost.
- Browser samples reported a 120 fps ceiling in both modes. Launch flags requested headless ANGLE/SwiftShader but the renderer backend was not queried. These samples do not establish real-device GPU performance or a before/after FPS gain. Day/night, moving-camera, large mixed-use cities and full wave playthroughs need separate measurements before choosing GPU changes.
- `rtk npm run ci`: passed, including 340 tests across 49 Vitest files, 16 architecture/asset tests, scenarios, build/typecheck and Logics validation. Build warned about the 1,201 kB minified main chunk (313 kB gzip). Bundle size alone is not proof of a loading bottleneck.
- `logics-manager status`: no pre-existing open workflow docs. `health --format json`: zero issues. `audit --group-by-doc`: zero blocking issues and one existing deferred warning.

# Acceptance criteria
- AC1: Performance evidence distinguishes paused and running workloads and verifies that gameplay actually advances in the running workload.
- AC2: Unchanged displayed needs and ledger values do not replace their DOM subtrees per frame; changed values and construction feedback remain correct.
- AC3: FPS measurements include the complete requested interval, including early stalls, independently of the HUD refresh window.
- AC4: Ablation ratios use their adjacent baseline and remain correct under a synthetic drifting baseline.
- AC5: Both documented reference-city benchmark paths complete with a populated, identified fixture; empty cities still fail explicitly.
- AC6: Any future performance gain is supported by repeated comparable measurements with workload, simulation rate, renderer backend and camera state recorded.
- AC7: Empty rubble maps short-circuit without cell traversal, while nonempty maps preserve blocking behavior.
- AC8: Unchanged workforce inputs do not repeat equivalent allocation sorts; policy-specific staffing semantics remain covered.
- AC9: Hidden zone and utility overlays defer geometry generation and refresh correctly when revealed after edits.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- src/app/app.ts
- src/ui/hud.ts
- src/render/fps.ts
- src/render/trafficMovers.ts
- src/sim/buildingLifecycle.ts
- src/sim/buildingKinds.ts
- src/sim/batteries.ts
- scripts/perf.mjs
- scripts/ablate.mjs
- perf/cities/ma-ville.json
- docs/performance.md
- perf/reviews/large-demo-v14-2026-09-05.json
- perf/reviews/large-demo-v14-2026-09-05.cpuprofile
- src/sim/rubble.ts
- src/sim/workforce.ts
- src/render/zones.ts
- src/render/utilities.ts
- src/render/drawTool.ts
- src/render/ground.ts
- src/render/destructionEffects.ts
- src/app/persistence.ts
- perf/reviews/large-demo-v14-2026-09-05-completion.json
- logics/request/req_037_stop_paying_every_frame_for_a_city_that_is_not_changing.md

# Backlog
- none
