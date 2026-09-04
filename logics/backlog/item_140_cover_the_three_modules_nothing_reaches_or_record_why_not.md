## item_140_cover_the_three_modules_nothing_reaches_or_record_why_not - Cover the three modules nothing reaches, or record why not
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-04 17:03:45

# AI Context
- Summary: trafficMovers.ts, vehicleModels.ts and hud.ts have no test, directly or in transit. hud.ts is where req_038's innerHTML and CSP rules landed, asserted only by a source grep.
- Keywords: untested modules, hud coverage, mesh catalogue, seam or reason, transitive coverage
- Use when: deciding whether a render or ui module can be tested without a browser.
- Skip when: scene.ts and sim/traffic.ts, which look untested by filename but are exercised through render/traffic.test.ts.

# Problem
- src/render/trafficMovers.ts (717), src/render/vehicleModels.ts (585) and src/ui/hud.ts (221) have no test, directly or in transit.
- hud.ts is the module the CSP and innerHTML rules from req_038 landed in, so its rendering behaviour is asserted only by a grep in tests/architecture.mjs.
- src/render/scene.ts and src/sim/traffic.ts look untested by filename but are exercised through src/render/traffic.test.ts; they are not part of this.

# Scope
- In:
  - A test for each of the three, at whatever level is honest -- pure helpers where they exist, a seam where they do not.
  - A recorded reason where a module genuinely cannot be tested without a browser.
- Out:
  - Extracting a seam for its own sake where the module is a mesh catalogue with nothing to assert.
  - Coverage targets or a coverage gate.
  - src/render/scene.ts and src/sim/traffic.ts, already covered in transit.

# Acceptance criteria
- src/ui/hud.ts, src/render/trafficMovers.ts and src/render/vehicleModels.ts each carry a test or a recorded reason why they cannot.
- The hud rendering rules from req_038 are asserted by a test, not only by a source grep.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: src/ui/hud.ts, src/render/trafficMovers.ts and src/render/vehicleModels.ts each carry a test or a recorded reason why they cannot.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_031_gates_that_check_what_they_claim`
- Architecture decision(s): (none yet)
- Request: `req_040_close_the_gaps_the_0_4_0_corpus_review_found_in_the_gates_that_were_meant_to_catch_them`
- Primary task(s): `task_042_orchestrate_the_review_findings_work`

# Priority
- Priority: Low
- Rationale: Real coverage gaps, but none of them sits on a trust boundary or an assurance; they wait behind everything that does.

# Validation
- 2026-09-04: Added src/ui/hud.test.ts for text rendering and src/render/trafficMovers.test.ts covering trafficMovers with createVehicleModels through Babylon NullEngine. Validated with rtk npm exec -- vitest run src/ui/hud.test.ts src/render/trafficMovers.test.ts and rtk npm run typecheck.

# Tasks
- `task_042_orchestrate_the_review_findings_work`

# Notes
- Task `task_042_orchestrate_the_review_findings_work` was finished via `logics-manager flow finish task` on 2026-09-04.
