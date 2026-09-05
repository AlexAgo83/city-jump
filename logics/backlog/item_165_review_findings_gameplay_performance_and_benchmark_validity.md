## item_165_review_findings_gameplay_performance_and_benchmark_validity - Review findings: gameplay performance and benchmark validity
> From version: 0.5.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Repair the three defects that make scripts/perf.mjs and scripts/ablate.mjs report numbers that cannot select an optimization.
- Keywords: review, findings, gameplay, performance, benchmark, validity
- Use when: changing the performance measurement scripts or the FPS counter they read.
- Skip when: optimizing application rendering or simulation code; that is req_047.

# Problem
- The default workload never starts the clock, so the scripts measure a paused city while counting gameplay objects (src/app/app.ts:982, scripts/perf.mjs:72, scripts/ablate.mjs:51).
- A three-second FPS sample reports only the last completed 500 ms HUD window, so early stalls vanish (src/render/fps.ts:19, scripts/perf.mjs:135).
- Every ablation ratio divides by the first baseline of the framing, so machine drift reads as feature cost (scripts/ablate.mjs:103-111).

# Scope
- In:
  - scripts/perf.mjs and scripts/ablate.mjs measurement and reporting logic
  - a measurement-interval frame counter, separate from the rolling HUD meter in src/render/fps.ts
  - recording workload, simulation rate, renderer backend and camera state with each result
- Out:
  - any change to application rendering or simulation code
  - the gameplay optimizations in req_047
  - replacing the perf/cities/ma-ville.json fixture, which is already done

# Acceptance criteria
- AC1: Performance evidence distinguishes paused and running workloads and verifies that gameplay actually advances in the running workload, by asserting advancing time and changed mover positions.
- AC2: FPS measurements include the complete requested interval, including early stalls, independently of the HUD refresh window; the rolling HUD meter keeps its current display behaviour.
- AC3: Ablation ratios use their adjacent baseline and remain correct under a synthetic drifting baseline with a constant feature cost.
- AC4: Both documented reference-city benchmark paths complete with the populated `large-demo-v14` fixture, and an empty city still fails explicitly rather than reporting a result.
- AC5: Every recorded result carries its workload, simulation rate, renderer backend and camera state, so a later gain can be compared against a like measurement.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Performance evidence distinguishes paused and running workloads and verifies that gameplay actually advances in the running workload, by asserting advancing time and changed mover positions.
- request-AC2 -> This backlog slice. Proof: AC2: FPS measurements include the complete requested interval, including early stalls, independently of the HUD refresh window; the rolling HUD meter keeps its current display behaviour.
- request-AC3 -> This backlog slice. Proof: AC3: Ablation ratios use their adjacent baseline and remain correct under a synthetic drifting baseline with a constant feature cost.
- request-AC4 -> This backlog slice. Proof: AC4: Both documented reference-city benchmark paths complete with the populated `large-demo-v14` fixture, and an empty city still fails explicitly rather than reporting a result.
- request-AC5 -> This backlog slice. Proof: AC5: Every recorded result carries its workload, simulation rate, renderer backend and camera state, so a later gain can be compared against a like measurement.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_045_review_findings_gameplay_performance_and_benchmark_validity.md`
- Primary task(s): (none yet)

# Priority
- Priority: High
- Rationale: No number from the perf scripts can select an optimization until these are fixed; req_047 is blocked on it.

# Notes
- Hybrid rationale: Derived from request `req_045_review_findings_gameplay_performance_and_benchmark_validity` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_045_review_findings_gameplay_performance_and_benchmark_validity.md`.
- Generated locally by logics-manager.

# Tasks
- `task_048_review_findings_gameplay_performance_and_benchmark_validity`
