## task_015_make_the_project_s_documents_and_input_model_match_the_public_deployment - Make the project's documents and input model match the public deployment
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 40%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:28:52
> Owner: codex

# AI Context
- Summary: Orchestration for req_013: correct SECURITY.md against the real deployment, record the shared-link threat-model review before the share feature ships, and take a written position on touch devices.
- Keywords: project, documents, input, model, match, public, deployment
- Use when: Implementing any of the three backlog slices under req_013, in the plan's order.
- Skip when: The change adds server-side infrastructure, or is a mobile redesign or accessibility conformance effort.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Read this request and its three backlog slices, plus adr_004_stay_a_static_client_with_no_server_of_its_own, which is what the corrected security policy should point at.
- [ ] 2. Correct SECURITY.md first: it is the document most likely to be read by someone deciding whether a finding matters.
- [ ] 3. Write the threat-model review for shared links, and link it from both the policy and the share request. It must land before the share feature is *started*, not merely before release: its cap list and refusal rules are the specification the share encoder is built against.
- [ ] 4. Take the touch decision, write it down, and put it where a visitor meets it before failing.
- [ ] 5. Run the fast gate; confirm no accessibility markup was lost if the touch work touched the UI.
- [ ] 6. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [ ] 7. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_046_make_security_md_describe_the_deployment_that_exists`
- `item_047_record_the_threat_model_review_that_shared_links_require`
- `item_048_take_a_position_on_the_visitors_arriving_with_a_touchscreen`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_046_make_security_md_describe_the_deployment_that_exists`. Proof deferred to slice closeout.
- request-AC3 -> `item_046_make_security_md_describe_the_deployment_that_exists`. Proof deferred to slice closeout.
- request-AC2 -> `item_047_record_the_threat_model_review_that_shared_links_require`. Proof deferred to slice closeout.
- request-AC4 -> `item_048_take_a_position_on_the_visitors_arriving_with_a_touchscreen`. Proof deferred to slice closeout.
- request-AC5 -> `item_048_take_a_position_on_the_visitors_arriving_with_a_touchscreen`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_013_the_game_is_deployed_in_public_while_its_documents_and_its_input_model_still_describe_a_local_dev_toy`
- Product brief(s): `prod_010_a_published_game_whose_documents_tell_the_truth`
- Architecture decision(s): `adr_004_stay_a_static_client_with_no_server_of_its_own`
