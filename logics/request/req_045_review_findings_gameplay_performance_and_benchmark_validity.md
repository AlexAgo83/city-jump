## req_045_review_findings_gameplay_performance_and_benchmark_validity - Review findings: gameplay performance and benchmark validity
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 90%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The performance scripts measure a paused city, report only the last HUD window and divide every ablation by a stale baseline, so their numbers cannot select an optimization.
- Keywords: benchmark, measurement, ablation, fps, paused, validity
- Use when: repairing or trusting the performance measurement tooling.
- Skip when: implementing a gameplay optimization; that work is req_047.

# Needs
- Make performance measurements explicitly cover running gameplay as well as paused rendering.
- Measure the complete requested frame interval, independently of the HUD refresh window.
- Pair each ablation with its adjacent baseline instead of the first one of the framing.
- Keep both documented reference-city benchmark paths completing on a populated, identified fixture, with the nonempty assertion retained.

# Priority
- High: these are defects in the instrument. Until they are fixed, no number produced by
  `scripts/perf.mjs` or `scripts/ablate.mjs` may be used to select or accept a rendering
  optimization. req_047 depends on this request for exactly that reason.

# Context
- Reviewed commit: `5a5cbd2`, version 0.5.0, on 2026-09-05. Application sources were unchanged.
- Scope split (2026-09-05): this request now covers only measurement validity. The gameplay
  and edit-cost findings moved to req_047; the autosave starvation defect, which is a
  correctness bug rather than a performance one, moved to req_046.
- req_008, req_020 and req_037 already cover previous rebuild and render-loop optimizations.
  This request does not reopen them.
- Out of scope: changing application rendering or simulation code. The only permitted source
  changes are to the measurement scripts and to the FPS counter used by measurement.

## Findings

1. **P1 - The default performance workload is paused.** `src/app/app.ts:982` starts at time rate zero. Neither `scripts/perf.mjs:72` nor `scripts/ablate.mjs:51` starts the clock after generating the demo. Removing the frame cap at `scripts/perf.mjs:105` changes rendering frequency, not simulation speed. The observed demo had 237 segments, 101 buildings, 237 cars, 474 pedestrians and `timeRate: 0`. `src/app/app.ts:1050` skips economy and building synchronization, and `src/render/trafficMovers.ts` skips mover updates, when paused. The scripts therefore cannot detect regressions in those gameplay paths, despite counting their visible objects. Record and assert simulation mode, advancing time and mover positions; retain a separately labelled paused scenario.

2. **P2 - A three-second FPS measurement reports only its last completed HUD window.** `src/app/app.ts:485` waits for the requested interval and then reads `fps.display`. `src/render/fps.ts:19` uses a 500 ms window and resets its frame count at each update. `scripts/perf.mjs:135` consequently does not measure average FPS across all 3,000 ms, and early stalls disappear from the result. Use a dedicated counter over the complete measurement interval; preserve the rolling HUD meter for display. Validate with uneven frame timestamps, including a stall near the start.

3. **P2 - Ablation ratios ignore the interleaved baselines.** `scripts/ablate.mjs:103` declares `const base` once per framing. Line 111 measures a fresh baseline and records it, but line 108 keeps dividing every ablation by that first baseline, so the comment claiming each ratio is against a fresh baseline is wrong. Machine drift can therefore look like a feature cost. Pair each sample with its adjacent baseline. A synthetic sequence with a drifting baseline and a constant feature cost must keep the same ratio.

4. **Resolved - the reference-city fixture was empty and has been replaced.** At review time `perf/cities/ma-ville.json` was a version-8 save without elapsed time, resources or building states, loading as 189 segments and zero buildings; `scripts/perf.mjs:84` and the ablation script both require a positive building count, so `node scripts/perf.mjs http://127.0.0.1:5187 --city perf/cities/ma-ville.json --label review-reference` failed with `page.waitForFunction: Timeout 30000ms exceeded` and appended no history entry. The file has since been replaced with the supplied version-14 `large-demo-v14` save. No fixture change remains to be made; AC5 keeps the guarantee that both documented paths still complete and that empty cities still fail explicitly.

# Measurements and limits

