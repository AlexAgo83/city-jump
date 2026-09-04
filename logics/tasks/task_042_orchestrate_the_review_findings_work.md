## task_042_orchestrate_the_review_findings_work - Orchestrate the review-findings work
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 70%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex
> Indicators reviewed: 2026-09-04 16:53:38

# AI Context
- Summary: Seven slices from the 0.4.0 corpus review: settle the shared-link cap, repair the mis-cited AC, measure the module budget, test the link import path, unify action pinning, cover three modules, clear the lint and audit baseline.
- Keywords: review findings, shared link cap, AC repair, size budget, import path test, action pinning, lint baseline
- Use when: implementing the 0.4.0 review findings, in the order the plan sets.
- Skip when: reopening req_006's CI trigger decision or req_038's parseCity and cache-header findings.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Settle the shared-link cap first: decide the number against a real large city, align code and document, and assert it in tests/architecture.mjs.
- [ ] 2. Repair the req_039 AC1 traceability line through the CLI, so the corpus stops recording an unmeasured budget as met.
- [ ] 3. Add the module size test, then record a reason or fall under the budget for each of the six oversized modules.
- [ ] 4. Give the shared-link import path in src/ui/controls.ts its test, keeping the dry-run replay and the loadCity catch intact.
- [ ] 5. Unify action pinning across both workflows and widen the architecture assertion to the whole workflow directory.
- [ ] 6. Cover hud.ts, trafficMovers.ts and vehicleModels.ts, or record why a module cannot be reached.
- [ ] 7. Close with the gathered one-line fixes, then verify with npm run ci.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_136_make_the_shared_link_decompression_cap_the_number_the_threat_model_states`
- `item_137_give_src_a_module_size_budget_that_something_measures`
- `item_138_repair_the_traceability_line_that_closed_req_039_ac1_with_another_criterion_s_proof`
- `item_139_test_the_sequence_that_turns_a_shared_link_into_a_saved_city`
- `item_140_cover_the_three_modules_nothing_reaches_or_record_why_not`
- `item_141_pin_third_party_actions_the_same_way_in_every_workflow`
- `item_142_the_fixes_whose_record_is_the_change_itself`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_136_make_the_shared_link_decompression_cap_the_number_the_threat_model_states`. Proof deferred to slice closeout.
- request-AC2 -> `item_137_give_src_a_module_size_budget_that_something_measures`. Proof deferred to slice closeout.
- request-AC3 -> `item_138_repair_the_traceability_line_that_closed_req_039_ac1_with_another_criterion_s_proof`. Proof deferred to slice closeout.
- request-AC4 -> `item_139_test_the_sequence_that_turns_a_shared_link_into_a_saved_city`. Proof deferred to slice closeout.
- request-AC5 -> `item_140_cover_the_three_modules_nothing_reaches_or_record_why_not`. Proof deferred to slice closeout.
- request-AC6 -> `item_141_pin_third_party_actions_the_same_way_in_every_workflow`. Proof deferred to slice closeout.
- request-AC7 -> `item_142_the_fixes_whose_record_is_the_change_itself`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_040_close_the_gaps_the_0_4_0_corpus_review_found_in_the_gates_that_were_meant_to_catch_them`
- Product brief(s): `prod_031_gates_that_check_what_they_claim`
- Architecture decision(s): (none yet)
