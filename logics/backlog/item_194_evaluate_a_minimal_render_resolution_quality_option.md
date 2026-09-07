## item_194_evaluate_a_minimal_render_resolution_quality_option - Evaluate a minimal render-resolution quality option
> From version: 0.5.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 15:20:01

# AI Context
- Summary: Engine DPR is capped at 1.5 while the postprocessing pipeline always uses four MSAA samples; no measured render-scale control exists.
- Keywords: evaluate, minimal, render, resolution, quality, option
- Use when: implementing this bounded performance slice after its stated dependencies and comparing it with the recorded GPU baseline.
- Skip when: A preset framework or automatic dynamic resolution.

# Problem
- Engine DPR is capped at 1.5 while the postprocessing pipeline always uses four MSAA samples; no measured render-scale control exists.
- Lights and geometry currently have stronger evidence, so a new quality UI is conditional on this isolated experiment.

# Scope
- In:
  - Priority rationale: Resolution may help high-DPR displays, but the current review used DPR 1 and did not isolate fill cost.
  - Depends on: baseline and medium/high-priority render work. Measure DPR 1 and 2 at 1280x800 and 1920x1080, actual buffer size logged, with current versus 1x scale and MSAA 4 versus 2/1 as isolated changes.
  - If a meaningful gain survives the shared protocol, add the smallest existing-controls-compatible quality choice with current quality default and one measured lower setting, persisted with existing settings and current i18n/accessibility patterns.
  - Keep FXAA, bloom, SSAO and miniature controls semantically intact; explain rendered sharpness tradeoff with short user-facing text. Respect resize and DPR changes with no blurry HUD or incorrect picking.
  - If resolution changes merely reduce quality without stable gain, retain current behavior and record the decision. Do not add automatic frame-time-driven resolution changes in this chain.
- Out:
  - A preset framework or automatic dynamic resolution.
  - Changing the 60 FPS default cap or presenting power savings as higher uncapped FPS.

# Acceptance criteria
- AC1: Record isolated scale/MSAA results on both DPR classes and a retained setting or measured no-change decision.
- AC2: If retained, persistence/default, resize, DPR, keyboard access and correct picking have coverage; captures preserve near-model readability and sharp DOM UI.
- AC3: Finish with all request acceptance criteria mapped to proof, every experimental verdict documented and final integrated performance/CI/e2e gates passed.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: Record isolated scale/MSAA results on both DPR classes and a retained setting or measured no-change decision.
- request-AC9 -> This backlog slice. Proof: AC2: If retained, persistence/default, resize, DPR, keyboard access and correct picking have coverage; captures preserve near-model readability and sharp DOM UI.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_040_a_smoother_city_near_and_far_without_losing_the_distant_city`
- Architecture decision(s): (none yet)
- Request: `req_054_deliver_measured_distance_aware_city_performance`
- Primary task(s): `task_055_deliver_and_validate_the_distance_aware_performance_slices`

# Priority
- Priority: Low
- Rationale: Resolution may help high-DPR displays, but the current review used DPR 1 and did not isolate fill cost.
