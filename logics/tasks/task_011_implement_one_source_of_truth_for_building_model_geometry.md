## task_011_implement_one_source_of_truth_for_building_model_geometry - Implement one source of truth for building model geometry
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:36:50
> Owner: codex

# AI Context
- Summary: Orchestration for req_009: inventory what `buildingSpec` derives, move each fact to the mesh or to one generator-emitted declaration, delete the duplicates, gate drift in the fast CI, and correct the contract docs.
- Keywords: implement, source, truth, building, model, geometry
- Use when: Implementing any of the three backlog slices under req_009, in the plan's order.
- Skip when: The change is about performance, appearance, or parcel packing.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.
- This task and `task_010_implement_the_rebuild_granularity_and_startup_payload_performance_work` both restructure `src/render/buildings.ts` -- this one decides where a model's geometry comes from, that one changes how models are loaded at startup. Take this one first: what it settles is what the loading change then has to preserve.
- `run_001_author_a_building_model_that_lands_on_its_parcel` and `run_002_put_an_object_on_top_of_a_building_without_it_landing_in_the_street` carry the geometry facts this task is consolidating, and the verification method that failed three times on this exact code. Read both before starting.

# Plan
- [ ] 1. Read this request and its three backlog slices, plus run_001_author_a_building_model_that_lands_on_its_parcel and run_002_put_an_object_on_top_of_a_building_without_it_landing_in_the_street for why this matters geometrically.
- [ ] 2. Inventory every fact `buildingSpec` derives and decide, per fact, whether the mesh already knows it or whether it has to be declared.
- [ ] 3. Move the renderer onto that single source and delete the duplicated formulas.
- [ ] 4. Add the drift check to the fast gate, and prove it fails against a deliberately wrong value before restoring it.
- [ ] 5. Correct docs/assets.md and the authoring runbook.
- [ ] 6. Run the fast gate, then the visual and browser interaction checks, and confirm buildings and roof objects are pixel-identical to before.
- [ ] 7. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [ ] 8. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_031_give_the_renderer_one_place_to_learn_a_model_s_geometry`
- `item_032_fail_the_build_when_the_generator_and_the_renderer_disagree`
- `item_033_make_docs_assets_md_and_the_authoring_runbook_describe_what_the_code_actually_does`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_031_give_the_renderer_one_place_to_learn_a_model_s_geometry`. Proof deferred to slice closeout.
- request-AC3 -> `item_031_give_the_renderer_one_place_to_learn_a_model_s_geometry`. Proof deferred to slice closeout.
- request-AC4 -> `item_031_give_the_renderer_one_place_to_learn_a_model_s_geometry`. Proof deferred to slice closeout.
- request-AC2 -> `item_032_fail_the_build_when_the_generator_and_the_renderer_disagree`. Proof deferred to slice closeout.
- request-AC6 -> `item_032_fail_the_build_when_the_generator_and_the_renderer_disagree`. Proof deferred to slice closeout.
- request-AC5 -> `item_033_make_docs_assets_md_and_the_authoring_runbook_describe_what_the_code_actually_does`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`
- Product brief(s): `prod_006_one_source_of_truth_for_what_a_building_model_is`
- Architecture decision(s): (none yet)
