## task_041_orchestrate_the_structural_work - Orchestrate the structural work
> From version: 0.4.0
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 95%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-04 00:00:00
> Owner: Codex

# AI Context
- Summary: Six waves of structural work that must change no behaviour, gated on the other four chains being complete.
- Keywords: extraction order, architecture assertion, linter adoption, dispose contract, migration hook
- Use when: implementing req_039, once reqs 035 to 038 are done.
- Skip when: an earlier chain is still open, or an existing test needs editing -- that is a signal the seam is wrong.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Precondition: req_035, req_036, req_037 and req_038 are done. app.ts has 143 commits; refactoring it earlier turns every fix in those chains into a conflict.
- [x] 2. Wave 1: the three-line architecture assertion on setTerrain, and the documentation and gitignore items. Cheap, immediate, no conflict surface.
- [x] 3. Wave 2: the linter and tsconfig flags, adopting the tool and fixing its findings as separate commits.
- [x] 4. Wave 3: the startApp extractions in the stated order, one commit each with npm run ci between.
- [ ] 5. Wave 4: the traffic and buildings splits, after req_037 has finished with those hot paths.
- [ ] 6. Wave 5: drawTool into app/, after req_035 item_106.
- [ ] 7. Wave 6: the dispose contract, then the save migration hook.
- [ ] 8. Behaviour must not change anywhere in this chain: an existing test needing an edit is a signal to stop and reconsider the seam.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready without automatic commits.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_124_take_the_isolated_pieces_out_of_startapp`
- `item_125_move_the_driving_logic_where_a_test_can_reach_it`
- `item_126_make_the_terrain_dependency_visible`
- `item_127_move_road_drawing_into_the_layer_that_owns_the_city`
- `item_128_give_every_renderer_a_dispose`
- `item_129_give_the_save_format_somewhere_to_migrate`
- `item_130_make_lint_mean_lint_and_cover_the_scripts`
- `item_131_write_down_the_conventions_the_code_already_follows`
- `item_135_declare_where_this_project_stands_on_translation`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_124_take_the_isolated_pieces_out_of_startapp`. Proof deferred to slice closeout.
- request-AC1 -> `item_125_move_the_driving_logic_where_a_test_can_reach_it`. Proof deferred to slice closeout.
- request-AC2 -> `item_125_move_the_driving_logic_where_a_test_can_reach_it`. Proof deferred to slice closeout.
- request-AC3 -> `item_126_make_the_terrain_dependency_visible`. Proof deferred to slice closeout.
- request-AC4 -> `item_127_move_road_drawing_into_the_layer_that_owns_the_city`. Proof deferred to slice closeout.
- request-AC5 -> `item_128_give_every_renderer_a_dispose`. Proof deferred to slice closeout.
- request-AC6 -> `item_129_give_the_save_format_somewhere_to_migrate`. Proof deferred to slice closeout.
- request-AC8 -> `item_130_make_lint_mean_lint_and_cover_the_scripts`. Proof deferred to slice closeout.
- request-AC7 -> `item_131_write_down_the_conventions_the_code_already_follows`. Proof deferred to slice closeout.
- request-AC9 -> `item_131_write_down_the_conventions_the_code_already_follows`. Proof deferred to slice closeout.

