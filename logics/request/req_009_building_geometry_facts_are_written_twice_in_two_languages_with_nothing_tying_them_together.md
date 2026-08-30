## req_009_building_geometry_facts_are_written_twice_in_two_languages_with_nothing_tying_them_together - Building geometry facts are written twice, in two languages, with nothing tying them together
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Project reliability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:39:35

# AI Context
- Summary: `buildingSpec` in `src/render/buildings.ts` re-derives seven geometry facts from a model's filename that `scripts/gen_buildings.py` already decided in Python when it authored the mesh, with no test, manifest or assertion tying the two copies together.
- Keywords: building, geometry, facts, written, twice, two, languages, nothing, tying, them, together
- Use when: Touching `buildingSpec`, `roofPropY` or `loadModel` in `src/render/buildings.ts`, the specs in `scripts/gen_buildings.py`, or the authoring contract in `docs/assets.md`.
- Skip when: The work is about model loading performance (req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses), parcel packing in `src/sim/slots.ts`, or how any building looks.

# Needs
- The renderer re-derives a model's geometry from its filename instead of reading it from the model. `buildingSpec` in `src/render/buildings.ts` parses `lot_<frontage>x<depth>` and rebuilds, in TypeScript, seven facts that `scripts/gen_buildings.py` decided in Python when it authored the mesh: the height formula `6 + ((frontage * 7 + depth * 3) % 5) * 3.5 + min(area, 8)`, the footprint `cells * 8 - 1.5`, the pitched-roof rule (`2.5` when `area <= 2`), the setback rule (`area >= 6`, matching the generator's `w * d >= CELL * CELL * 6`), the setback inset `0.12`/`0.88` (the generator's `sx = w * 0.12`, `sw = w * 0.76`), the body-height factor `0.72` (the generator's `body_h = h * 0.72`), and the gabled ridge running at half depth.
- Nothing enforces that the two copies agree. There is no test, no generated manifest, and no assertion comparing either side against the actual mesh. Editing the Python generator -- a different language, a different directory, a script most changes never open -- silently invalidates the TypeScript, and vice versa.
- The failure is silent and geometric, not a crash. `roofPropY` uses these numbers to decide whether a roof object sits on the main deck, on a setback, or on a pitched roof. A drifted formula does not throw; it puts objects inside a parapet, floating above a roof, or on the wrong tier, which is exactly the class of bug that took four consecutive attempts to fix in the roof-prop work and is now written up in `run_002_put_an_object_on_top_of_a_building_without_it_landing_in_the_street`.
- The information is already in the file. `loadModel` reads the mesh's bounding box and keeps `roofY = bounds.maximum.y` and `centerX`, but the derived spec overrides it for everything except the unparseable-id fallback -- so the authoritative source is present at runtime and deliberately not used.

# Context
- Found during a repository review of city-jump 0.2.0 and while writing the 3D authoring runbooks; `run_001_author_a_building_model_that_lands_on_its_parcel` currently carries a manual instruction to mirror any formula change on both sides, which is a documented workaround, not a fix.
- `docs/assets.md` is deliberately fixed as the authoring contract and says the renderer reads each model's bounding box after loading, so `width` and `depth` do not have to be declared anywhere. The duplicated spec in `buildings.ts` quietly contradicts that, because height, roof style and setback geometry are not read from the mesh at all.
- The 20-model library is generated, so a manifest emitted next to the GLBs is available at no authoring cost; a hand-authored model would have to declare the same facts, which is a question this request has to answer rather than assume.
- This is a correctness and maintainability problem, not a performance one, and is independent of `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene` and `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses`.

# Acceptance criteria
- AC1: Each geometry fact the renderer needs about a building model has exactly one source of truth, and the renderer reads it rather than re-deriving it from the model id.
- AC2: A check fails when the generator and the renderer disagree about a model, so drift is caught by the project's own gate rather than by a screenshot.
- AC3: Facts the loaded mesh already knows are taken from the mesh rather than from any declaration.
- AC4: A model whose id does not match `lot_<frontage>x<depth>`, or that arrives without whatever declaration the solution introduces, still loads and renders sensibly rather than falling back to wrong numbers.
- AC5: `docs/assets.md` and `run_001_author_a_building_model_that_lands_on_its_parcel` describe the resulting contract, and the manual mirror-the-formula instruction is removed once it is no longer the mechanism.
- AC6: Buildings and roof objects render exactly as they do today, confirmed by the visual and interaction checks, and `roofPropY`'s existing unit tests still pass.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in 276f124; `src/render/buildings.ts` removed `buildingSpec`, loads `public/buildings/manifest.json`, and reads roof facts from the manifest instead of re-deriving them from the model id.
- request-AC2 -> This task. Proof: Implemented in 276f124; `tests/building-assets.mjs` runs in `npm run test:architecture`, and deliberately changing `lot_1x1` `ridgeY` to 99.5 failed with `lot_1x1 ridgeY: manifest=99.5, glb=9.5` before restoration.
- request-AC3 -> This task. Proof: Implemented in 276f124; loaded mesh bounds still provide `centerX` and `roofY` fallback, while declared roof facts only cover deck/ridge/setback facts the bounding box cannot state.
- request-AC4 -> This task. Proof: Implemented in 276f124; missing manifest entries pass `undefined` to `roofPropY`, which falls back to the loaded mesh top and still renders the model.
- request-AC5 -> This task. Proof: Implemented in 276f124; `docs/assets.md` and `run_001_author_a_building_model_that_lands_on_its_parcel` now describe the manifest contract and no longer instruct authors to mirror formulas in TypeScript.
- request-AC6 -> This task. Proof: Implemented in 276f124 and verified on 2026-08-30 with `npm run ci`, `npm run test:e2e`, and `npm run test:visual`; `roofPropY` unit tests passed and the visual scene rendered 1339 buildings with 16 models.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_006_one_source_of_truth_for_what_a_building_model_is`
- Architecture decision(s): (none yet)

# References
- scripts/gen_buildings.py
- src/render/buildings.ts
- src/sim/slots.ts
- docs/assets.md
- logics/runbook/run_001_author_a_building_model_that_lands_on_its_parcel.md
- logics/runbook/run_002_put_an_object_on_top_of_a_building_without_it_landing_in_the_street.md

# Backlog
- `item_031_give_the_renderer_one_place_to_learn_a_model_s_geometry`
- `item_032_fail_the_build_when_the_generator_and_the_renderer_disagree`
- `item_033_make_docs_assets_md_and_the_authoring_runbook_describe_what_the_code_actually_does`
