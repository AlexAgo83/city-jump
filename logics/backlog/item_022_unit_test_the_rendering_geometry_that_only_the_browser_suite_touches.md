## item_022_unit_test_the_rendering_geometry_that_only_the_browser_suite_touches - Unit-test the rendering geometry that only the browser suite touches
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:28:32

# AI Context
- Summary: `traffic.ts`, `roadMesh.ts` and `drawTool.ts` total ~2,600 lines covered only by the browser suite; their pure geometry is testable without a scene, as `roofPropY` already is.
- Keywords: unit, test, rendering, geometry, only, browser, suite, touches
- Use when: Adding vitest coverage under `src/render/`, or extracting scene-free geometry (lane offsets, tunnel portals, snap decisions) out of the renderers.
- Skip when: The work needs a real Babylon scene, a headless WebGL harness, or a coverage-percentage target.

# Problem
- `traffic.ts`, `roadMesh.ts` and `drawTool.ts` total ~2,600 lines and are covered only by the Playwright interaction suite and the visual shot script, neither of which runs on push any more.
- The geometric decisions inside them -- lane offsets, tunnel portal placement, snap target choice -- are pure maths that need no scene, exactly like `roofPropY` which is already unit-tested.

# Scope
- In:
  - Identify the pure geometric decisions in those three files, export them as scene-free functions, and cover them with vitest tests alongside the existing `src/render/*.test.ts` files.
  - Prioritise the logic whose breakage would be hardest to spot in a screenshot: lane offset maths, tunnel portal placement, and the snap decision.
  - Keep the extraction mechanical -- no behaviour change, no new abstraction layer.
- Out:
  - A headless Babylon/WebGL test harness.
  - Rewriting or restructuring the renderers beyond pulling out the pure functions.
  - Chasing a coverage percentage target.

# Acceptance criteria
- AC1: Pure geometry from each of `traffic.ts`, `roadMesh.ts` and `drawTool.ts` is exported and covered by vitest tests that construct no Babylon scene.
- AC2: `npm test` still runs without a browser or GPU, and `tests/architecture.mjs` still passes.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: Pure geometry from each of `traffic.ts`, `roadMesh.ts` and `drawTool.ts` is exported and covered by vitest tests that construct no Babylon scene.
- request-AC6 -> This backlog slice. Proof: AC2: `npm test` still runs without a browser or GPU, and `tests/architecture.mjs` still passes.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_004_a_city_builder_that_never_loses_the_city_on_screen`
- Architecture decision(s): (none yet)
- Request: `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene`
- Primary task(s): `task_009_implement_the_load_rollback_and_rendering_hygiene_review_findings`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_009_implement_the_load_rollback_and_rendering_hygiene_review_findings`

# Notes
- Task `task_009_implement_the_load_rollback_and_rendering_hygiene_review_findings` was finished via `logics-manager flow finish task` on 2026-08-30.
