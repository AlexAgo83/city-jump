## task_015_make_the_project_s_documents_and_input_model_match_the_public_deployment - Make the project's documents and input model match the public deployment
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:32:32
> Owner: codex

# AI Context
- Summary: Orchestration for req_013: correct SECURITY.md against the real deployment, record the shared-link threat-model review before the share feature ships, and take a written position on touch devices.
- Keywords: project, documents, input, model, match, public, deployment
- Use when: Implementing any of the three backlog slices under req_013, in the plan's order.
- Skip when: The change adds server-side infrastructure, or is a mobile redesign or accessibility conformance effort.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Read this request and its three backlog slices, plus adr_004_stay_a_static_client_with_no_server_of_its_own, which is what the corrected security policy should point at.
- [x] 2. Correct SECURITY.md first: it is the document most likely to be read by someone deciding whether a finding matters.
- [x] 3. Write the threat-model review for shared links, and link it from both the policy and the share request. It must land before the share feature is *started*, not merely before release: its cap list and refusal rules are the specification the share encoder is built against.
- [x] 4. Take the touch decision, write it down, and put it where a visitor meets it before failing.
- [x] 5. Run the fast gate; confirm no accessibility markup was lost if the touch work touched the UI.
- [x] 6. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [x] 7. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_046_make_security_md_describe_the_deployment_that_exists`
- `item_047_record_the_threat_model_review_that_shared_links_require`
- `item_048_take_a_position_on_the_visitors_arriving_with_a_touchscreen`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in ada25ac: SECURITY.md now describes the Render static deployment and localStorage trust boundary, docs/shared-link-threat-model.md records fragment and size-cap rules for shared links, README/index.html state the desktop build-tool position, and scripts/interact.mjs verifies the coarse-pointer notice while the interaction flow still passes. Source: `ada25ac`
- request-AC3 -> This task. Proof: Implemented in ada25ac: SECURITY.md now describes the Render static deployment and localStorage trust boundary, docs/shared-link-threat-model.md records fragment and size-cap rules for shared links, README/index.html state the desktop build-tool position, and scripts/interact.mjs verifies the coarse-pointer notice while the interaction flow still passes. Source: `ada25ac`
- request-AC2 -> This task. Proof: Implemented in ada25ac: SECURITY.md now describes the Render static deployment and localStorage trust boundary, docs/shared-link-threat-model.md records fragment and size-cap rules for shared links, README/index.html state the desktop build-tool position, and scripts/interact.mjs verifies the coarse-pointer notice while the interaction flow still passes. Source: `ada25ac`
- request-AC4 -> This task. Proof: Implemented in ada25ac: SECURITY.md now describes the Render static deployment and localStorage trust boundary, docs/shared-link-threat-model.md records fragment and size-cap rules for shared links, README/index.html state the desktop build-tool position, and scripts/interact.mjs verifies the coarse-pointer notice while the interaction flow still passes. Source: `ada25ac`
- request-AC5 -> This task. Proof: Implemented in ada25ac: SECURITY.md now describes the Render static deployment and localStorage trust boundary, docs/shared-link-threat-model.md records fragment and size-cap rules for shared links, README/index.html state the desktop build-tool position, and scripts/interact.mjs verifies the coarse-pointer notice while the interaction flow still passes. Source: `ada25ac`

# Validation
- (no validation recorded yet)
- npm run ci passed on 2026-08-30: 144 vitest tests, 3 architecture tests, build/typecheck, lint and audit passed. npm run test:e2e passed on 2026-08-30: coarse pointer notice and all interaction checks passed.
- Finish workflow executed on 2026-08-30.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-30.
- Linked backlog item(s): `item_046_make_security_md_describe_the_deployment_that_exists`, `item_047_record_the_threat_model_review_that_shared_links_require`, `item_048_take_a_position_on_the_visitors_arriving_with_a_touchscreen`
- Related request(s): `req_013_the_game_is_deployed_in_public_while_its_documents_and_its_input_model_still_describe_a_local_dev_toy`

# Links
- Request: `req_013_the_game_is_deployed_in_public_while_its_documents_and_its_input_model_still_describe_a_local_dev_toy`
- Product brief(s): `prod_010_a_published_game_whose_documents_tell_the_truth`
- Architecture decision(s): `adr_004_stay_a_static_client_with_no_server_of_its_own`
