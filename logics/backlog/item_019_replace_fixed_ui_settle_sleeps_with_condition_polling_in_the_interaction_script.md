## item_019_replace_fixed_ui_settle_sleeps_with_condition_polling_in_the_interaction_script - Replace fixed UI-settle sleeps with condition polling in the interaction script
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
- Summary: Dozens of `page.waitForTimeout(...)` calls in `scripts/interact.mjs` stand in for "wait until the UI has settled" and spend that fixed real time even on a fast, fully passing run. Replace those specific ones with condition-based polling; leave alone any wait that is deliberately timing real elapsed behavior (sun auto-cycle, traffic movement, ocean animation).
- Keywords: waitForTimeout, waitForFunction, condition polling, interaction script
- Use when: touching `scripts/interact.mjs`'s waits.
- Skip when: the duplicate-run fix (`item_017`) or the push-trigger restructure (`item_018`) -- separate sibling slices; also skip the sun-auto-cycle timing logic already fixed in commit `cc06ca8`.

# Problem
- `scripts/interact.mjs` uses fixed `page.waitForTimeout(...)` calls (60-500ms each, dozens of call sites) to let UI state settle before the next assertion, spending that real time even when the condition is already true much sooner.

# Scope
- In:
  - Replace `waitForTimeout` calls that exist purely to let a specific UI state settle (a value change, a toggle, a rebuild finishing) with a condition-based wait (e.g. `page.waitForFunction` or an equivalent poll) bounded by a generous timeout.
  - Leave in place any wait that is deliberately timing a real animation or measuring elapsed-time behavior (e.g. the sun auto-cycle, traffic movement, ocean animation checks), since those need real time to elapse by design.
- Out:
  - Changing what any check asserts.
  - The auto-cycle timing fix already delivered in commit `cc06ca8` -- this item is about removing unnecessary fixed sleeps, not revisiting that logic again.

# Acceptance criteria
- AC1: Every `waitForTimeout` call remaining in the script is one that is deliberately timing real elapsed behavior, not standing in for a condition that could be polled instead.
- AC2: A full local run of `scripts/interact.mjs` passes with the same checks and finishes in less wall-clock time than before this change, on the same machine.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Every `waitForTimeout` call remaining in the script is one that is deliberately timing real elapsed behavior, not standing in for a condition that could be polled instead.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_003_ci_that_respects_a_limited_actions_budget`
- Architecture decision(s): (none yet)
- Request: `req_006_stop_burning_ci_quota_on_the_browser_interaction_suite_every_push`
- Primary task(s): `task_008_implement_ci_quota_reduction_for_the_browser_interaction_suite`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
