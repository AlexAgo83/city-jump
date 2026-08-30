## task_013_implement_sharing_a_city_by_link - Implement sharing a city by link
> From version: 0.2.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:05:05

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
- [ ] 1. Read this request and its three backlog slices, plus run_006_change_what_a_save_contains_without_losing_the_player_s_city -- a shared payload is the same untrusted JSON as a save, and the same version rules apply.
- [ ] 2. Take the threat-model review from `task_015_make_the_project_s_documents_and_input_model_match_the_public_deployment` as this task's input: its cap list and refusal rules are the encoder's specification. Do not start the encoder before it exists.
- [ ] 3. Build the encoder and decoder against that review, with the size caps and the quantisation, and prove against `public/default-demo.json` that a Demo-sized city fits.
- [ ] 3. Add the Share button and its refusal path.
- [ ] 4. Add the arrival flow: import prompt, collision handling, load offer, fragment cleanup.
- [ ] 5. Extend the browser interaction suite with the share-arrive-import round trip.
- [ ] 6. Run the fast gate, then the browser interaction and visual checks; confirm Save, Load and Delete are unchanged.
- [ ] 7. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [ ] 8. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_039_turn_a_city_into_a_link_sized_payload_and_read_one_back_safely`
- `item_040_add_the_share_button_to_the_saves_panel`
- `item_041_offer_to_import_the_city_when_someone_arrives_on_a_share_link`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC2 -> `item_039_turn_a_city_into_a_link_sized_payload_and_read_one_back_safely`. Proof deferred to slice closeout.
- request-AC3 -> `item_039_turn_a_city_into_a_link_sized_payload_and_read_one_back_safely`. Proof deferred to slice closeout.
- request-AC5 -> `item_039_turn_a_city_into_a_link_sized_payload_and_read_one_back_safely`. Proof deferred to slice closeout.
- request-AC6 -> `item_039_turn_a_city_into_a_link_sized_payload_and_read_one_back_safely`. Proof deferred to slice closeout.
- request-AC1 -> `item_040_add_the_share_button_to_the_saves_panel`. Proof deferred to slice closeout.
- request-AC2 -> `item_040_add_the_share_button_to_the_saves_panel`. Proof deferred to slice closeout.
- request-AC7 -> `item_040_add_the_share_button_to_the_saves_panel`. Proof deferred to slice closeout.
- request-AC4 -> `item_041_offer_to_import_the_city_when_someone_arrives_on_a_share_link`. Proof deferred to slice closeout.
- request-AC5 -> `item_041_offer_to_import_the_city_when_someone_arrives_on_a_share_link`. Proof deferred to slice closeout.
- request-AC7 -> `item_041_offer_to_import_the_city_when_someone_arrives_on_a_share_link`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_011_share_a_city_as_a_link_that_needs_no_server`
- Product brief(s): `prod_008_a_city_you_can_hand_to_someone_else`
- Architecture decision(s): `adr_004_stay_a_static_client_with_no_server_of_its_own`
