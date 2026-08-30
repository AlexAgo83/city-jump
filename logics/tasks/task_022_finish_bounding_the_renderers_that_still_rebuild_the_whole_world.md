## task_022_finish_bounding_the_renderers_that_still_rebuild_the_whole_world - Finish bounding the renderers that still rebuild the whole world
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 94%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 14:56:54
> Owner: Codex

# AI Context
- Summary: Orchestration for req_020: measure, then the duplicated junction geometry, then the trees, then the remaining three on their numbers. Runs after task_017 -- that chain settles the dispose/recreate predicate this one would otherwise copy wrong four more times.
- Keywords: finish, bounding, renderers, still, rebuild, whole, world
- Use when: Implementing any of the four backlog slices under req_020, in the plan's order.
- Skip when: The change alters what these renderers draw, or optimises by reducing detail rather than by bounding work.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Read this request, its four backlog slices, and `run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint` in full. This chain is positioned to repeat that runbook's rung 3 four more times, and a lost tree is far harder to notice than a lost road.
- [x] 2. Run after task_017. That chain fixes the dispose/recreate asymmetry in the road mesh and settles the predicate every renderer here has to follow; starting before it means copying the defect.
- [ ] 3. Measure first. The first slice gates the third and fourth, and the honest outcome for at least one renderer is a number and no code.
- [x] 4. Then the junction geometry, which needs no measurement to justify: it is the same work solved five times, and the codebase already applies the fix to the parcel layout one line away.
- [ ] 5. Then the trees, which the measurement is expected to show as the largest -- but take the measurement's answer, not this sentence's.
- [x] 6. Then the world grid, streetlights and signals, each decided on its own number.
- [ ] 7. Re-measure after every slice and record the figures; the closeout should show the placement cost falling slice by slice.
- [ ] 8. Confirm the Demo city is pixel-identical throughout, and run the fast gate and the visual check.
- [x] 9. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. Anything deliberately left rebuilding whole gets a `ponytail:` comment with its measurement.
- [ ] 10. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_066_measure_what_each_full_rebuild_renderer_actually_costs`
- `item_067_solve_the_junction_geometry_once_per_rebuild_instead_of_five_times`
- `item_068_stop_rescanning_the_whole_island_for_trees_that_cannot_have_changed`
- `item_069_decide_the_world_grid_the_streetlights_and_the_signals_on_their_numbers`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_066_measure_what_each_full_rebuild_renderer_actually_costs`. Proof deferred to slice closeout.
- request-AC2 -> `item_067_solve_the_junction_geometry_once_per_rebuild_instead_of_five_times`. Proof deferred to slice closeout.
- request-AC6 -> `item_067_solve_the_junction_geometry_once_per_rebuild_instead_of_five_times`. Proof deferred to slice closeout.
- request-AC7 -> `item_067_solve_the_junction_geometry_once_per_rebuild_instead_of_five_times`. Proof deferred to slice closeout.
- request-AC3 -> `item_068_stop_rescanning_the_whole_island_for_trees_that_cannot_have_changed`. Proof deferred to slice closeout.
- request-AC5 -> `item_068_stop_rescanning_the_whole_island_for_trees_that_cannot_have_changed`. Proof deferred to slice closeout.
- request-AC6 -> `item_068_stop_rescanning_the_whole_island_for_trees_that_cannot_have_changed`. Proof deferred to slice closeout.
- request-AC7 -> `item_068_stop_rescanning_the_whole_island_for_trees_that_cannot_have_changed`. Proof deferred to slice closeout.
- request-AC4 -> `item_069_decide_the_world_grid_the_streetlights_and_the_signals_on_their_numbers`. Proof deferred to slice closeout.
- request-AC5 -> `item_069_decide_the_world_grid_the_streetlights_and_the_signals_on_their_numbers`. Proof deferred to slice closeout.
- request-AC6 -> `item_069_decide_the_world_grid_the_streetlights_and_the_signals_on_their_numbers`. Proof deferred to slice closeout.
- request-AC8 -> `item_069_decide_the_world_grid_the_streetlights_and_the_signals_on_their_numbers`. Proof deferred to slice closeout.

