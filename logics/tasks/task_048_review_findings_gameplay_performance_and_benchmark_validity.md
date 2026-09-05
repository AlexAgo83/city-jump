## task_048_review_findings_gameplay_performance_and_benchmark_validity - Review findings: gameplay performance and benchmark validity
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Repair the paused workload, the truncated FPS window and the stale ablation baseline so the perf scripts produce numbers that can select an optimization.
- Keywords: review, findings, gameplay, performance, benchmark, validity
- Use when: changing scripts/perf.mjs, scripts/ablate.mjs, or the frame counter they read.
- Skip when: optimizing application rendering or simulation code; that is task_047.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_165_review_findings_gameplay_performance_and_benchmark_validity`

# Acceptance criteria
- AC1: Performance evidence distinguishes paused and running workloads and verifies that gameplay actually advances in the running workload, by asserting advancing time and changed mover positions.
- AC2: FPS measurements include the complete requested interval, including early stalls, independently of the HUD refresh window; the rolling HUD meter keeps its current display behaviour.
- AC3: Ablation ratios use their adjacent baseline and remain correct under a synthetic drifting baseline with a constant feature cost.
- AC4: Both documented reference-city benchmark paths complete with the populated `large-demo-v14` fixture, and an empty city still fails explicitly rather than reporting a result.
- AC5: Every recorded result carries its workload, simulation rate, renderer backend and camera state, so a later gain can be compared against a like measurement.

# Plan
- [ ] 1. Start the simulated clock in both scripts after the demo is generated, and assert advancing time plus changed mover positions so a paused run cannot pass as a running one.
- [ ] 2. Keep a separately labelled paused scenario, so paused rendering stays measurable on purpose rather than by accident.
- [ ] 3. Add a measurement-interval frame counter covering the full requested window, and leave the 500 ms rolling meter in src/render/fps.ts for display. Validate with uneven frame timestamps including a stall near the start.
- [ ] 4. Pair each ablation with its adjacent baseline in scripts/ablate.mjs and delete the comment that claims this already happens. Check against a synthetic drifting baseline with a constant feature cost.
- [ ] 5. Record workload, simulation rate, renderer backend and camera state with every result, so a later gain can be compared against a like measurement.
- [ ] 6. Re-run both documented reference-city paths on the large-demo-v14 fixture, and confirm an empty city still fails explicitly instead of reporting a result.
- [ ] 7. Apply ADR 009 checkpoints: update affected Logics docs during each meaningful wave and leave the repo commit-ready.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_045_review_findings_gameplay_performance_and_benchmark_validity`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
