## task_048_review_findings_gameplay_performance_and_benchmark_validity - Review findings: gameplay performance and benchmark validity
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
> Indicators reviewed: 2026-09-07 09:17:34

# AI Context
- Summary: Repair the paused workload, the truncated FPS window and the stale ablation baseline so the perf scripts produce numbers that can select an optimization.
- Keywords: review, findings, gameplay, performance, benchmark, validity
- Use when: changing scripts/perf.mjs, scripts/ablate.mjs, or the frame counter they read.
- Skip when: optimizing application rendering or simulation code; that is task_047.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_165_review_findings_gameplay_performance_and_benchmark_validity`

# Acceptance criteria
- AC1: Performance evidence distinguishes paused and running workloads and verifies that gameplay actually advances in the running workload, by asserting advancing time and changed mover positions.
- AC2: FPS measurements include the complete requested interval, including early stalls, independently of the HUD refresh window; the rolling HUD meter keeps its current display behaviour.
- AC3: Ablation ratios use their adjacent baseline and remain correct under a synthetic drifting baseline with a constant feature cost.
- AC4: Both documented reference-city benchmark paths complete with the populated `large-demo-v14` fixture, and an empty city still fails explicitly rather than reporting a result.
- AC5: Every recorded result carries its workload, simulation rate, renderer backend and camera state, so a later gain can be compared against a like measurement.

# Plan
- [x] 1. Start the simulated clock in both scripts after the demo is generated, and assert advancing time plus changed mover positions so a paused run cannot pass as a running one.
- [x] 2. Keep a separately labelled paused scenario, so paused rendering stays measurable on purpose rather than by accident.
- [x] 3. Add a measurement-interval frame counter covering the full requested window, and leave the 500 ms rolling meter in src/render/fps.ts for display. Validate with uneven frame timestamps including a stall near the start.
- [x] 4. Pair each ablation with its adjacent baseline in scripts/ablate.mjs and delete the comment that claims this already happens. Check against a synthetic drifting baseline with a constant feature cost.
- [x] 5. Record workload, simulation rate, renderer backend and camera state with every result, so a later gain can be compared against a like measurement.
- [x] 6. Re-run both documented reference-city paths on the large-demo-v14 fixture, and confirm an empty city still fails explicitly instead of reporting a result.
- [x] 7. Apply ADR 009 checkpoints: update affected Logics docs during each meaningful wave and leave the repo commit-ready.

# Validation
- (no validation recorded yet)
- command: `npm run ci` | result: passed | date: 2026-09-07
- Finish workflow executed on 2026-09-07.
- Linked backlog/request close verification passed.

# Report
- AC1 paused workload: `perf.mjs` and `ablate.mjs` now start the simulated clock after the demo
  settles and refuse to continue unless `stats().simSeconds` advanced and `stats().moverPositions`
  changed with it. The defect was worth 45%: the reference city measures 120 fps paused and 83 fps
  running at every framing on the software rasteriser. `--paused` keeps the still scene measurable
  under its own `-paused` label.
- AC2 truncated FPS window: `createFpsMeter` gained `measure(now)`, counting frames over the whole
  requested interval; `measureFps` uses it instead of reading the rolling 500 ms `display`, which
  keeps its HUD behaviour untouched. Covered by a stall-at-the-start case and a concurrent-window
  case in `src/render/fps.test.ts`.
- AC3 stale ablation baseline: each ablation is divided by the mean of the two baselines that
  bracket it (`ablationRatio` in `scripts/measurement.mjs`), and the comment claiming this already
  happened is gone. `tests/ablation.mjs` holds it to 1.25 across a baseline drifting 80 -> 40 fps
  with a constant feature cost, where the old stale-baseline arithmetic read below 0.8.
- AC4 both reference paths: `npm run perf -- --city perf/cities/ma-ville.json --label
  large-demo-v14` and `npm run perf:review --probe interactions` (headed) both completed on the
  populated fixture. An empty city is now refused explicitly, exit 1 with a message naming the
  building and model counts, and nothing is appended to `perf/history.jsonl`.
- AC5 conditions: every history line and both scripts' output carry workload, simulation rate,
  renderer and the camera state the app actually settled on -- the overview framing clamps to
  radius 1200, not the 1600 the script asks for.
- Out of scope and left alone: the `scripts/review/` probes already run the clock; the headless
  `perf:review` path fails at the toolbar click on the untouched tree too, so it is a pre-existing
  break, not this task's.
- Finished on 2026-09-07.
- Linked backlog item(s): `item_165_review_findings_gameplay_performance_and_benchmark_validity`
- Related request(s): `req_045_review_findings_gameplay_performance_and_benchmark_validity`

# Links
- Request: `req_045_review_findings_gameplay_performance_and_benchmark_validity`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in 4407d48, bf302fe, bf7a021; validated with npm run ci plus npm run perf on large-demo-v14 (running 83 fps vs paused 120) and npm run ablate --rounds 1. Source: `bf7a021`
- request-AC2 -> This task. Proof: Implemented in 4407d48, bf302fe, bf7a021; validated with npm run ci plus npm run perf on large-demo-v14 (running 83 fps vs paused 120) and npm run ablate --rounds 1. Source: `bf7a021`
- request-AC3 -> This task. Proof: Implemented in 4407d48, bf302fe, bf7a021; validated with npm run ci plus npm run perf on large-demo-v14 (running 83 fps vs paused 120) and npm run ablate --rounds 1. Source: `bf7a021`
- request-AC4 -> This task. Proof: Implemented in 4407d48, bf302fe, bf7a021; validated with npm run ci plus npm run perf on large-demo-v14 (running 83 fps vs paused 120) and npm run ablate --rounds 1. Source: `bf7a021`
- request-AC5 -> This task. Proof: Implemented in 4407d48, bf302fe, bf7a021; validated with npm run ci plus npm run perf on large-demo-v14 (running 83 fps vs paused 120) and npm run ablate --rounds 1. Source: `bf7a021`
