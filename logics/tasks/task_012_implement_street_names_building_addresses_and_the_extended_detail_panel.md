## task_012_implement_street_names_building_addresses_and_the_extended_detail_panel - Implement street names, building addresses, and the extended detail panel
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 95%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:52:30
> Owner: codex

# AI Context
- Summary: Orchestration for req_010: chain segments into streets, name them with an unbounded English scheme, number the buildings, persist the names with save compatibility, and extend the detail panel to buildings and cars.
- Keywords: implement, street, names, building, addresses, extended, detail, panel
- Use when: Implementing any of the five backlog slices under req_010, in the plan's order — the street chaining comes first.
- Skip when: The change is about in-scene labels, a map view, districts, or making addresses drive simulation.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.
- `run_006_change_what_a_save_contains_without_losing_the_player_s_city` is required reading before the persistence slice: `parseCity` currently requires a segment tuple of exactly 6 entries, and adding a seventh without relaxing that check first refuses every existing city.
- Sequencing against the sibling tasks, which touch the same files:
  - `task_009_implement_the_load_rollback_and_rendering_hygiene_review_findings` reworks the failed-load path in `src/sim/save.ts` and extracts pure geometry out of `src/render/drawTool.ts`. Land it before the persistence and panel slices here, so this task builds on the rollback rather than racing it.
  - This task adds a field to the save format; `task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work` and `task_011_implement_one_source_of_truth_for_building_model_geometry` do not touch it, so they can run in parallel with this one.

# Plan
- [ ] 1. Read this request and its five backlog slices, plus run_006_change_what_a_save_contains_without_losing_the_player_s_city before touching the save format.
- [ ] 2. Build the street chaining first: everything else is addressed along it, and it is the only slice with real design risk.
- [ ] 3. Add the name generator and its exhaustion ladder on top of the street identity.
- [ ] 4. Derive address numbers from the parcel data that already carries side and position.
- [ ] 5. Persist the names and handle older saves, extending the older-build check rather than relaxing it.
- [ ] 6. Extend the selection panel to buildings and cars, and show the street name on roads.
- [ ] 7. Run the fast gate, then the browser interaction and visual checks; confirm an older save loads and comes back named.
- [ ] 8. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [ ] 9. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_034_chain_road_segments_into_streets_that_survive_a_split`
- `item_035_generate_english_street_names_that_cannot_run_out`
- `item_036_give_every_building_an_odd_or_even_address_number`
- `item_037_persist_street_names_and_name_the_cities_saved_before_this_existed`
- `item_038_open_the_detail_panel_on_a_building_or_a_car`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_034_chain_road_segments_into_streets_that_survive_a_split`. Proof deferred to slice closeout.
- request-AC6 -> `item_034_chain_road_segments_into_streets_that_survive_a_split`. Proof deferred to slice closeout.
- request-AC2 -> `item_035_generate_english_street_names_that_cannot_run_out`. Proof deferred to slice closeout.
- request-AC6 -> `item_035_generate_english_street_names_that_cannot_run_out`. Proof deferred to slice closeout.
- request-AC3 -> `item_036_give_every_building_an_odd_or_even_address_number`. Proof deferred to slice closeout.
- request-AC6 -> `item_036_give_every_building_an_odd_or_even_address_number`. Proof deferred to slice closeout.
- request-AC5 -> `item_037_persist_street_names_and_name_the_cities_saved_before_this_existed`. Proof deferred to slice closeout.
- request-AC7 -> `item_037_persist_street_names_and_name_the_cities_saved_before_this_existed`. Proof deferred to slice closeout.
- request-AC4 -> `item_038_open_the_detail_panel_on_a_building_or_a_car`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`
- Product brief(s): `prod_007_a_city_you_can_point_at_and_name`
- Architecture decision(s): (none yet)