# Validation
- 2026-08-30: `npm run typecheck` clean, `npm test` 160/160, `npm run test:architecture` 4/4, `logics-manager lint` OK, `logics-manager audit` 0 blocking (47 warnings, all deferred-to-closeout).
- Not yet run: `npm run test:visual` and `npm run test:e2e`. Plan step 8 (Demo city pixel-identical) is still open, and see the baseline note in the report below before comparing against any screenshot taken earlier than `fa39b46`.

# Report
- Slice state, read from the code rather than from the indicators (the four slices carry one mirrored progress number, so the per-slice truth lives here):
  - `item_067` **code delivered, two ACs unproven**. `allJunctions(graph)` is solved once per rebuild at `src/app/app.ts:75` and injected into `heightmap.conformToRoads`, `roads.rebuild`, `streetlights.rebuild` and `signals.rebuild`, each of which keeps `allJunctions(graph)` only as a default argument for its own callers. Five solves became one, which is AC1. Delivered by `c705032`. Still open: AC2 (no consumer mutates the shared map, *verified* rather than assumed -- nothing checks this today), AC3 (whether the traffic renderer shares the same answer, or why it cannot), and AC4 (the measured cost drop, which is blocked on `item_066`). Do not close this slice on the code alone.
  - `item_069` **substantially done**. World grid skips dirty rebuilds and draws coarser when visible (`40ea426`, `43ffa4d`); streetlights and signals are off the global rebuild path (`c705032`); stale traffic movers are dropped instead of rebuilt (`5c8b0b3`). What is missing is the per-renderer number that was supposed to justify each decision -- the decisions were taken on reasoning, not on figures, which is AC4's actual requirement.
  - `item_066` **half done**. `measureCosts()` exists (`src/render/debugApi.ts:134`) but returns one global `placementMs` alongside `startupMs`, `demoBuildMs` and a segment count. AC1 (a figure per renderer: trees, world grid, streetlights, signals), AC2 (bounded vs full, grid hidden vs visible) and AC3 (the `allJunctions` call count per rebuild) are all unmet, and no baseline figures are recorded anywhere (AC4).
  - `item_068` **barely started, and now the largest remaining cost**. Road edits dodge the problem rather than bound it -- `src/app/app.ts:78` reads `if (!dirty) trees.rebuild()`, so a dirty edit skips trees entirely. Every planting still goes through `refreshTrees` (`src/app/app.ts:123`) and rescans the whole island. Open question a repreneur must settle before optimising: skipping trees on a dirty edit is only correct if no road edit can ever invalidate a tree; if it can, this is a `run_008` rung-3 bug hiding as an optimisation.
- **Baseline warning.** `fa39b46` debounced the burst of city-wide rebuilds that the 16 building models triggered as they resolved, collapsing 16 full passes into one. Any `startupMs`/`demoBuildMs` measured before that commit is stale. Step 7 ("re-measure after every slice") has to restart from a post-`fa39b46` baseline, and the slice-by-slice fall it expects to show cannot be reconstructed from earlier numbers.
- **New constraint from `fa39b46`, in this chain's favour.** Every count-varying thin-instance buffer now passes `staticBuffer: false` (`buildings.ts`, `trees.ts`, `streetlights.ts`, `groundShadow.ts`). Bounding these renderers makes instance counts vary per rebuild, which is exactly the shape that silently dropped a draw under the old default -- so a landmine directly on this chain's path is already cleared. The matching constraint: any new code that touches `material.alpha` or `material.transparencyMode` must guard its no-op case. Both causes are written up as rungs 7 and 8 of `run_007_the_code_says_it_drew_it_and_the_screen_disagrees`.
- **UI behaviour changed in `fa39b46`**: buildings are hidden while roads are being drawn, and the Select tool resets its view radio to "all" on entry. The repo stores no pixel baseline, so step 8 is a manual comparison -- make it against the current build, not against screenshots predating that commit.

# Links
- Request: `req_020_four_renderers_still_rebuild_the_whole_world_on_every_edit`
- Product brief(s): `prod_017_an_edit_that_costs_what_it_changed_everywhere`
- Architecture decision(s): (none yet)
