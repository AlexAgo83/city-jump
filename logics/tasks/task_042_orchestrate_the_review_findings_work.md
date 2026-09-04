## task_042_orchestrate_the_review_findings_work - Orchestrate the review-findings work
> From version: 0.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex
> Indicators reviewed: 2026-09-04 17:18:26

# AI Context
- Summary: Seven slices from the 0.4.0 corpus review: settle the shared-link cap, repair the mis-cited AC, measure the module budget, test the link import path, unify action pinning, cover three modules, clear the lint and audit baseline.
- Keywords: review findings, shared link cap, AC repair, size budget, import path test, action pinning, lint baseline
- Use when: implementing the 0.4.0 review findings, in the order the plan sets.
- Skip when: reopening req_006's CI trigger decision or req_038's parseCity and cache-header findings.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Settle the shared-link cap first: decide the number against a real large city, align code and document, and assert it in tests/architecture.mjs.
- [x] 2. Repair the req_039 AC1 traceability line through the CLI, so the corpus stops recording an unmeasured budget as met.
- [x] 3. Add the module size test, then record a reason or fall under the budget for each of the six oversized modules.
- [x] 4. Give the shared-link import path in src/ui/controls.ts its test, keeping the dry-run replay and the loadCity catch intact.
- [x] 5. Unify action pinning across both workflows and widen the architecture assertion to the whole workflow directory.
- [x] 6. Cover hud.ts, trafficMovers.ts and vehicleModels.ts, or record why a module cannot be reached.
- [x] 7. Close with the gathered one-line fixes, then verify with npm run ci.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_136_make_the_shared_link_decompression_cap_the_number_the_threat_model_states`
- `item_137_give_src_a_module_size_budget_that_something_measures`
- `item_138_repair_the_traceability_line_that_closed_req_039_ac1_with_another_criterion_s_proof`
- `item_139_test_the_sequence_that_turns_a_shared_link_into_a_saved_city`
- `item_140_cover_the_three_modules_nothing_reaches_or_record_why_not`
- `item_141_pin_third_party_actions_the_same_way_in_every_workflow`
- `item_142_the_fixes_whose_record_is_the_change_itself`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_136_make_the_shared_link_decompression_cap_the_number_the_threat_model_states`. Proof: `ddef430` aligned docs/shared-link-threat-model.md with `MAX_SHARE_JSON = 1_000_000` and added the architecture check that fails if they diverge.
- request-AC2 -> `item_137_give_src_a_module_size_budget_that_something_measures`. Proof: `ca7fd93` added the source module-size architecture gate and recorded `ponytail: module-size` reasons on the oversized modules.
- request-AC3 -> `item_138_repair_the_traceability_line_that_closed_req_039_ac1_with_another_criterion_s_proof`. Proof: `571cd0a` corrected task_041's request-AC1 traceability to point at the module-size work instead of the disposal slice.
- request-AC4 -> `item_139_test_the_sequence_that_turns_a_shared_link_into_a_saved_city`. Proof: `75f873b` added controls import-flow coverage for good, malformed, oversized, and non-applied shared links.
- request-AC5 -> `item_140_cover_the_three_modules_nothing_reaches_or_record_why_not`. Proof: `299fcb0` added HUD and traffic mover/model coverage for the previously untested surfaces.
- request-AC6 -> `item_141_pin_third_party_actions_the_same_way_in_every_workflow`. Proof: `846086d` pinned workflow actions by SHA and added the architecture gate across workflow `uses:` entries.
- request-AC7 -> `item_142_the_fixes_whose_record_is_the_change_itself`. Proof: `579098a` cleared lint warnings and stale code anchors, then validated lint, typecheck, scenarios, and Logics audit.

# Validation
- (no validation recorded yet)
- rtk npm run ci passed on 2026-09-04: check:versions OK, biome lint no warnings, 49 vitest files / 326 tests passed, 16 architecture tests passed, scenarios passed, build/typecheck passed, logics validate passed.
- Finish workflow executed on 2026-09-04.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-09-04.
- Linked backlog item(s): `item_136_make_the_shared_link_decompression_cap_the_number_the_threat_model_states`, `item_137_give_src_a_module_size_budget_that_something_measures`, `item_138_repair_the_traceability_line_that_closed_req_039_ac1_with_another_criterion_s_proof`, `item_139_test_the_sequence_that_turns_a_shared_link_into_a_saved_city`, `item_140_cover_the_three_modules_nothing_reaches_or_record_why_not`, `item_141_pin_third_party_actions_the_same_way_in_every_workflow`, `item_142_the_fixes_whose_record_is_the_change_itself`
- Related request(s): `req_040_close_the_gaps_the_0_4_0_corpus_review_found_in_the_gates_that_were_meant_to_catch_them`

# Links
- Request: `req_040_close_the_gaps_the_0_4_0_corpus_review_found_in_the_gates_that_were_meant_to_catch_them`
- Product brief(s): `prod_031_gates_that_check_what_they_claim`
- Architecture decision(s): (none yet)
