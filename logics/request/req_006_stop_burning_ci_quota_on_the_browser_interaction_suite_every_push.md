## req_006_stop_burning_ci_quota_on_the_browser_interaction_suite_every_push - Stop burning CI quota on the browser interaction suite every push
> From version: 0.1.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: `test:e2e` now runs twice per CI push (once inside `npm run ci`, once in the workflow's separate step) and the operator does not have GitHub Actions quota to run a 10-25 minute browser suite on every push at all. De-duplicate the run, move it off the push trigger onto an on-demand/scheduled workflow, and cut the suite's own fixed-sleep time -- without touching the coverage `req_004` already delivered.
- Keywords: CI quota, GitHub Actions minutes, duplicate e2e run, workflow_dispatch, fixed sleeps, waitForTimeout
- Use when: changing when or how often the browser interaction suite runs, or its own wall-clock cost.
- Skip when: changing what the suite asserts, or touching the already-Done `req_004_harden_project_reliability_gates_and_demo_evidence` scope (browser coverage existing, demo strictness, traffic lookup, README evidence).

# Needs
- The Playwright browser interaction suite now runs twice on every push: once inside `npm run ci` (via `scripts/with-dev-server.mjs`, added when the reliability gate work folded `test:e2e` into `ci`), and again in `.github/workflows/ci.yml`'s separate "Browser interaction check" step, which still starts its own dev server and calls `npm run test:e2e` a second time. Doubling a suite that already takes 10-25 minutes under CI's software-rendered, CPU-constrained runner doubles the wasted Actions minutes for zero added coverage.
- The operator does not have enough GitHub Actions quota to run this suite automatically on every push, and has said so directly. A push-triggered job whose Playwright step alone can run 10-25 minutes (confirmed by two consecutive real CI runs, IDs 33217561001 and 33222224210, at 24m0s and 10m3s) is not sustainable at that cadence, even before the duplication above.
- Independent of when the suite runs, `scripts/interact.mjs` spends real wall-clock time in dozens of fixed `page.waitForTimeout(...)` calls standing in for "wait until the UI has settled" -- time that is spent even on a fast, fully passing run and does not shrink on a fast machine, only grows on a slow one.

# Context
- This is a direct follow-up to `req_004_harden_project_reliability_gates_and_demo_evidence` / `task_003_implement_project_reliability_hardening`, both already closed (`req_004_harden_project_reliability_gates_and_demo_evidence` Status: Done). That work correctly added browser coverage to the gate; this request narrows *when* that coverage runs and *how long* it costs, without undoing the coverage itself.
- Duplication evidence: `package.json`'s `ci` script is `npm test && npm run test:architecture && npm run build && npm run test:e2e && npm run logics:validate` (`test:e2e` now runs `node scripts/with-dev-server.mjs scripts/interact.mjs`), while `.github/workflows/ci.yml`'s "Browser interaction check" step independently runs `npm run dev` in the background and then `npm run test:e2e` again after `npm run ci` has already completed -- the same ~90-check Playwright suite executes twice per push.
- Runtime evidence: `scripts/interact.mjs` contains numerous `page.waitForTimeout(60|90|150|160|250|350|500)` calls used to let UI state (grid toggles, sun-hour changes, drag sequences) settle before the next assertion, rather than polling for the specific condition each one is actually waiting on.
- Operator constraint, stated directly in conversation: GitHub Actions quota cannot sustain running this suite on every push; a workflow restructure is wanted, not just a faster suite.

# Acceptance criteria
- AC1: The Playwright browser interaction suite runs at most once per CI job invocation -- the duplication between `npm run ci` and the separate workflow step is resolved by having exactly one of them own it, not both.
- AC2: The browser interaction suite no longer runs automatically on every push to every branch. Unit tests, architecture tests, build, typecheck, and Logics validation continue to run on every push exactly as before; the browser suite runs only on an explicit trigger (`workflow_dispatch` and/or a scheduled cron), documented so the operator knows how to invoke it on demand before a risky change or a release.
- AC3: The push-triggered GitHub Actions job's total runtime returns to roughly what it was before browser interaction was folded into the gate (on the order of 1-2 minutes, not 10-25).
- AC4: `scripts/interact.mjs` replaces fixed `page.waitForTimeout(...)` calls that exist purely to let UI state settle with condition-based waits (poll until the expected state is true, bounded by a generous timeout), so a passing run finishes faster than today's fixed-sleep total without weakening any assertion.
- AC5: This request does not remove or weaken any existing check's assertions, and does not reopen or duplicate the already-Done `req_004` / `task_003` scope (browser coverage existing, demo strictness, traffic lookup, README evidence).

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_003_ci_that_respects_a_limited_actions_budget`
- Architecture decision(s): (none yet)

# References
- .github/workflows/ci.yml
- package.json
- scripts/with-dev-server.mjs
- scripts/interact.mjs
- logics/request/req_004_harden_project_reliability_gates_and_demo_evidence.md
- logics/tasks/task_003_implement_project_reliability_hardening.md

# Backlog
- `item_017_stop_the_browser_interaction_suite_from_running_twice_per_push`
- `item_018_move_the_browser_interaction_suite_off_the_push_trigger`
- `item_019_replace_fixed_ui_settle_sleeps_with_condition_polling_in_the_interaction_script`
