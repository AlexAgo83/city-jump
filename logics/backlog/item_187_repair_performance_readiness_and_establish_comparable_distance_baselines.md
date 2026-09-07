## item_187_repair_performance_readiness_and_establish_comparable_distance_baselines - Repair performance readiness and establish comparable distance baselines
> From version: 0.5.2
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 18:53:55

# AI Context
- Summary: The profile probe times out waiting for exactly 28 models; the current city settles at 107. Other probes and docs carry the same historical assumptions.
- Keywords: repair, performance, readiness, establish, comparable, distance, baselines
- Use when: implementing this bounded performance slice after its stated dependencies and comparing it with the recorded GPU baseline.
- Skip when: Changing gameplay or implementing optimizations in this measurement slice.

# Problem
- The profile probe times out waiting for exactly 28 models; the current city settles at 107. Other probes and docs carry the same historical assumptions.
- The committed September 7 review measures 93.2 FPS daytime and 58.6 at night, but uses a temporary readiness adaptation and one saved camera; it is evidence, not a complete before/after baseline.

# Scope
- In:
  - Priority rationale: Every following decision depends on a runnable and comparable measurement.
  - Depends on: none. Read all scripts/review probes, perf/ablate and tests/perf-review.mjs; replace obsolete model counts through an existing catalog/manifest or bounded readiness signal, not a new hard-coded 107. Require all expected assets or explicit errors, stable positive buildings and the intended fixture.
  - Reuse existing Playwright probes; preserve original fixture bytes and reload original resources for each short sample. Disable waves only for steady state; measure active combat separately without including synthetic fast-forward.
  - Record commit/source and script hashes, dirty state, fixture hash, browser, queried GPU backend, viewport/render buffer/DPR, resolved camera, toolbar, cap, time rate, building/model/mover counts, simulation advancement and mover progress.
  - Add isolated diagnostics for render-only traffic visibility (simulation still active), boxes, trees, ground, clustered lights, resolution and MSAA. Diagnostic switches stay outside shipped player UI and are restored in finally blocks.
  - Use street radius 140, district 600 and overview requested 1600 with the actual clamped radius recorded, plus saved framing; stationary, orbit/pan and follow paths; day 10 and night 22 at x1, x4 and paused labeled separately.
  - Baseline and candidate comparisons: at least three interleaved A/B pairs per affected scenario, 2 s warmup and 5 s samples, identical workload seed/state/settings and idle machine; no concurrent GPU probes. Record median and p95/p99 rendered frame intervals, CPU and draw/active-mesh/triangle/upload counts where available. Longer 30 s samples cover stalls; these are diagnostics, not flaky CI FPS assertions.
  - For retention target at least 5% median or p95 frame-time reduction in the targeted scenario, same direction in all three pairs, and no greater than 5% median/p95 regression in required control views. At refresh ceiling use direct CPU/GPU evidence; insufficient/noisy evidence means extend samples before deciding. Visual/correctness regressions always fail.
  - Update docs/performance.md to distinguish shipped behavior from historical experiments: automatic boxes and traffic distance masking are currently absent. Keep old numbers labeled by commit.
- Out:
  - Changing gameplay or implementing optimizations in this measurement slice.
  - New benchmarking frameworks or absolute hardware-dependent CI FPS thresholds.

# Acceptance criteria
- AC1: The documented runner finishes on the current reference without local patches; missing models produce a bounded actionable failure, covered by a small readiness test.
- AC2: Fresh baseline and per-feature diagnostics include the defined metadata and verify the simulation was running, while pause and traffic simulation-off are explicitly distinct controls.
- AC3: The comparison protocol and retention rule are recorded in docs/performance.md; feature removal is not presented as the expected gain of partial culling.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The documented runner finishes on the current reference without local patches; missing models produce a bounded actionable failure, covered by a small readiness test.
- request-AC9 -> This backlog slice. Proof: AC2: Fresh baseline and per-feature diagnostics include the defined metadata and verify the simulation was running, while pause and traffic simulation-off are explicitly distinct controls.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Delivery evidence
- Shared `scripts/model-readiness.mjs` reads the served manifest and rejects missing assets with model IDs; `tests/perf-review.mjs` covers success and missing-model failure. Perf/ablate now query the actual renderer too.
- `scripts/review/distance.mjs` provides isolated feature diagnostics and interleaved candidate/baseline URL measurements. Protocol, reproduction commands and rejection thresholds are documented in `docs/performance.md`.
- Baseline: `perf/reviews/task055-wave1-baseline/` completed 24 samples on headed Chromium 151 / Apple M3 Pro, with 1287 buildings and 107 models. Original fixture bytes and application source remain unchanged.
- `npm run ci` passed (386 tests); final harness edits passed focused lint, readiness/CLI tests and diff whitespace validation. Feature-specific diagnostics and final integrated proof are recorded in the subsequent waves before this slice closes.

# Links
- Product brief(s): `prod_040_a_smoother_city_near_and_far_without_losing_the_distant_city`
- Architecture decision(s): (none yet)
- Request: `req_054_deliver_measured_distance_aware_city_performance`
- Primary task(s): `task_055_deliver_and_validate_the_distance_aware_performance_slices`

# Priority
- Priority: High
- Rationale: Every following decision depends on a runnable and comparable measurement.

# Tasks
- `task_055_deliver_and_validate_the_distance_aware_performance_slices`

# Notes
- Task `task_055_deliver_and_validate_the_distance_aware_performance_slices` was finished via `logics-manager flow finish task` on 2026-09-07.
