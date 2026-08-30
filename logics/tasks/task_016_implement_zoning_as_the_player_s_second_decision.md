## task_016_implement_zoning_as_the_player_s_second_decision - Implement zoning as the player's second decision
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 75%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:47:36
> Owner: codex

# AI Context
- Summary: Orchestration for req_014: model the zone and what it anchors to, let it constrain what is built using only the shipped models, then add the brush and make the Zones view show zones.
- Keywords: implement, zoning, player, second, decision
- Use when: Implementing any of the three backlog slices under req_014, in the plan's order — the anchoring decision comes first and is the expensive one to change later.
- Skip when: The change adds demand, growth or economy, or generates new building assets.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.
- This task adds a field to the save format, as does `task_012_implement_street_names_building_addresses_and_the_extended_detail_panel`. They do not conflict, but do not run them in parallel: whichever lands second must extend the older-build check in `scripts/interact.mjs` for both fields rather than replacing the first one's entry.
- `task_009_implement_the_load_rollback_and_rendering_hygiene_review_findings` should land first: it makes a failed load a no-op, and this task changes what a load carries.
- If this work concludes that the shipped models cannot make two zones look different, stop at that finding. Growing the model library pulls in `task_011_implement_one_source_of_truth_for_building_model_geometry`, because model identity would stop being size alone.

# Plan
- [ ] 1. Read this request and its three backlog slices, plus run_006_change_what_a_save_contains_without_losing_the_player_s_city before touching the save format.
- [ ] 2. Model the zone first, including what it is anchored to -- everything else depends on that choice, and it is the one decision that is expensive to change later.
- [ ] 3. Make the zone drive what is built, reusing the constraint mechanism that already narrows sizes for pedestrian roads, and with the shipped models only.
- [ ] 4. Add the painting tool and make the Zones view show zones.
- [ ] 5. Extend the browser interaction suite, then run the fast gate and the visual check.
- [ ] 6. Confirm the Demo save is visually unchanged until something is zoned.
- [ ] 7. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [ ] 8. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_049_model_a_zone_as_authored_land_that_survives_the_roads_changing`
- `item_050_let_the_zone_decide_what_is_built_using_the_models_already_shipped`
- `item_051_paint_zones_and_make_the_zones_view_show_them`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_049_model_a_zone_as_authored_land_that_survives_the_roads_changing`. Proof deferred to slice closeout.
- request-AC4 -> `item_049_model_a_zone_as_authored_land_that_survives_the_roads_changing`. Proof deferred to slice closeout.
- request-AC6 -> `item_049_model_a_zone_as_authored_land_that_survives_the_roads_changing`. Proof deferred to slice closeout.
- request-AC2 -> `item_050_let_the_zone_decide_what_is_built_using_the_models_already_shipped`. Proof deferred to slice closeout.
- request-AC3 -> `item_050_let_the_zone_decide_what_is_built_using_the_models_already_shipped`. Proof deferred to slice closeout.
- request-AC7 -> `item_050_let_the_zone_decide_what_is_built_using_the_models_already_shipped`. Proof deferred to slice closeout.
- request-AC1 -> `item_051_paint_zones_and_make_the_zones_view_show_them`. Proof deferred to slice closeout.
- request-AC5 -> `item_051_paint_zones_and_make_the_zones_view_show_them`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_014_let_the_player_decide_what_gets_built_instead_of_the_geometry_deciding_for_them`
- Product brief(s): `prod_011_a_city_that_is_built_on_purpose`
- Architecture decision(s): (none yet)
