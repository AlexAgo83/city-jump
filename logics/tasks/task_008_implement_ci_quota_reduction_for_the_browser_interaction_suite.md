## task_008_implement_ci_quota_reduction_for_the_browser_interaction_suite - Implement CI quota reduction for the browser interaction suite
> From version: 0.1.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-08-29 10:47:35

# AI Context
- Summary: Orchestrate three slices: stop running the browser suite twice per push, move it off the push trigger onto an on-demand/scheduled workflow, and replace unnecessary fixed sleeps in the interaction script -- all without reopening the already-Done `req_004`/`task_003` reliability-gate scope.
- Keywords: CI quota, workflow restructure, duplicate e2e run, condition polling
- Use when: starting implementation for `req_006_stop_burning_ci_quota_on_the_browser_interaction_suite_every_push`.
- Skip when: implementing the sibling reliability-hardening or road-crossing tasks, or revisiting the sun-auto-cycle timing fix already delivered in commit `cc06ca8`.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Read this request and its three backlog slices; confirm req_004/task_003 remain untouched and Done.
- [x] 2. Fix the duplicate execution first, since the restructure in the next step depends on knowing which invocation path owns the suite.
- [x] 3. Split the GitHub Actions workflow: push trigger keeps the fast gate only; add the separate on-demand/scheduled workflow for the browser suite; update README/CONTRIBUTING with how to trigger it.
- [x] 4. Replace unnecessary fixed sleeps in scripts/interact.mjs with condition-based waits, leaving real-time-dependent waits alone.
- [x] 5. Run the fast gate locally, then run the full browser suite locally (or via the new on-demand workflow) to confirm both pass and the fast gate's job runtime is back to ~1-2 minutes.
- [x] 6. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [x] 7. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_017_stop_the_browser_interaction_suite_from_running_twice_per_push`
- `item_018_move_the_browser_interaction_suite_off_the_push_trigger`
- `item_019_replace_fixed_ui_settle_sleeps_with_condition_polling_in_the_interaction_script`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in d2a20af; npm run ci is now the fast push gate without test:e2e, Browser Interaction is a separate workflow_dispatch/weekly workflow, and scripts/interact.mjs replaced UI-settle waitForTimeout calls with condition polling while real elapsed-time checks use realTime. Validated with YAML parse, npm run typecheck, npm run test:e2e, timed old script at 51.31s vs current at 25.67s, and npm run ci. Source: `d2a20af`
- request-AC5 -> This task. Proof: Implemented in d2a20af; npm run ci is now the fast push gate without test:e2e, Browser Interaction is a separate workflow_dispatch/weekly workflow, and scripts/interact.mjs replaced UI-settle waitForTimeout calls with condition polling while real elapsed-time checks use realTime. Validated with YAML parse, npm run typecheck, npm run test:e2e, timed old script at 51.31s vs current at 25.67s, and npm run ci. Source: `d2a20af`
- request-AC2 -> This task. Proof: Implemented in d2a20af; npm run ci is now the fast push gate without test:e2e, Browser Interaction is a separate workflow_dispatch/weekly workflow, and scripts/interact.mjs replaced UI-settle waitForTimeout calls with condition polling while real elapsed-time checks use realTime. Validated with YAML parse, npm run typecheck, npm run test:e2e, timed old script at 51.31s vs current at 25.67s, and npm run ci. Source: `d2a20af`
- request-AC3 -> This task. Proof: Implemented in d2a20af; npm run ci is now the fast push gate without test:e2e, Browser Interaction is a separate workflow_dispatch/weekly workflow, and scripts/interact.mjs replaced UI-settle waitForTimeout calls with condition polling while real elapsed-time checks use realTime. Validated with YAML parse, npm run typecheck, npm run test:e2e, timed old script at 51.31s vs current at 25.67s, and npm run ci. Source: `d2a20af`
- request-AC4 -> This task. Proof: Implemented in d2a20af; npm run ci is now the fast push gate without test:e2e, Browser Interaction is a separate workflow_dispatch/weekly workflow, and scripts/interact.mjs replaced UI-settle waitForTimeout calls with condition polling while real elapsed-time checks use realTime. Validated with YAML parse, npm run typecheck, npm run test:e2e, timed old script at 51.31s vs current at 25.67s, and npm run ci. Source: `d2a20af`

# Validation
- (no validation recorded yet)
- command: `ruby -e 'require "yaml"; ARGV.each { |f| YAML.load_file(f) }' .github/workflows/ci.yml .github/workflows/browser-interaction.yml; npm run typecheck; npm run test:e2e; npm run ci` | result: passed | date: 2026-08-29
- Finish workflow executed on 2026-08-29.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-29.
- Linked backlog item(s): `item_017_stop_the_browser_interaction_suite_from_running_twice_per_push`, `item_018_move_the_browser_interaction_suite_off_the_push_trigger`, `item_019_replace_fixed_ui_settle_sleeps_with_condition_polling_in_the_interaction_script`
- Related request(s): `req_006_stop_burning_ci_quota_on_the_browser_interaction_suite_every_push`

# Links
- Request: `req_006_stop_burning_ci_quota_on_the_browser_interaction_suite_every_push`
- Product brief(s): `prod_003_ci_that_respects_a_limited_actions_budget`
- Architecture decision(s): (none yet)
