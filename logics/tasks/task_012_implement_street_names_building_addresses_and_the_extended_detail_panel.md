## task_012_implement_street_names_building_addresses_and_the_extended_detail_panel - Implement street names, building addresses, and the extended detail panel
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 13:02:45
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
- [x] 1. Read this request and its five backlog slices, plus run_006_change_what_a_save_contains_without_losing_the_player_s_city before touching the save format.
- [x] 2. Build the street chaining first: everything else is addressed along it, and it is the only slice with real design risk.
- [x] 3. Add the name generator and its exhaustion ladder on top of the street identity.
- [x] 4. Derive address numbers from the parcel data that already carries side and position.
- [x] 5. Persist the names and handle older saves, extending the older-build check rather than relaxing it.
- [x] 6. Extend the selection panel to buildings and cars, and show the street name on roads.
- [x] 7. Run the fast gate, then the browser interaction and visual checks; confirm an older save loads and comes back named.
- [x] 8. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [x] 9. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_034_chain_road_segments_into_streets_that_survive_a_split`
- `item_035_generate_english_street_names_that_cannot_run_out`
- `item_036_give_every_building_an_odd_or_even_address_number`
- `item_037_persist_street_names_and_name_the_cities_saved_before_this_existed`
- `item_038_open_the_detail_panel_on_a_building_or_a_car`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented across a0829cc, de94926, and 981c865: road segments carry stable street identity through split/save-load, generated street names do not exhaust, parcels derive unique odd/even addresses, and the detail panel opens for roads, buildings, and cars. Validated with npm run ci and npm run test:e2e. Source: `981c865`
- request-AC6 -> This task. Proof: Implemented across a0829cc, de94926, and 981c865: road segments carry stable street identity through split/save-load, generated street names do not exhaust, parcels derive unique odd/even addresses, and the detail panel opens for roads, buildings, and cars. Validated with npm run ci and npm run test:e2e. Source: `981c865`
- request-AC2 -> This task. Proof: Implemented across a0829cc, de94926, and 981c865: road segments carry stable street identity through split/save-load, generated street names do not exhaust, parcels derive unique odd/even addresses, and the detail panel opens for roads, buildings, and cars. Validated with npm run ci and npm run test:e2e. Source: `981c865`
- request-AC6 -> This task. Proof: Implemented across a0829cc, de94926, and 981c865: road segments carry stable street identity through split/save-load, generated street names do not exhaust, parcels derive unique odd/even addresses, and the detail panel opens for roads, buildings, and cars. Validated with npm run ci and npm run test:e2e. Source: `981c865`
- request-AC3 -> This task. Proof: Implemented across a0829cc, de94926, and 981c865: road segments carry stable street identity through split/save-load, generated street names do not exhaust, parcels derive unique odd/even addresses, and the detail panel opens for roads, buildings, and cars. Validated with npm run ci and npm run test:e2e. Source: `981c865`
- request-AC6 -> This task. Proof: Implemented across a0829cc, de94926, and 981c865: road segments carry stable street identity through split/save-load, generated street names do not exhaust, parcels derive unique odd/even addresses, and the detail panel opens for roads, buildings, and cars. Validated with npm run ci and npm run test:e2e. Source: `981c865`
- request-AC5 -> This task. Proof: Implemented across a0829cc, de94926, and 981c865: road segments carry stable street identity through split/save-load, generated street names do not exhaust, parcels derive unique odd/even addresses, and the detail panel opens for roads, buildings, and cars. Validated with npm run ci and npm run test:e2e. Source: `981c865`
- request-AC7 -> This task. Proof: Implemented across a0829cc, de94926, and 981c865: road segments carry stable street identity through split/save-load, generated street names do not exhaust, parcels derive unique odd/even addresses, and the detail panel opens for roads, buildings, and cars. Validated with npm run ci and npm run test:e2e. Source: `981c865`
- request-AC4 -> This task. Proof: Implemented across a0829cc, de94926, and 981c865: road segments carry stable street identity through split/save-load, generated street names do not exhaust, parcels derive unique odd/even addresses, and the detail panel opens for roads, buildings, and cars. Validated with npm run ci and npm run test:e2e. Source: `981c865`

# Validation
- (no validation recorded yet)
- command: `npm run ci && npm run test:e2e` | result: passed | date: 2026-08-30
- Finish workflow executed on 2026-08-30.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-30.
- Linked backlog item(s): `item_034_chain_road_segments_into_streets_that_survive_a_split`, `item_035_generate_english_street_names_that_cannot_run_out`, `item_036_give_every_building_an_odd_or_even_address_number`, `item_037_persist_street_names_and_name_the_cities_saved_before_this_existed`, `item_038_open_the_detail_panel_on_a_building_or_a_car`
- Related request(s): `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`

# Links
- Request: `req_010_name_the_streets_number_the_buildings_and_open_a_detail_panel_on_anything_you_click`
- Product brief(s): `prod_007_a_city_you_can_point_at_and_name`
- Architecture decision(s): (none yet)
