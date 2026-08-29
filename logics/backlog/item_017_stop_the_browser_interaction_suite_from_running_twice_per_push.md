## item_017_stop_the_browser_interaction_suite_from_running_twice_per_push - Stop the browser interaction suite from running twice per push
> From version: 0.1.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-29 10:47:35

# AI Context
- Summary: `npm run ci` runs `test:e2e` via `scripts/with-dev-server.mjs`, and the workflow's own "Browser interaction check" step separately starts a dev server and runs `npm run test:e2e` again -- the same ~90-check suite executes twice per push. Make exactly one path own it.
- Keywords: duplicate e2e run, npm run ci, with-dev-server, workflow step
- Use when: touching `package.json`'s `ci` script or `.github/workflows/ci.yml`'s browser-check step.
- Skip when: deciding when the suite triggers (`item_018`) or its own sleep cost (`item_019`) -- separate sibling slices.

# Problem
- `npm run ci` now runs `test:e2e` via `scripts/with-dev-server.mjs`, and `.github/workflows/ci.yml`'s "Browser interaction check" step independently starts a dev server and runs `npm run test:e2e` again -- the same suite executes twice per CI job.

# Scope
- In:
  - Remove the duplicate execution so the browser suite runs exactly once per job that requests it -- either by having `npm run ci` no longer include `test:e2e` (moved to AC2's separate trigger) or by removing the workflow's redundant manual step, whichever pairs correctly with the AC2 restructure.
- Out:
  - Changing what the suite asserts.
  - Changing the unit/architecture/build/typecheck/logics steps that already run once and are not duplicated.

# Acceptance criteria
- AC1: A single CI job invocation runs `scripts/interact.mjs` at most once, verified by checking the workflow log for exactly one occurrence of the suite's checks.
- AC2: No existing check's assertions changed, and req_004/task_003's already-Done scope (browser coverage, demo strictness, traffic lookup, README evidence) is not reopened or duplicated.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A single CI job invocation runs `scripts/interact.mjs` at most once, verified by checking the workflow log for exactly one occurrence of the suite's checks.
- request-AC5 -> This backlog slice. Proof: AC2: No existing check's assertions changed, and req_004/task_003's already-Done scope (browser coverage, demo strictness, traffic lookup, README evidence) is not reopened or duplicated.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_003_ci_that_respects_a_limited_actions_budget`
- Architecture decision(s): (none yet)
- Request: `req_006_stop_burning_ci_quota_on_the_browser_interaction_suite_every_push`
- Primary task(s): `task_008_implement_ci_quota_reduction_for_the_browser_interaction_suite`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_008_implement_ci_quota_reduction_for_the_browser_interaction_suite`

# Notes
- Task `task_008_implement_ci_quota_reduction_for_the_browser_interaction_suite` was finished via `logics-manager flow finish task` on 2026-08-29.
