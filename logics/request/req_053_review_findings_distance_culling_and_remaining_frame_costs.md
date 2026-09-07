## req_053_review_findings_distance_culling_and_remaining_frame_costs - Review findings: distance culling and remaining frame costs
> From version: 0.5.2
> Schema version: 1.0
> Status: Archived
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 15:19:46

# AI Context
- Summary: Review remaining frame costs and missing distance policies against the current renderer, without implementing optimizations.
- Keywords: performance, FPS, distance, thin instances, terrain, workforce, benchmark
- Use when: choosing the next measured FPS optimization for large cities.
- Skip when: changing game balance or implementing world streaming without evidence of memory pressure.

# Needs
- Prioritize distance-based visibility and detail experiments using current measurements, preserving simulation outside the camera.
- Repair benchmark preconditions and outdated performance documentation before relying on historical claims.
- Investigate the remaining workforce cache misses despite the completed item_168; reuse its policy constraints rather than creating a duplicate implementation commitment.
- Capture candidates only: no application changes, backlog, tasks or product brief in this review.

# Context
Review of application commit `4d81541`, 2026-09-07. The corpus initially had no open workflow documents and health reported zero issues.

## Findings
1. **Confirmed: documented distance policies are absent.** `docs/performance.md:495` describes automatic boxes beyond 1100 m and traffic distance culling. The only application caller of `buildings.setDistant` is the manual checkbox in `src/app/app.ts:955` (`src/ui/controls.ts:44`). `src/render/trafficMovers.ts:591` updates every mover and has no camera/distance visibility policy. `src/render/detail.ts:20` still hides furniture, roof props and pedestrians at zoom thresholds 420/700/900. Candidate: test periodic traffic visibility, including headlights and children, and automatic building detail with threshold hysteresis. Keep traffic simulation and follow/selection targets valid. This is distinct from disabling traffic, which clears movers and stops its simulation.
2. **Confirmed structure, unmeasured gain: city-wide static batches defeat spatial rejection.** Buildings are bucketed by model across all parcels (`src/render/buildings.ts:462`), with `alwaysSelectAsActiveMesh` at line 985. Tree trunks and canopies do the same (`src/render/trees.ts:116`); streetlights use global batches too (`src/render/streetlights.ts:59`). Thin instances are culled collectively, not individually. Candidate: bounded tile batches sharing geometry/materials, first on one renderer, so offscreen tiles can be rejected without rebuilding all instance buffers as the camera moves. Tile size is an experiment, not a fixed requirement. More batches increase draw calls; account for offscreen shadow casters and visual transitions.
3. **Confirmed structure, unmeasured gain: terrain remains one dense mesh.** `src/render/ground.ts:38` builds the entire heightfield into one mesh: 456,976 vertices and 911,250 triangles at the current 5400 m / 8 m grid. Dirty updates and exact heightmap picking already exist. Candidate: render tiles and, only if needed, coarse distant geometry. Preserve the authoritative heightmap, road cuts and exact picking; test seams and distant road alignment. This is not evidence that terrain is the dominant GPU cost.
4. **Remaining gap in completed workforce work.** `src/sim/workforce.ts:56` caches one allocation by array and callback identity. `src/sim/buildingLifecycle.ts:73` creates a fresh parcel array and callback each sync; `src/app/app.ts:381` creates another array for needs, interleaving the two policies. Consequently unchanged gameplay inputs still miss that cache. Item_168's shared battery result and cheaper comparator are present; do not re-report those as missing. Candidate: retain policy-specific results on actual input changes and reuse stable inputs, preserving population bands, incumbency and rebuilding exclusions. Profile before choosing cadence changes.
5. **Confirmed benchmark failure and stale evidence.** `npm run perf:review -- --probe profile --out .tmp/perf-review/fps-distance-20260907` failed at `scripts/review/profile.mjs:29`: it requires exactly 28 models, while a fresh browser inspection found 107 models, 1287 buildings, 166 cars, 311 pedestrians and 2528 trees. The failed manifest is retained. A temporary copy changes only the readiness count to 107 and uses the existing profile workloads; no tracked benchmark source was changed. Broader renderer/fixture preconditions should be checked before future comparisons.

