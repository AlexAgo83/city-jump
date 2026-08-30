## task_011_implement_one_source_of_truth_for_building_model_geometry - Implement one source of truth for building model geometry
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:39:36
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
- [x] 1. Read this request and its three backlog slices, plus run_001_author_a_building_model_that_lands_on_its_parcel and run_002_put_an_object_on_top_of_a_building_without_it_landing_in_the_street for why this matters geometrically.
- [x] 2. Inventory every fact `buildingSpec` derives and decide, per fact, whether the mesh already knows it or whether it has to be declared.
- [x] 3. Move the renderer onto that single source and delete the duplicated formulas.
- [x] 4. Add the drift check to the fast gate, and prove it fails against a deliberately wrong value before restoring it.
- [x] 5. Correct docs/assets.md and the authoring runbook.
- [x] 6. Run the fast gate, then the visual and browser interaction checks, and confirm buildings and roof objects are pixel-identical to before.
- [x] 7. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [x] 8. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_031_give_the_renderer_one_place_to_learn_a_model_s_geometry`
- `item_032_fail_the_build_when_the_generator_and_the_renderer_disagree`
- `item_033_make_docs_assets_md_and_the_authoring_runbook_describe_what_the_code_actually_does`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in 276f124; `src/render/buildings.ts` removed `buildingSpec`, loads `public/buildings/manifest.json`, and reads roof facts from the manifest instead of re-deriving them from the model id.
- request-AC2 -> This task. Proof: Implemented in 276f124; `tests/building-assets.mjs` runs in `npm run test:architecture`, and deliberately changing `lot_1x1` `ridgeY` to 99.5 failed with `lot_1x1 ridgeY: manifest=99.5, glb=9.5` before restoration.
- request-AC3 -> This task. Proof: Implemented in 276f124; loaded mesh bounds still provide `centerX` and `roofY` fallback, while declared roof facts only cover deck/ridge/setback facts the bounding box cannot state.
- request-AC4 -> This task. Proof: Implemented in 276f124; missing manifest entries pass `undefined` to `roofPropY`, which falls back to the loaded mesh top and still renders the model.
- request-AC5 -> This task. Proof: Implemented in 276f124; `docs/assets.md` and `run_001_author_a_building_model_that_lands_on_its_parcel` now describe the manifest contract and no longer instruct authors to mirror formulas in TypeScript.
- request-AC6 -> This task. Proof: Implemented in 276f124 and verified on 2026-08-30 with `npm run ci`, `npm run test:e2e`, and `npm run test:visual`; `roofPropY` unit tests passed and the visual scene rendered 1339 buildings with 16 models.

# Validation
- (no validation recorded yet)
- npm run ci passed on 2026-08-30: 144 vitest tests, 4 architecture tests including building manifest drift check, build/typecheck, lint and audit passed. npm run test:e2e passed on 2026-08-30: all interaction checks passed and all sixteen parcel models loaded. npm run test:visual passed on 2026-08-30: demo scene rendered with 1339 buildings, 16 models and 116 fps. Deliberate drift proof: changing lot_1x1 ridgeY to 99.5 made npm run test:architecture fail with 'lot_1x1 ridgeY: manifest=99.5, glb=9.5', then the value was restored.
- Finish workflow executed on 2026-08-30.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-30.
- Linked backlog item(s): `item_031_give_the_renderer_one_place_to_learn_a_model_s_geometry`, `item_032_fail_the_build_when_the_generator_and_the_renderer_disagree`, `item_033_make_docs_assets_md_and_the_authoring_runbook_describe_what_the_code_actually_does`
- Related request(s): `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`

# Links
- Request: `req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together`
- Product brief(s): `prod_006_one_source_of_truth_for_what_a_building_model_is`
- Architecture decision(s): (none yet)
