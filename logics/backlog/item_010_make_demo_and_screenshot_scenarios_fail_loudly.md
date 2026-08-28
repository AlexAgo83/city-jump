## item_010_make_demo_and_screenshot_scenarios_fail_loudly - Make demo and screenshot scenarios fail loudly
> From version: 0.1.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-28 16:27:15

# AI Context
- Summary: Make debug demo roads and screenshot scenarios strict so refused roads or missing scenario elements fail the script instead of producing misleading docs media.
- Keywords: screenshot validation, debug API, demoNetwork, demoCity, required counts, rugged capture
- Use when: hardening `src/render/debugApi.ts` or `scripts/shot.mjs` around demo-road success and screenshot scenario counts.
- Skip when: changing road validation to make a demo pass or inventing a layout DSL.

# Problem
- Debug demo builders call `api.road(...)` repeatedly and ignore `false`, so a screenshot can silently lose required scenario elements.
- The rugged e2e check currently only verifies that some roads render, not that the required capture hierarchy survived terrain validation.

# Scope
- In:
  - Wrap required debug road creation so a refused required road throws with a useful label.
  - Add explicit scenario count checks for required avenues, tunnels, roads, junctions, buildings, and active meshes where the capture script can assert them.
  - Keep the scenario data local to the debug/capture code instead of introducing a route-planning abstraction.
- Out:
  - Inventing a city layout DSL.
  - Guaranteeing identical counts across all future terrain presets unless the scenario explicitly requires it.
  - Changing the road validation rules to make screenshots pass.

# Acceptance criteria
- AC1: If a required demo road is refused, the browser console or script output names the rejected label and road type.
- AC2: `scripts/shot.mjs` exits non-zero when `network`, `city`, or `rugged` drops below its declared required counts.
- AC3: The rugged scenario keeps a terrain-specific lower bound while still requiring avenues, a tunnel, and buildings.
- AC4: The implementation is a small wrapper/check around the existing debug API, not a new scenario engine.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: If a required demo road is refused, the browser console or script output names the rejected label and road type.
- request-AC3 -> This backlog slice. Proof: AC2: `scripts/shot.mjs` exits non-zero when `network`, `city`, or `rugged` drops below its declared required counts.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_002_reliable_prototype_validation_and_evidence`
- Architecture decision(s): (none yet)
- Request: `req_004_harden_project_reliability_gates_and_demo_evidence`
- Primary task(s): `task_003_implement_project_reliability_hardening`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