## Distance versus loading
Keep shared models resident initially. Hiding render work or lowering distant detail targets frame time; unloading assets targets memory/load costs and can introduce camera-motion stalls. The current renderer initiates all model loads (`src/render/buildings.ts:582`), but this review has not measured memory pressure that justifies streaming. Night lighting and render resolution are separate candidates: real clustered lights remain enabled city-wide at night (`src/render/streetlights.ts:212`, `src/render/vehicleLights.ts:22`); DPR is capped at 1.5 and pipeline MSAA is fixed at four (`src/render/scene.ts:37`, `src/render/postFx.ts:47`). Any distant light substitute must preserve the night appearance; previous discarded experiments are recorded in docs/performance.md.

## Validation and measurements
- `rtk proxy npm run ci`: passed, including 386 tests in 54 Vitest files, architecture/asset checks, scenarios, build, typecheck and Logics validation. Existing bundle-size warning and one nonblocking workflow warning remain.
- Adapted profile completed successfully: 27 samples, 8-second CPU profile and six rebuild measurements. GPU confirmed on each sample; headed Chromium, 1280x800 DPR 1, saved camera, expanded toolbar, Max frame cap, waves disabled and original resources/construction. Each mode reloads the fixture; three rounds, second reversed. Evidence: `perf/reviews/fps-distance-2026-09-07.json`, including provenance and the exact readiness adaptation. Raw CPU trace remains in `.tmp/perf-review/fps-distance-current/large.cpuprofile`.

| Mode | Median FPS | Median frame p95 (ms) |
| --- | ---: | ---: |
| day-paused | 117.5 | 9.6 |
| day-running | 93.2 | 12.4 |
| day-no-traffic | 109.4 | 10.8 |
| night-running | 58.6 | 22.5 |
| night-no-lights | 91.7 | 12.5 |
| night-no-shadows | 67.6 | 17.4 |
| night-no-buildings | 93.2 | 12.5 |
| night-no-bloom | 59.0 | 22.5 |
| day-moving-camera | 79.3 | 16.3 |

- Night lights-off is about 57% faster than night baseline; buildings-hidden about 59%. These ablations overlap, must not be added, and do not predict the gain of partial distance culling. Bloom-off is effectively unchanged. Traffic-off also stops and clears traffic simulation; its approximately 17% daytime delta is not a pure rendering gain.
- CPU trace self samples: scene active-mesh evaluation 758 ms, BuildingLifecycle.sync 437 ms, allocateWorkforce 158 ms over the approximately eight-second trace. These locate CPU work, not total GPU frame cost. The remaining cache gap is therefore worth measuring directly.
- Full rebuild median 363.7 ms, ground 192.7 ms and buildings 62.5 ms. Direct dirty rebuild median 23.7 ms; excludes deferred parcel rebuilding. These are loading/edit stalls, distinct from steady-state FPS.
- Suggested investigation order: low-risk distance visibility/manual-box A/B first; preserve night appearance while reducing distant lighting; prototype static spatial batches on one renderer; verify policy-specific workforce cache reuse; terrain tiles/LOD only after a targeted terrain ablation. No numerical gain is promised for these unimplemented candidates.


# Acceptance criteria
- AC1: Benchmark readiness reflects the current model catalog and fails clearly for missing assets; historical distance claims are reconciled with executable behavior.
- AC2: Any selected distance experiment preserves offscreen simulation, follow/selection, shadow coverage and visual continuity; compare street, district and overview cameras including movement.
- AC3: Any selected workforce change proves cache reuse for unchanged inputs separately for each policy and retains existing simulation outcomes.
- AC4: Accept optimizations only on repeated comparable measurements of frame-time median/p95/p99, CPU cost and relevant render counts, with actual GPU, resolution, city state and simulation rate recorded. Measure editing/loading stalls separately.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- perf/reviews/fps-distance-2026-09-07.json
- docs/performance.md
- src/render/detail.ts
- src/render/buildings.ts
- src/render/trafficMovers.ts
- src/render/trees.ts
- src/render/ground.ts
- src/sim/workforce.ts
- src/sim/buildingLifecycle.ts
- src/app/app.ts
- scripts/review/profile.mjs
- logics/request/req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits.md
- https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances

# Backlog
- none

# Notes
- Review capture complete. All findings are carried into the executable req_054 delivery corpus and task_055. This archived document preserves the original observations and measurements; it is not an open implementation request.
