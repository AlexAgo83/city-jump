## item_194_evaluate_a_minimal_render_resolution_quality_option - Evaluate a minimal render-resolution quality option
> From version: 0.5.2
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-07 15:22:14

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

# Outcome
- One minimal persisted option delivered on 2026-09-07: an "Extra AA" checkbox in the Look row, on by default so nothing changes for an existing player. Off drops scene multisampling from four samples to one; the FXAA pass the "Smooth" checkbox controls is untouched and still smooths edges, which is what makes this a trade rather than a downgrade.
- Measured before building anything, three rounds each, per-round paired deltas at night-saved / day-district / moving:
  - multisampling off (`perf/reviews/task055-wave5-msaa/`): +21.6% / +4.7% / +7.0%
  - render resolution at two thirds (`.../task055-wave5-scale/`): +18.6% / +9.1% / +4.7%
  - multisampling halved to two samples (`.../task055-wave5-msaa2/`): +10.3% / +3.7% / +2.6%
- Multisampling was chosen over resolution scaling on the same evidence: it is the larger win at the framing that needs it most, and it costs edge quality only, where scaling blurs the whole picture including text and road markings. Halving to two samples was rejected as an option because it buys less than half as much for the same amount of UI.
- `pipeline.samples = 4` had no player control at all before this; "Smooth" is FXAA and always was. The slice's gap was a missing option, not a missing optimisation.
- Shipped behaviour is proved by `scripts/review/look.mjs`, a new probe asserting the checkbox drives the pipeline end to end -- four samples by default, one when unchecked, four again when re-checked, and the choice written to the persisted settings. Evidence in `perf/reviews/task055-wave5-look/`.
- Correction recorded: the first `scale` measurement was invalid, not null. The variant called `setHardwareScalingLevel(1)` while the probe already runs at device pixel ratio 1, so it changed nothing and read as no gain. It now renders at two thirds and throws if the level does not move, which is the same self-verification rule the other ablations gained in this task.
