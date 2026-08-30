## task_021_let_the_player_take_back_the_last_thing_they_did - Let the player take back the last thing they did
> From version: 0.2.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 85%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-30 18:05:09
> Owner: Codex

# AI Context
- Summary: Orchestration for req_019: bounded snapshot history in `src/sim` first, then gesture boundaries and stale-id clearing, then the controls. Take snapshots and measure; only a bad measurement justifies an operation log, and that conclusion is a finding rather than licence to grow the chain.
- Keywords: let, player, take, back, last, thing, they, did
- Use when: Implementing any of the three backlog slices under req_019, in the plan's order.
- Skip when: The change adds a browsable history, undoes view state, or persists history across reloads.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Read this request and its three backlog slices, and `run_006_change_what_a_save_contains_without_losing_the_player_s_city` before touching serialize or restore.
- [ ] 2. Take the snapshot approach first and measure it. Only if the measurement is bad does the operation log become worth its cost -- and that conclusion is a finding, not a licence to grow this chain.
- [ ] 3. Build the bounded history in `src/sim` on top of `serializeCity` and `restoreCity`, unit-tested with no scene.
- [ ] 4. Then wire it to the tools, deciding gesture boundaries explicitly and clearing every holder of a node or segment id -- `replayCity` renumbers, so a stale id is guaranteed, not hypothetical.
- [ ] 5. Then the toolbar controls and the keyboard shortcuts, inert while a text field has focus.
- [ ] 6. Measure the memory the history costs at its bound on a Demo-sized city, and record it in the closeout.
- [ ] 7. Extend the browser interaction suite, then run the fast gate and the visual check.
- [ ] 8. ADR 009 checkpoint: update affected Logics docs and leave the repo commit-ready. If snapshots were kept, the ceiling belongs in a `ponytail:` comment naming the upgrade path.
- [ ] 9. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_063_snapshot_the_city_s_model_into_a_bounded_history`
- `item_064_make_one_gesture_one_step_and_leave_nothing_pointing_at_what_is_gone`
- `item_065_put_undo_and_redo_where_the_player_will_reach_for_them`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_063_snapshot_the_city_s_model_into_a_bounded_history`. Proof deferred to slice closeout.
- request-AC5 -> `item_063_snapshot_the_city_s_model_into_a_bounded_history`. Proof deferred to slice closeout.
- request-AC7 -> `item_063_snapshot_the_city_s_model_into_a_bounded_history`. Proof deferred to slice closeout.
- request-AC2 -> `item_064_make_one_gesture_one_step_and_leave_nothing_pointing_at_what_is_gone`. Proof deferred to slice closeout.
- request-AC3 -> `item_064_make_one_gesture_one_step_and_leave_nothing_pointing_at_what_is_gone`. Proof deferred to slice closeout.
- request-AC4 -> `item_064_make_one_gesture_one_step_and_leave_nothing_pointing_at_what_is_gone`. Proof deferred to slice closeout.
- request-AC6 -> `item_064_make_one_gesture_one_step_and_leave_nothing_pointing_at_what_is_gone`. Proof deferred to slice closeout.
- request-AC1 -> `item_065_put_undo_and_redo_where_the_player_will_reach_for_them`. Proof deferred to slice closeout.
- request-AC8 -> `item_065_put_undo_and_redo_where_the_player_will_reach_for_them`. Proof deferred to slice closeout.
- request-AC9 -> `item_065_put_undo_and_redo_where_the_player_will_reach_for_them`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_019_let_the_player_take_back_the_last_thing_they_did`
- Product brief(s): `prod_016_a_city_you_can_change_your_mind_about`
- Architecture decision(s): (none yet)