- Fixture replacement (2026-09-05): `perf/cities/ma-ville.json` was replaced with the supplied `save.large_demo.json`, preserving its version-14 contents: 131 segments and 1,287 saved building states, including 1,274 working buildings. The `large-demo-v14` benchmark label separates it from historical measurements.
- Replacement validation: byte-for-byte equality with the supplied file; Playwright loaded 1,287 buildings (1,274 working, 13 rising), 28 models and 132 runtime segments, with no page errors. The clock remained paused, as expected. `rtk npm run ci` passed after replacement. This verifies fixture loading, not a new FPS baseline, and not completion of both benchmark scripts.
- Reproducibility: the seven temporary probes were migrated to `scripts/review/` with repository-relative fixture paths and one `npm run perf:review` entry point. Each run keeps separate evidence and a manifest of fixture, source and script hashes, environment and per-probe completion. The interactions probe now explicitly selects Review rather than Demo. Production startup requires an explicit preview URL. Procedure: `logics/runbook/run_009_rerun_the_large_city_performance_review.md` and the reusable-probe section of `docs/performance.md`. This is review tooling, not implementation.
- Probe method: a temporary Playwright probe used the existing dev server, a 1280x800 viewport and the same built-demo preparation as the performance script. It waited for all 28 building models, disabled automatic waves and alternated paused and running samples at district zoom. Wrappers counted lifecycle calls, inserted HUD elements and before-render callback durations; no application source was patched.
- The two running samples executed `BuildingLifecycle.sync` once per frame (358 and 361 calls), at about 0.074-0.080 ms/frame on the 101-building residential demo. The application callback averaged about 0.50-0.53 ms/frame running versus 0.07-0.08 ms paused; the mover callback averaged about 0.62-0.66 ms/frame running. These inclusive instrumented timings do not isolate HUD layout, garbage collection or GPU work, and are not optimization gains.
- Browser samples reported a 120 fps ceiling in both modes. Launch flags requested headless ANGLE/SwiftShader but the renderer backend was not queried, so these samples do not establish real-device GPU performance. Day/night, moving-camera and full wave playthroughs need separate measurements before choosing GPU changes.
- Loading: production cold-cache readiness (all models and buildings) took 1.86-1.94 s locally; warm cache 1.86 s. A single 10 Mbit/s, 40 ms latency, 4x CPU-throttled cold run took 9.43 s. First WebGL draw was substantially earlier and is not full-city readiness. The 2.53 MB cold transfer included 1.82 MB GLBs and 0.68 MB JavaScript. Loading deserves its own budget, not a speculative bundler rewrite.
- Display rounds measured 82-83 FPS at the saved camera in 1280x800, 97 at street radius 140, 83 at radius 1200 and 69 at 1920x1080 DPR 2 (actual buffer 2880x1620). The pixel-ratio cap is active and aspect ratio also changes, so this is not pure GPU isolation. No mobile-device result is claimed.
- `rtk npm run ci`: passed, including 340 tests across 49 Vitest files, 16 architecture and asset tests, scenarios, build, typecheck and Logics validation. Build warned about the 1,201 kB minified main chunk (313 kB gzip). Bundle size alone is not proof of a loading bottleneck.
- `logics-manager health --format json`: zero issues. `audit --group-by-doc`: zero blocking issues and one existing deferred warning.

# Acceptance criteria
- AC1: Performance evidence distinguishes paused and running workloads and verifies that gameplay actually advances in the running workload, by asserting advancing time and changed mover positions.
- AC2: FPS measurements include the complete requested interval, including early stalls, independently of the HUD refresh window; the rolling HUD meter keeps its current display behaviour.
- AC3: Ablation ratios use their adjacent baseline and remain correct under a synthetic drifting baseline with a constant feature cost.
- AC4: Both documented reference-city benchmark paths complete with the populated `large-demo-v14` fixture, and an empty city still fails explicitly rather than reporting a result.
- AC5: Every recorded result carries its workload, simulation rate, renderer backend and camera state, so a later gain can be compared against a like measurement.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- scripts/perf.mjs
- scripts/ablate.mjs
- scripts/review/
- src/render/fps.ts
- src/app/app.ts
- src/render/trafficMovers.ts
- perf/cities/ma-ville.json
- docs/performance.md
- perf/reviews/large-demo-v14-2026-09-05.json
- perf/reviews/large-demo-v14-2026-09-05-completion.json
- perf/reviews/large-demo-v14-2026-09-05.cpuprofile
- logics/runbook/run_009_rerun_the_large_city_performance_review.md
- logics/request/req_046_bound_autosave_latency_so_accelerated_play_cannot_starve_persistence.md
- logics/request/req_047_cut_the_per_frame_cost_the_large_city_review_measured_in_gameplay_and_edits.md

# Backlog
- `item_165_review_findings_gameplay_performance_and_benchmark_validity`
