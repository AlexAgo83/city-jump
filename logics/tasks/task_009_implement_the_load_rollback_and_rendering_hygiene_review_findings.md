## task_009_implement_the_load_rollback_and_rendering_hygiene_review_findings - Implement the load-rollback and rendering hygiene review findings
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 12:20:20
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
- [ ] 1. Read this request and its four backlog slices; confirm req_005's rebuild-internals scope stays closed and untouched.
- [ ] 2. Fix the destructive failed load first -- it is the only finding that can cost a player their work.
- [ ] 3. Narrow the visibility toggles so they stop triggering the parcel solve and terrain conformance.
- [ ] 4. Extract and unit-test the pure geometry in traffic.ts, roadMesh.ts and drawTool.ts, keeping the extraction mechanical.
- [ ] 5. Collapse the Node version to one source of truth and surface refused autosave writes.
- [ ] 6. Run the fast gate (npm test, architecture, build, typecheck, logics validation), then the browser interaction and visual checks on demand to confirm every select view is unchanged.
- [ ] 7. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready.
- [ ] 8. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_020_make_a_failed_city_load_a_no_op_instead_of_a_destructive_one`
- `item_021_stop_rebuilding_the_whole_city_for_a_visibility_toggle`
- `item_022_unit_test_the_rendering_geometry_that_only_the_browser_suite_touches`
- `item_023_one_node_version_and_an_autosave_that_admits_it_failed`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_020_make_a_failed_city_load_a_no_op_instead_of_a_destructive_one`. Proof deferred to slice closeout.
- request-AC6 -> `item_020_make_a_failed_city_load_a_no_op_instead_of_a_destructive_one`. Proof deferred to slice closeout.
- request-AC2 -> `item_021_stop_rebuilding_the_whole_city_for_a_visibility_toggle`. Proof deferred to slice closeout.
- request-AC6 -> `item_021_stop_rebuilding_the_whole_city_for_a_visibility_toggle`. Proof deferred to slice closeout.
- request-AC3 -> `item_022_unit_test_the_rendering_geometry_that_only_the_browser_suite_touches`. Proof deferred to slice closeout.
- request-AC6 -> `item_022_unit_test_the_rendering_geometry_that_only_the_browser_suite_touches`. Proof deferred to slice closeout.
- request-AC4 -> `item_023_one_node_version_and_an_autosave_that_admits_it_failed`. Proof deferred to slice closeout.
- request-AC5 -> `item_023_one_node_version_and_an_autosave_that_admits_it_failed`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_007_review_findings_half_destroyed_city_on_a_failed_load_and_rebuild_config_test_hygiene`
- Product brief(s): `prod_004_a_city_builder_that_never_loses_the_city_on_screen`
- Architecture decision(s): (none yet)