# Validation
- 2026-09-04 validation: `rtk npm exec -- vitest run src/app/cityRebuild.test.ts`, `rtk npm run typecheck`, `rtk npm run lint`, `rtk git diff --check`, `rtk npm run ci`, `rtk logics-manager lint --require-status`, `rtk logics-manager audit --group-by-doc`, and `rtk logics-manager i18n validate` passed after wave 3g.
- 2026-09-04 validation: `rtk npm run typecheck`, `rtk npm exec -- vitest run src/render/traffic.test.ts`, `rtk npm run lint`, and `rtk npm run ci` passed after wave 4a.
- 2026-09-04 validation: `rtk npm run typecheck`, `rtk npm exec -- vitest run src/render/traffic.test.ts src/app/cityRebuild.test.ts`, `rtk npm run lint`, and `rtk npm run ci` passed after wave 4b.
- 2026-09-04 validation: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm exec -- vitest run src/render/traffic.test.ts`, and `rtk npm run ci` passed after wave 4c.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after wave 4d.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after wave 4e.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after wave 4f.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after wave 4g.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after wave 4h.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after wave 4i.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after wave 4j.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, and rtk npm run ci passed after wave 4k.
- 2026-09-04 validation: rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run typecheck, rtk npm run lint, rtk git diff --check, and rtk npm run ci passed after extracting choosePlanAhead into src/render/driving.ts.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, rtk npm run test:architecture, rtk git diff --check, and rtk npm run ci passed after moving tested driving logic to src/sim/traffic.ts.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/buildings.test.ts, rtk npm run lint, rtk git diff --check, and rtk npm run ci passed after extracting roof and foot decor mesh builders into src/render/decorMeshes.ts.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/roadMesh.test.ts, rtk npm run lint, rtk git diff --check, and rtk npm run ci passed after separating the Traffic view road overlay from road mesh rebuilds.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/traffic.test.ts, rtk npm run lint, rtk git diff --check, and rtk npm run ci passed after extracting the traffic mover system into src/render/trafficMovers.ts.
- 2026-09-04 validation: rtk npm run typecheck, rtk npm exec -- vitest run src/render/buildings.test.ts src/render/roadMesh.test.ts src/render/traffic.test.ts, rtk npm run test:architecture, rtk npm run lint, rtk git diff --check, and rtk npm run ci passed after injecting height sampling into the utility, traffic, road, and building renderers.

# Report
- 2026-09-04 wave 3g: extracted admitted parcel selection and parcel geometry helpers into `src/app/cityRebuild.ts`; `src/app/app.ts` now reuses the demand/parcel composition in one place.
- 2026-09-04 wave 4a: extracted vehicle prototype construction and vehicle shape tables into `src/render/vehicleModels.ts`; `src/render/traffic.ts` now receives the built model collections.
- 2026-09-04 wave 4b: moved the headless traffic rule helpers and constants into `src/render/driving.ts`; focused tests now import the pure helpers directly.
- 2026-09-04 wave 4c: extracted the vehicle headlight pool, lamp emissive updates, and beam aiming into `src/render/vehicleLights.ts`; `src/render/traffic.ts` now delegates light sync/aiming while keeping traffic enablement and timing state.
- 2026-09-04 wave 4d: moved the traffic mover types, driving constants, lane queue keys, and terrain dirty-bound helper into src/render/driving.ts; src/render/traffic.ts keeps the renderer loop and scene wiring.
- 2026-09-04 wave 4e: extracted the repeated traffic speed target and acceleration step into src/render/driving.ts; the frame loop now calls speedForRoom and accelerateToward for road and ride movement.
- 2026-09-04 wave 4f: extracted direction-aware road landing, segment limit, and room-ahead calculations into src/render/driving.ts with focused tests.
- 2026-09-04 wave 4g: extracted stopTarget and atSegmentLimit into src/render/driving.ts; stop selection and segment-end checks now have headless coverage.
- 2026-09-04 wave 4h: moved uTurnPath and trimTransferFromMover into src/render/driving.ts, with headless coverage for current-position path trimming and U-turn endpoints.
- 2026-09-04 wave 4i: moved walkJunctionTransfer, walkRingTransfer, and ringTransfer into src/render/driving.ts; the footway loop path selection now has direct headless coverage.
- 2026-09-04 wave 4j: extracted chooseLaneEntry into src/render/driving.ts with direct headless coverage for walker fallback, planned lane changes, unplanned lane changes, and kerb-lane entry.
- 2026-09-04 wave 4k: extracted stopLineDistance into src/render/driving.ts with direct coverage for crossing setback, reverse travel, and no-arm fallback.
- 2026-09-04 wave 4l: extracted choosePlanAhead into src/render/driving.ts; src/render/traffic.ts now delegates pre-junction exit and requested-lane planning while the test covers no-exit, ordinary turn, and two-lane roundabout planning.
- 2026-09-04 wave 4n: moved road lift/sidewalk constants to src/sim/roadTypes.ts and daylight lamp timing to src/sim/time.ts; app, scene, traffic, roadMesh, and streetlights no longer import pure traffic/time values from render modules.
- 2026-09-04 wave 4o: extracted roof and foot decor prototype mesh builders into src/render/decorMeshes.ts; src/render/buildings.ts now keeps placement and rebuild wiring while importing the decor prototypes.
- 2026-09-04 wave 4p: split the Traffic view road overlay into its own mesh list and rebuild path; toggling the overlay no longer rebuilds road surfaces.
- 2026-09-04 wave 4q: extracted the traffic mover placement, queues, frame loop, and vehicle lookup helpers into src/render/trafficMovers.ts; src/render/traffic.ts is now a 74-line renderer facade around models, headlights, settings, and rebuild.
- 2026-09-04 browser check after wave 4q: rtk npm run test:e2e passed the traffic, lighting, building decoration, and zone-view checks touched by item_125, then failed at the pre-existing zone-clear timeout at scripts/interact.mjs:1021.
- 2026-09-04 terrain injection 1: createUtilityRenderer, createTrafficRenderer, createRoadRenderer, and createBuildingRenderer now receive height sampling from app.ts instead of reading the terrain module global directly.

# Links
- Request: `req_039_give_the_code_its_seams_back`
- Product brief(s): `prod_030_a_codebase_whose_seams_are_where_the_tests_can_reach`
- Architecture decision(s): (none yet)

# Notes
- 2026-09-03 wave 1: added the production `setTerrain` architecture guard, removed the only non-app production caller in `playRun`, and recorded ADR 007 for explicit terrain dependency migration.
- 2026-09-03 wave 1: documented `ponytail:` comments in `CONTRIBUTING.md`, relaxed the generated-building manifest assertion to inclusion, height-checked the four hand-authored fallback models, and recorded their fallback in `docs/assets.md`.
- 2026-09-03 validation: `rtk npm run test:architecture`, `rtk node --test tests/building-assets.mjs`, and `rtk npm exec -- vitest run src/sim/playthrough.test.ts` passed.
- 2026-09-03 wave 2: commit `82b27fe` added Biome, `npm run lint`, `npm run format`, the `ci` lint gate, `engines.node >=22`, and the stricter TypeScript flags.
- 2026-09-03 wave 2: commit `17204a9` fixed the strict unused-code and Biome error findings without changing player behavior.
- 2026-09-03 validation: `rtk npm run ci` passed with Biome lint, 40 Vitest files / 306 tests, 12 architecture tests, scenarios, build/typecheck, Logics lint/audit, and i18n validation.
- 2026-09-03 wave 3a: commit `61ea53f` extracted the run-panel DOM wiring from `startApp` into `src/ui/runPanel.ts`; app state ownership and callbacks stayed in `src/app/app.ts`.
- 2026-09-03 validation: `rtk npm run ci` passed after the run-panel extraction. `rtk npm run test:e2e` passed the run-panel, gameplay settings, evacuation, prestige, new-run, reload, and toolbar checks, then failed later at the existing zone-clear timeout at `scripts/interact.mjs:1021`.
- 2026-09-03 wave 3b: commit `5feceac` moved app-specific debug hooks into `installDebugApi(..., { extra })`, so `window.cityjump` is assembled in one place instead of patched after install.
- 2026-09-03 validation: `rtk npm run ci` passed after the debug API change. `rtk npm run test:e2e` proved `window.cityjump.reset()` no longer recurses, then failed at the same existing zone-clear timeout at `scripts/interact.mjs:1021`.
- 2026-09-03 wave 3c: commit `466a35d` extracted camera snapshot/apply helpers and the debounced autosave timer into `src/app/persistence.ts`; `src/app/app.ts` still owns city serialization and refusal UI.
- 2026-09-03 validation: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm run ci`, and `rtk git diff --check` passed after the persistence helper extraction.
- 2026-09-03 wave 3d: commit `b3bfc69` started `src/app/waveLoop.ts` with the repeated wave-visual clear path, missile trail rebuild helper, and wave-local types.
- 2026-09-03 validation: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm run ci`, and `rtk git diff --check` passed after the wave visual helper extraction. `rtk npm run test:e2e` reached the wave/persistence checks and failed later at the existing zone-clear timeout at `scripts/interact.mjs:1021`.
- 2026-09-03 wave 3e: commit `4d310b5` moved the deterministic wave plan and camera framing calculation into `src/app/waveLoop.ts`, leaving `startWave` to reset app state and apply the returned camera.
- 2026-09-03 validation: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm run ci`, and `rtk git diff --check` passed after the wave planning helper extraction.
- 2026-09-03 wave 3f: commit `9675795` moved wave verdict settlement into `settleWaveOutcome` and added `src/app/waveLoop.test.ts` for held-wave scheduling and breached-empty-city end state.
- 2026-09-03 validation: `rtk npm exec -- vitest run src/app/waveLoop.test.ts`, `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm run ci`, and `rtk git diff --check` passed after the wave outcome helper extraction.
- Arbitration for the runner. May decide alone: (1) step C of item_125, per adr_006: move the driving logic to sim if and only if headless tests for it exist and pass, otherwise leave it in render and close as no-change. Do not ask; the gate is observable. (2) The linter in item_130: Biome unless something argues otherwise, since it covers lint and format in one dependency and there is no existing config to preserve. (3) Whether item_126 or item_127 needs its own ADR: raise one if the change alters what a layer may depend on, otherwise the backlog item is the record. Reserved for the owner: nothing. adr_006 settled the traffic seam and item_135's source locale is decided -- English first, further languages later.
and item_135's source locale is decided -- English first, further languages later.
