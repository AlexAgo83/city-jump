## task_013_implement_sharing_a_city_by_link - Implement sharing a city by link
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:17:39
> Owner: codex

# AI Context
- Summary: Orchestration for req_011: take the shared-link threat-model review as the encoder's specification, build the quantising encoder and the capped decoder, then the Share button and its refusal, then the arrival flow, then the round trip in the browser suite.
- Keywords: implement, sharing, city, link
- Use when: Implementing any of the three backlog slices under req_011, in the plan's order — the encoder comes first.
- Skip when: The change needs a server, alters the local save format, or is about exporting a file rather than a link.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.
- `run_006_change_what_a_save_contains_without_losing_the_player_s_city` applies here even though this task does not change the save format: a shared payload is the same untrusted JSON, `parseCity` is the same trust boundary, and the same version rule decides what a link from another build may do.
- Sequencing against the sibling tasks:
  - `task_009_implement_the_load_rollback_and_rendering_hygiene_review_findings` makes a failed load a no-op instead of a destructive one. Land it first: importing and loading a stranger's city is exactly the path where a refused replay must not destroy what the receiver already had.
  - `task_012_implement_street_names_building_addresses_and_the_extended_detail_panel` adds a field to the save format and therefore changes what a shared payload contains. It does not conflict, but land it before this task so the encoder is written against the final shape rather than being revisited.

