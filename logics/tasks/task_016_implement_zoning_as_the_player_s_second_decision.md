## task_016_implement_zoning_as_the_player_s_second_decision - Implement zoning as the player's second decision
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:51:59
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
- [x] 1. Read this request and its three backlog slices, plus run_006_change_what_a_save_contains_without_losing_the_player_s_city before touching the save format.
- [x] 2. Model the zone first, including what it is anchored to -- everything else depends on that choice, and it is the one decision that is expensive to change later.
- [x] 3. Make the zone drive what is built, reusing the constraint mechanism that already narrows sizes for pedestrian roads, and with the shipped models only.
- [x] 4. Add the painting tool and make the Zones view show zones.
- [x] 5. Extend the browser interaction suite, then run the fast gate and the visual check.
- [x] 6. Confirm the Demo save is visually unchanged until something is zoned.
- [x] 7. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [x] 8. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_049_model_a_zone_as_authored_land_that_survives_the_roads_changing`
- `item_050_let_the_zone_decide_what_is_built_using_the_models_already_shipped`
- `item_051_paint_zones_and_make_the_zones_view_show_them`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in 5478a1d: authored zone cells persist in save v5, constrain building parcels to low/dense shipped model sets, paint/clear from the Zones toolbar, and render in the Zones view. Validated with npm run ci and npm run test:e2e. Source: `5478a1d`
- request-AC4 -> This task. Proof: Implemented in 5478a1d: authored zone cells persist in save v5, constrain building parcels to low/dense shipped model sets, paint/clear from the Zones toolbar, and render in the Zones view. Validated with npm run ci and npm run test:e2e. Source: `5478a1d`
- request-AC6 -> This task. Proof: Implemented in 5478a1d: authored zone cells persist in save v5, constrain building parcels to low/dense shipped model sets, paint/clear from the Zones toolbar, and render in the Zones view. Validated with npm run ci and npm run test:e2e. Source: `5478a1d`
- request-AC2 -> This task. Proof: Implemented in 5478a1d: authored zone cells persist in save v5, constrain building parcels to low/dense shipped model sets, paint/clear from the Zones toolbar, and render in the Zones view. Validated with npm run ci and npm run test:e2e. Source: `5478a1d`
- request-AC3 -> This task. Proof: Implemented in 5478a1d: authored zone cells persist in save v5, constrain building parcels to low/dense shipped model sets, paint/clear from the Zones toolbar, and render in the Zones view. Validated with npm run ci and npm run test:e2e. Source: `5478a1d`
- request-AC7 -> This task. Proof: Implemented in 5478a1d: authored zone cells persist in save v5, constrain building parcels to low/dense shipped model sets, paint/clear from the Zones toolbar, and render in the Zones view. Validated with npm run ci and npm run test:e2e. Source: `5478a1d`
- request-AC1 -> This task. Proof: Implemented in 5478a1d: authored zone cells persist in save v5, constrain building parcels to low/dense shipped model sets, paint/clear from the Zones toolbar, and render in the Zones view. Validated with npm run ci and npm run test:e2e. Source: `5478a1d`
- request-AC5 -> This task. Proof: Implemented in 5478a1d: authored zone cells persist in save v5, constrain building parcels to low/dense shipped model sets, paint/clear from the Zones toolbar, and render in the Zones view. Validated with npm run ci and npm run test:e2e. Source: `5478a1d`

# Validation
- (no validation recorded yet)
- command: `npm run ci && npm run test:e2e` | result: passed | date: 2026-08-30
- Finish workflow executed on 2026-08-30.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-30.
- Linked backlog item(s): `item_049_model_a_zone_as_authored_land_that_survives_the_roads_changing`, `item_050_let_the_zone_decide_what_is_built_using_the_models_already_shipped`, `item_051_paint_zones_and_make_the_zones_view_show_them`
- Related request(s): `req_014_let_the_player_decide_what_gets_built_instead_of_the_geometry_deciding_for_them`

# Links
- Request: `req_014_let_the_player_decide_what_gets_built_instead_of_the_geometry_deciding_for_them`
- Product brief(s): `prod_011_a_city_that_is_built_on_purpose`
- Architecture decision(s): (none yet)
