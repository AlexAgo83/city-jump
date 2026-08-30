## req_020_four_renderers_still_rebuild_the_whole_world_on_every_edit - Four renderers still rebuild the whole world on every edit
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: City legibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-30 18:04:02

# AI Context
- Summary: req_008 bounded the heightmap, ground, road meshes and traffic to the region an edit touched, and left trees, world grid, streetlights and signals rebuilding whole. Trees rescan 5,400 m of island on a 58 m step per road placed; the world grid allocates ~900,000 vectors when visible; and `allJunctions` solves the same geometry five times per rebuild. Measure first -- the honest answer for at least one of these is a number and no code.
- Keywords: four, renderers, still, rebuild, whole, world, edit
- Use when: Bounding or measuring the trees, world grid, streetlight or signal rebuilds, or removing the duplicated `allJunctions` work.
- Skip when: The work changes what these renderers draw, reworks scenery rules or lamp/signal models, builds a general dirty-region framework, or optimises by drawing less.

# Needs
- `req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses` taught the heightmap, the ground, the road meshes and the traffic to repaint only the region an edit touched. Four renderers were left out and still rebuild whole on every edit: trees, the world grid, the streetlights and the signals. `rebuild` in `src/app/app.ts` calls all four with no dirty box at all.
- The trees are the largest of them and the least justified. `trees.rebuild` rebuilds a road mask over every segment and then rescans the entire 5400 m island for scenery on a 58 m step -- roughly 8,600 candidate points -- plus a denser pass inside every forest patch, on every road placed. None of that work depends on what the edit changed: the scenery is a deterministic function of the heightmap, the road mask and the plantings, and the heightmap only changes inside the dirty region.
- The world grid is worse per rebuild and cheaper in practice. When it is visible it allocates two `Vector3` per cell per axis across a 676 x 676 grid -- on the order of 900,000 objects -- and builds a fresh line system, every rebuild. When it is hidden it returns immediately, which is the default, so it costs nothing most of the time and a great deal exactly when someone is using it to line a road up.
- There is also work duplicated across renderers that has nothing to do with dirty regions. `allJunctions(graph)` walks every node and computes the junction geometry for each, and it is called four times per rebuild -- in `src/sim/heightmap.ts`, `src/render/roadMesh.ts`, `src/render/streetlights.ts` and `src/render/signals.ts` -- while `src/render/traffic.ts` keeps a fifth copy in its own lazy cache. The same city geometry is solved five times to draw one frame.
- The roadmap records this as an open question with an honest either-or: extend the optimisation to these four, or find their cost never justified it. That question has never been measured, and it should be answered with numbers rather than closed by assumption in either direction.

# Context
- `run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint` is the procedure and it is not optional reading here. Its rung 3 -- dispose and recreate on the same predicate -- is the defect `req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work` exists to fix, and it is exactly the mistake this chain is positioned to repeat four more times.
- The precedent for the duplicated junction work already exists in this codebase. `src/app/app.ts` solves `buildableCells` and `buildingParcels` once per rebuild and hands the same answer to both the terrain and the building renderer, with a comment saying why. `allJunctions` is the same shape of problem and has not had the same treatment.
- The tree scenery is deterministic and that is what makes it boundable: `randomish` seeded per candidate index, the heightmap, the road mask, and the player's own plantings. A tree far from an edit cannot have changed, because nothing it depends on changed. Its trunks and canopies are thin instances applied through `applyInstances`, so preserving the ones outside the region means preserving their matrices rather than recomputing them.
- The streetlights already learned this lesson once, in the small. `rebuildLights` carries a comment recording that creating or disposing a light walks every mesh in the scene and that churning hundreds of lamps cost seconds per road drawn -- so only the difference in count is created or disposed and every other light is moved. The lamp *meshes* did not get the same treatment.
- The signals rebuild disposes every mast and recreates it, and runs `signalCycle` for every junction in the city. Both are proportional to the junction count rather than to the edit.
- `measureCosts()` in `src/render/debugApi.ts` already times startup, the demo build and one road placement against a known city. It reports those three totals and nothing per-renderer, so it cannot currently say which of these four is worth touching.
- Not every answer here is a dirty region. The duplicated junction geometry is solved by computing it once and passing it down; the world grid may be solved by not rebuilding it when the heightmap did not change under it; and one or more of these renderers may turn out to cost little enough that the right answer is a recorded measurement and no code at all.

# Acceptance criteria
- AC1: The cost of each of the four full-rebuild renderers is measured individually against a known city, so the decision about each one rests on a number.
- AC2: The junction geometry is computed once per rebuild and shared, rather than solved separately by the heightmap, the road meshes, the streetlights and the signals.
- AC3: An edit no longer rescans the whole island for scenery trees: trees outside the region an edit touched are preserved rather than recomputed.
- AC4: Each of the world grid, the streetlights and the signals is either bounded to the region an edit touched, or left whole with the measurement that justifies leaving it recorded.
- AC5: Nothing this chain touches can dispose geometry it does not recreate -- every renderer it changes disposes and recreates on one predicate, per `run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint`.
- AC6: A partial rebuild produces the same scene as a full one, proven for each renderer changed rather than assumed.
- AC7: The bundled Demo city is visually unchanged, and the before-and-after placement cost is recorded.
- AC8: `npm test`, `npm run test:architecture`, `npm run build` and `npm run logics:validate` all pass, and each renderer bounded leaves behind a check that fails without its fix.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_017_an_edit_that_costs_what_it_changed_everywhere`
- Architecture decision(s): (none yet)

# References
- src/render/trees.ts
- src/render/ground.ts
- src/render/streetlights.ts
- src/render/signals.ts
- src/render/roadMesh.ts
- src/sim/junction.ts
- src/sim/heightmap.ts
- src/app/app.ts
- src/render/debugApi.ts
- logics/runbook/run_008_repaint_only_part_of_the_world_without_losing_what_you_did_not_repaint.md
- logics/request/req_008_performance_every_road_placed_rebuilds_the_whole_city_and_the_first_load_ships_what_it_never_uses.md
- logics/request/req_015_close_the_ten_defects_the_review_found_in_the_dirty_region_rebuild_zoning_and_sharing_work.md

# Backlog
- `item_066_measure_what_each_full_rebuild_renderer_actually_costs`
- `item_067_solve_the_junction_geometry_once_per_rebuild_instead_of_five_times`
- `item_068_stop_rescanning_the_whole_island_for_trees_that_cannot_have_changed`
- `item_069_decide_the_world_grid_the_streetlights_and_the_signals_on_their_numbers`
