## task_003_implement_project_reliability_hardening - Implement project reliability hardening
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-29 10:14:53
> Owner: Codex

# AI Context
- Summary: Orchestrate the four reliability backlog slices from `req_004`: browser gate, strict demo screenshots, traffic lookup, and README evidence.
- Keywords: project reliability implementation, browser gate, strict screenshots, traffic lookup, README evidence
- Use when: starting implementation for `req_004_harden_project_reliability_gates_and_demo_evidence`.
- Skip when: implementing the separate road-crossing request or unrelated city simulation features.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Read `req_003` plus the generated backlog items and confirm the road-crossing request remains out of scope.
- [ ] 2. Implement the validation script path first, because later changes should use the stricter gate.
- [ ] 3. Make debug demo road creation and screenshot scenarios strict, then regenerate only affected documentation media if required.
- [ ] 4. Replace the traffic per-frame segment scan with the smallest stored-reference or lookup-map change.
- [ ] 5. Refresh README status and measured evidence from the current command output.
- [ ] 6. Run the full local gate, Logics validation, and closeout commands before finishing.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_009_include_browser_interaction_in_the_normal_validation_gate`
- `item_010_make_demo_and_screenshot_scenarios_fail_loudly`
- `item_011_avoid_per_car_full_graph_scans_in_traffic_updates`
- `item_012_refresh_readme_feature_status_and_measured_evidence`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_009_include_browser_interaction_in_the_normal_validation_gate`. Proof deferred to slice closeout.
- request-AC6 -> `item_009_include_browser_interaction_in_the_normal_validation_gate`. Proof deferred to slice closeout.
- request-AC2 -> `item_010_make_demo_and_screenshot_scenarios_fail_loudly`. Proof deferred to slice closeout.
- request-AC3 -> `item_010_make_demo_and_screenshot_scenarios_fail_loudly`. Proof deferred to slice closeout.
- request-AC4 -> `item_011_avoid_per_car_full_graph_scans_in_traffic_updates`. Proof deferred to slice closeout.
- request-AC5 -> `item_012_refresh_readme_feature_status_and_measured_evidence`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_004_harden_project_reliability_gates_and_demo_evidence`
- Product brief(s): `prod_002_reliable_prototype_validation_and_evidence`
- Architecture decision(s): (none yet)
