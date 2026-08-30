## task_009_implement_the_load_rollback_and_rendering_hygiene_review_findings - Implement the load-rollback and rendering hygiene review findings
> From version: 0.2.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:28:31
> Owner: codex

# AI Context
- Summary: Orchestration for req_007: restore the pre-load state on a failed load, narrow the visibility toggles, unit-test the render geometry, and collapse the Node version while surfacing refused autosave writes.
- Keywords: implement, load, rollback, rendering, hygiene, review, findings
- Use when: Implementing any of the four backlog slices under req_007, in the order the plan sets out.
- Skip when: The change belongs to req_005's rebuild internals, the save format, or gameplay behaviour.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.
- Two of these slices are prerequisites for task_010's performance work on the same files, so this task should land first:
  - `item_021_stop_rebuilding_the_whole_city_for_a_visibility_toggle` removes the toggle callers of `rebuild()` before task_010 changes what `rebuild()` costs.
  - `item_022_unit_test_the_rendering_geometry_that_only_the_browser_suite_touches` gives `src/render/traffic.ts` and `roadMesh.ts` unit coverage before task_010 reworks them.
- `run_006_change_what_a_save_contains_without_losing_the_player_s_city` covers the save-side rules and the two false "the city is gone" diagnoses; read it before touching `item_020_make_a_failed_city_load_a_no_op_instead_of_a_destructive_one` or the autosave half of `item_023_one_node_version_and_an_autosave_that_admits_it_failed`.

# Plan
- [x] 1. Read this request and its four backlog slices; confirm req_005's rebuild-internals scope stays closed and untouched.
- [x] 2. Fix the destructive failed load first -- it is the only finding that can cost a player their work.
- [x] 3. Narrow the visibility toggles so they stop triggering the parcel solve and terrain conformance.
- [x] 4. Extract and unit-test the pure geometry in traffic.ts, roadMesh.ts and drawTool.ts, keeping the extraction mechanical.
- [x] 5. Collapse the Node version to one source of truth and surface refused autosave writes.
- [x] 6. Run the fast gate (npm test, architecture, build, typecheck, logics validation), then the browser interaction and visual checks on demand to confirm every select view is unchanged.
- [x] 7. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [x] 8. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_020_make_a_failed_city_load_a_no_op_instead_of_a_destructive_one`
- `item_021_stop_rebuilding_the_whole_city_for_a_visibility_toggle`
- `item_022_unit_test_the_rendering_geometry_that_only_the_browser_suite_touches`
- `item_023_one_node_version_and_an_autosave_that_admits_it_failed`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in dcc3580, a7cb668, and 36859dd; validated with npm run ci and npm run test:e2e. Source: `36859dd`
- request-AC6 -> This task. Proof: Implemented in dcc3580, a7cb668, and 36859dd; validated with npm run ci and npm run test:e2e. Source: `36859dd`
- request-AC2 -> This task. Proof: Implemented in dcc3580, a7cb668, and 36859dd; validated with npm run ci and npm run test:e2e. Source: `36859dd`
- request-AC6 -> This task. Proof: Implemented in dcc3580, a7cb668, and 36859dd; validated with npm run ci and npm run test:e2e. Source: `36859dd`
- request-AC3 -> This task. Proof: Implemented in dcc3580, a7cb668, and 36859dd; validated with npm run ci and npm run test:e2e. Source: `36859dd`
- request-AC6 -> This task. Proof: Implemented in dcc3580, a7cb668, and 36859dd; validated with npm run ci and npm run test:e2e. Source: `36859dd`
- request-AC4 -> This task. Proof: Implemented in dcc3580, a7cb668, and 36859dd; validated with npm run ci and npm run test:e2e. Source: `36859dd`
- request-AC5 -> This task. Proof: Implemented in dcc3580, a7cb668, and 36859dd; validated with npm run ci and npm run test:e2e. Source: `36859dd`

# Validation
- (no validation recorded yet)
- npm run ci passed on 2026-08-30: 144 vitest tests, 3 architecture tests, build/typecheck, lint and audit passed. npm run test:e2e passed on 2026-08-30: all interaction checks passed.
- Finish workflow executed on 2026-08-30.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-30.
- Linked backlog item(s): `item_020_make_a_failed_city_load_a_no_op_instead_of_a_destructive_one`, `item_021_stop_rebuilding_the_whole_city_for_a_visibility_toggle`, `item_022_unit_test_the_rendering_geometry_that_only_the_browser_suite_touches`, `item_023_one_node_version_and_an_autosave_that_admits_it_failed`
- Related request(s): `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene`

# Links
- Request: `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene`
- Product brief(s): `prod_004_a_city_builder_that_never_loses_the_city_on_screen`
- Architecture decision(s): (none yet)