# Plan
- [x] 1. Read this request and its three backlog slices, plus run_006_change_what_a_save_contains_without_losing_the_player_s_city -- a shared payload is the same untrusted JSON as a save, and the same version rules apply.
- [x] 2. Take the threat-model review from `task_015_make_the_project_s_documents_and_input_model_match_the_public_deployment` as this task's input: its cap list and refusal rules are the encoder's specification. Do not start the encoder before it exists.
- [x] 3. Build the encoder and decoder against that review, with the size caps and the quantisation, and prove against `public/default-demo.json` that a Demo-sized city fits.
- [x] 3. Add the Share button and its refusal path.
- [x] 4. Add the arrival flow: import prompt, collision handling, load offer, fragment cleanup.
- [x] 5. Extend the browser interaction suite with the share-arrive-import round trip.
- [x] 6. Run the fast gate, then the browser interaction and visual checks; confirm Save, Load and Delete are unchanged.
- [x] 7. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [x] 8. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_039_turn_a_city_into_a_link_sized_payload_and_read_one_back_safely`
- `item_040_add_the_share_button_to_the_saves_panel`
- `item_041_offer_to_import_the_city_when_someone_arrives_on_a_share_link`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC2 -> This task. Proof: Implemented in de91b05 and 672cac7: share links are static URL fragments built with browser gzip/base64url, capped and validated on decode, copied from the Saves panel, imported on arrival without a server, preserve the receiver's existing saves through confirm/copy-name prompts, load on confirmation, and remove the fragment after handling. Validated with npm test -- --run src/sim/share.test.ts src/sim/save.test.ts, npm run typecheck, npm run test:e2e, and npm run ci. Source: `672cac7`
- request-AC3 -> This task. Proof: Implemented in de91b05 and 672cac7: share links are static URL fragments built with browser gzip/base64url, capped and validated on decode, copied from the Saves panel, imported on arrival without a server, preserve the receiver's existing saves through confirm/copy-name prompts, load on confirmation, and remove the fragment after handling. Validated with npm test -- --run src/sim/share.test.ts src/sim/save.test.ts, npm run typecheck, npm run test:e2e, and npm run ci. Source: `672cac7`
- request-AC5 -> This task. Proof: Implemented in de91b05 and 672cac7: share links are static URL fragments built with browser gzip/base64url, capped and validated on decode, copied from the Saves panel, imported on arrival without a server, preserve the receiver's existing saves through confirm/copy-name prompts, load on confirmation, and remove the fragment after handling. Validated with npm test -- --run src/sim/share.test.ts src/sim/save.test.ts, npm run typecheck, npm run test:e2e, and npm run ci. Source: `672cac7`
- request-AC6 -> This task. Proof: Implemented in de91b05 and 672cac7: share links are static URL fragments built with browser gzip/base64url, capped and validated on decode, copied from the Saves panel, imported on arrival without a server, preserve the receiver's existing saves through confirm/copy-name prompts, load on confirmation, and remove the fragment after handling. Validated with npm test -- --run src/sim/share.test.ts src/sim/save.test.ts, npm run typecheck, npm run test:e2e, and npm run ci. Source: `672cac7`
- request-AC1 -> This task. Proof: Implemented in de91b05 and 672cac7: share links are static URL fragments built with browser gzip/base64url, capped and validated on decode, copied from the Saves panel, imported on arrival without a server, preserve the receiver's existing saves through confirm/copy-name prompts, load on confirmation, and remove the fragment after handling. Validated with npm test -- --run src/sim/share.test.ts src/sim/save.test.ts, npm run typecheck, npm run test:e2e, and npm run ci. Source: `672cac7`
- request-AC2 -> This task. Proof: Implemented in de91b05 and 672cac7: share links are static URL fragments built with browser gzip/base64url, capped and validated on decode, copied from the Saves panel, imported on arrival without a server, preserve the receiver's existing saves through confirm/copy-name prompts, load on confirmation, and remove the fragment after handling. Validated with npm test -- --run src/sim/share.test.ts src/sim/save.test.ts, npm run typecheck, npm run test:e2e, and npm run ci. Source: `672cac7`
- request-AC7 -> This task. Proof: Implemented in de91b05 and 672cac7: share links are static URL fragments built with browser gzip/base64url, capped and validated on decode, copied from the Saves panel, imported on arrival without a server, preserve the receiver's existing saves through confirm/copy-name prompts, load on confirmation, and remove the fragment after handling. Validated with npm test -- --run src/sim/share.test.ts src/sim/save.test.ts, npm run typecheck, npm run test:e2e, and npm run ci. Source: `672cac7`
- request-AC4 -> This task. Proof: Implemented in de91b05 and 672cac7: share links are static URL fragments built with browser gzip/base64url, capped and validated on decode, copied from the Saves panel, imported on arrival without a server, preserve the receiver's existing saves through confirm/copy-name prompts, load on confirmation, and remove the fragment after handling. Validated with npm test -- --run src/sim/share.test.ts src/sim/save.test.ts, npm run typecheck, npm run test:e2e, and npm run ci. Source: `672cac7`
- request-AC5 -> This task. Proof: Implemented in de91b05 and 672cac7: share links are static URL fragments built with browser gzip/base64url, capped and validated on decode, copied from the Saves panel, imported on arrival without a server, preserve the receiver's existing saves through confirm/copy-name prompts, load on confirmation, and remove the fragment after handling. Validated with npm test -- --run src/sim/share.test.ts src/sim/save.test.ts, npm run typecheck, npm run test:e2e, and npm run ci. Source: `672cac7`
- request-AC7 -> This task. Proof: Implemented in de91b05 and 672cac7: share links are static URL fragments built with browser gzip/base64url, capped and validated on decode, copied from the Saves panel, imported on arrival without a server, preserve the receiver's existing saves through confirm/copy-name prompts, load on confirmation, and remove the fragment after handling. Validated with npm test -- --run src/sim/share.test.ts src/sim/save.test.ts, npm run typecheck, npm run test:e2e, and npm run ci. Source: `672cac7`

# Validation
- (no validation recorded yet)
- npm test -- --run src/sim/share.test.ts src/sim/save.test.ts passed on 2026-08-30: 2 files, 16 tests passed
- npm run typecheck passed on 2026-08-30: tsc completed
- npm run test:e2e passed on 2026-08-30: all interaction checks passed
- npm run ci passed on 2026-08-30: vitest, architecture tests, build/typecheck, logics lint/audit passed
- Finish workflow executed on 2026-08-30.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-30.
- Linked backlog item(s): `item_039_turn_a_city_into_a_link_sized_payload_and_read_one_back_safely`, `item_040_add_the_share_button_to_the_saves_panel`, `item_041_offer_to_import_the_city_when_someone_arrives_on_a_share_link`
- Related request(s): `req_011_share_a_city_as_a_link_that_needs_no_server`

# Links
- Request: `req_011_share_a_city_as_a_link_that_needs_no_server`
- Product brief(s): `prod_008_a_city_you_can_hand_to_someone_else`
- Architecture decision(s): `adr_004_stay_a_static_client_with_no_server_of_its_own`
