## prod_003_ci_that_respects_a_limited_actions_budget - CI that respects a limited Actions budget
> Date: 2026-08-29
> Status: Proposed
> Related request: `req_006_stop_burning_ci_quota_on_the_browser_interaction_suite_every_push`
> Related backlog: `item_017_stop_the_browser_interaction_suite_from_running_twice_per_push`, `item_018_move_the_browser_interaction_suite_off_the_push_trigger`, `item_019_replace_fixed_ui_settle_sleeps_with_condition_polling_in_the_interaction_script`
> Related task: `task_008_implement_ci_quota_reduction_for_the_browser_interaction_suite`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
The reliability hardening work in `req_004_harden_project_reliability_gates_and_demo_evidence` correctly proved the browser interaction path is part of the trusted gate, but folded it into every push without accounting for how expensive that suite is on a software-rendered, CPU-constrained shared runner, or that GitHub Actions minutes are a real, limited operator resource. This product slice keeps the coverage but changes when it runs and how long it costs, so the project can keep shipping without running out of CI quota.

# Goals
- Every push still gets a fast, cheap gate: unit, architecture, build, typecheck, Logics validation.
- The browser interaction suite stays available and trustworthy, run on demand or on a schedule instead of on every push.
- The suite itself costs less wall-clock time per run, independent of when it is triggered.
- The operator can tell, from the workflow file alone, how to run the full browser check before something that actually needs it.

# Non-goals
- Removing browser interaction coverage from the project.
- Reopening the already-Done demo-strictness, traffic-lookup, or README-evidence scope from req_004.
- Adding a new test framework, a self-hosted runner, or paid CI infrastructure.
- Changing gameplay features.

# Scope and guardrails
- In: when and how often the browser interaction suite runs, and its own wall-clock cost.
- Out: what the suite asserts, the demo-strictness/traffic-lookup/README-evidence work already delivered by `req_004`, and any new CI infrastructure beyond GitHub Actions' existing free triggers (`workflow_dispatch`, `schedule`).

# Key product decisions
- Coverage stays; cadence changes. The browser suite is not weakened or removed, only moved off the automatic push trigger.
- Prefer GitHub Actions' built-in triggers (manual dispatch, cron) over new infrastructure -- this is a quota problem, not a tooling gap.

# Success signals
- A push's CI job runtime returns to roughly what it was before browser interaction was folded into the gate.
- The operator can find and run the full browser check on demand without needing to ask how.

# References
- Product back-reference: `req_006_stop_burning_ci_quota_on_the_browser_interaction_suite_every_push`
- Task back-reference: `task_008_implement_ci_quota_reduction_for_the_browser_interaction_suite`
