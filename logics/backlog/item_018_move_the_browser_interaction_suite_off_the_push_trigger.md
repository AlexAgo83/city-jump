## item_018_move_the_browser_interaction_suite_off_the_push_trigger - Move the browser interaction suite off the push trigger
> From version: 0.1.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The push-triggered workflow runs the full ~10-25 minute browser suite on every push, which the operator does not have GitHub Actions quota for. Split it: push keeps the fast gate only; a separate on-demand/scheduled workflow owns the browser suite.
- Keywords: workflow_dispatch, scheduled workflow, GitHub Actions quota, push trigger
- Use when: restructuring `.github/workflows/ci.yml` or adding a new workflow file for the browser suite.
- Skip when: the duplicate-run fix (`item_017`) or the suite's own sleep cost (`item_019`) -- separate sibling slices.

# Problem
- The browser suite currently runs on every push via `.github/workflows/ci.yml`, costing 10-25 minutes of GitHub Actions time the operator does not have quota for.
- There is no documented way to run the full browser check on demand without pushing.

# Scope
- In:
  - Split the push-triggered workflow so it only runs the fast local gate (`npm test`, architecture, build, typecheck, Logics validation) -- no dev server, no Playwright.
  - Add a separate, explicitly-triggered workflow (manual `workflow_dispatch`, and/or a scheduled cron) that runs the browser interaction suite.
  - Document (README or CONTRIBUTING) how to trigger the browser check manually and when the operator should.
- Out:
  - Changing the suite's own assertions.
  - Self-hosted runners or any paid CI tier.

# Acceptance criteria
- AC1: A push to any branch runs only the fast gate; its total job runtime is on the order of 1-2 minutes.
- AC2: A separate workflow exists that runs the browser interaction suite, triggerable manually and/or on a schedule, and its name and trigger are documented for the operator.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: A push to any branch runs only the fast gate; its total job runtime is on the order of 1-2 minutes.
- request-AC3 -> This backlog slice. Proof: AC2: A separate workflow exists that runs the browser interaction suite, triggerable manually and/or on a schedule, and its name and trigger are documented for the operator.

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
